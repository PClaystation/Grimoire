import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, relative, resolve, sep } from 'node:path'
import { createServer } from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'

import { normalizePlayerName, type ServerMessage } from '../src/shared/play.js'
import { parseClientMessage } from './clientMessageValidation.js'
import { PlayServer } from './playServer.js'

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '0.0.0.0'
const DIST_DIR = resolve(process.cwd(), 'dist')
const MAX_CLIENT_MESSAGE_BYTES = 256 * 1024
const SOCKET_HEARTBEAT_INTERVAL_MS = 25_000

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

function buildBaseHeaders() {
  return {
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  }
}

function sendJson(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState !== WebSocket.OPEN) {
    return
  }

  socket.send(JSON.stringify(message))
}

function sendFile(response: import('node:http').ServerResponse, filePath: string) {
  const fileExtension = extname(filePath)
  const isHtml = fileExtension === '.html'
  const relativePath = relative(DIST_DIR, filePath)
  const cacheControl = isHtml
    ? 'no-cache'
    : relativePath.startsWith(`assets${sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600'

  response.writeHead(200, {
    ...buildBaseHeaders(),
    'Cache-Control': cacheControl,
    'Content-Type': MIME_TYPES[fileExtension] ?? 'application/octet-stream',
  })
  createReadStream(filePath).pipe(response)
}

function resolvePublicFile(pathname: string) {
  const sanitizedPath = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '')
  const nextPath = sanitizedPath === '/' ? '/index.html' : sanitizedPath
  return join(DIST_DIR, nextPath)
}

function handleHttpRequest(
  request: import('node:http').IncomingMessage,
  response: import('node:http').ServerResponse,
) {
  const url = new URL(request.url ?? '/', 'http://localhost')

  if (url.pathname === '/health') {
    response.writeHead(200, {
      ...buildBaseHeaders(),
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    })
    response.end(JSON.stringify({ ok: true }))
    return
  }

  if (!existsSync(DIST_DIR)) {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      response.writeHead(200, {
        ...buildBaseHeaders(),
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      })
      response.end('Grimoire multiplayer backend is running. Frontend is hosted separately.\n')
      return
    }

    response.writeHead(404, {
      ...buildBaseHeaders(),
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    })
    response.end('Frontend assets are not installed on this server.\n')
    return
  }

  const requestedFile = resolvePublicFile(url.pathname)

  if (existsSync(requestedFile) && statSync(requestedFile).isFile()) {
    sendFile(response, requestedFile)
    return
  }

  sendFile(response, join(DIST_DIR, 'index.html'))
}

const connections = new Map<string, WebSocket>()
const playServer = new PlayServer({
  sendToSession(sessionId, message) {
    const socket = connections.get(sessionId)

    if (!socket) {
      return
    }

    sendJson(socket, message)
  },
})

interface TrackedWebSocket extends WebSocket {
  isAlive: boolean
}

const httpServer = createServer(handleHttpRequest)
const webSocketServer = new WebSocketServer({
  server: httpServer,
  path: '/ws',
  maxPayload: MAX_CLIENT_MESSAGE_BYTES,
})

const socketHeartbeatInterval = setInterval(() => {
  for (const client of webSocketServer.clients) {
    const socket = client as TrackedWebSocket

    if (socket.readyState !== WebSocket.OPEN) {
      continue
    }

    if (!socket.isAlive) {
      socket.terminate()
      continue
    }

    socket.isAlive = false
    socket.ping()
  }
}, SOCKET_HEARTBEAT_INTERVAL_MS)

webSocketServer.on('close', () => {
  clearInterval(socketHeartbeatInterval)
})

webSocketServer.on('connection', (rawSocket) => {
  const socket = rawSocket as TrackedWebSocket
  let attachedSessionId: string | null = null
  socket.isAlive = true

  socket.on('pong', () => {
    socket.isAlive = true
  })

  socket.on('error', () => {
    // `ws` emits `error` separately from `close`; keep the process alive and
    // let the normal close/disconnect path clean up the session mapping.
  })

  socket.on('message', (rawData) => {
    const message = parseClientMessage(rawData.toString())

    if (!message) {
      sendJson(socket, {
        type: 'error',
        message: 'Unable to parse that message.',
      })
      return
    }

    if (message.type === 'hello') {
      const normalizedSessionId = message.sessionId.trim() || crypto.randomUUID()
      const normalizedPlayerName = normalizePlayerName(message.playerName)
      const existingSocket = connections.get(normalizedSessionId)

      if (existingSocket && existingSocket !== socket) {
        existingSocket.close(4001, 'Replaced by a newer connection.')
      }

      attachedSessionId = normalizedSessionId
      connections.set(normalizedSessionId, socket)
      playServer.handleHello(normalizedSessionId, normalizedPlayerName)
      return
    }

    if (!attachedSessionId) {
      sendJson(socket, {
        type: 'error',
        message: 'Identify yourself before sending room or game actions.',
      })
      return
    }

    playServer.handleMessage(attachedSessionId, message)
  })

  socket.on('close', () => {
    if (!attachedSessionId) {
      return
    }

    const currentSocket = connections.get(attachedSessionId)

    if (currentSocket === socket) {
      connections.delete(attachedSessionId)
      playServer.handleDisconnect(attachedSessionId)
    }
  })
})

httpServer.listen(PORT, HOST, () => {
  process.stdout.write(`Grimoire play server listening on http://${HOST}:${PORT}\n`)
})
