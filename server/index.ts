import { createReadStream, existsSync, statSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { extname, join, normalize, relative, resolve, sep } from 'node:path'
import { createServer } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { WebSocket, WebSocketServer } from 'ws'

import { normalizePlayerName, type ServerMessage } from '../src/shared/play.js'
import { parseClientMessage } from './clientMessageValidation.js'
import { resolveDeckSiteImport } from './deckSiteImport.js'
import { PlayServer } from './playServer.js'

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '0.0.0.0'
const DIST_DIR = resolve(process.cwd(), 'dist')
const MAX_CLIENT_MESSAGE_BYTES = 256 * 1024
const SOCKET_HEARTBEAT_INTERVAL_MS = 25_000
const AUTH_BACKEND_ORIGIN = process.env.AUTH_BACKEND_ORIGIN ?? 'http://127.0.0.1:5000'
const PROXY_REQUEST_TIMEOUT_MS = Number(process.env.PROXY_REQUEST_TIMEOUT_MS ?? 12_000)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000)
const IMPORT_RATE_LIMIT_MAX_REQUESTS = Number(process.env.IMPORT_RATE_LIMIT_MAX_REQUESTS ?? 20)
const API_RATE_LIMIT_MAX_REQUESTS = Number(process.env.API_RATE_LIMIT_MAX_REQUESTS ?? 120)

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
}

const rateLimitBuckets = new Map<string, { windowStartedAt: number; count: number }>()

function buildBaseHeaders() {
  return {
    'Content-Security-Policy':
      "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' http: https: ws: wss:; font-src 'self' data:;",
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  }
}

function getClientIp(request: import('node:http').IncomingMessage) {
  const forwardedFor = request.headers['x-forwarded-for']
  const headerValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  const forwardedIp = headerValue?.split(',')[0]?.trim()

  if (forwardedIp) {
    return forwardedIp
  }

  return request.socket.remoteAddress ?? 'unknown'
}

function getForwardedProto(request: import('node:http').IncomingMessage) {
  const forwardedProto = request.headers['x-forwarded-proto']
  const headerValue = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto
  const normalizedHeader = headerValue?.split(',')[0]?.trim()

  if (normalizedHeader === 'https' || normalizedHeader === 'http') {
    return normalizedHeader
  }

  return 'encrypted' in request.socket && request.socket.encrypted ? 'https' : 'http'
}

function appendForwardedFor(request: import('node:http').IncomingMessage) {
  const clientIp = getClientIp(request)
  const existingForwardedFor = request.headers['x-forwarded-for']
  const existingValue = Array.isArray(existingForwardedFor)
    ? existingForwardedFor.join(', ')
    : existingForwardedFor

  return existingValue ? `${existingValue}, ${clientIp}` : clientIp
}

function writeJson(
  response: import('node:http').ServerResponse,
  statusCode: number,
  payload: unknown,
  headers: Record<string, string> = {},
) {
  response.writeHead(statusCode, {
    ...buildBaseHeaders(),
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  })
  response.end(JSON.stringify(payload))
}

function isRateLimited(
  scope: 'api' | 'imports',
  request: import('node:http').IncomingMessage,
  response: import('node:http').ServerResponse,
) {
  const maxRequests =
    scope === 'imports' ? IMPORT_RATE_LIMIT_MAX_REQUESTS : API_RATE_LIMIT_MAX_REQUESTS
  const now = Date.now()
  const key = `${scope}:${getClientIp(request)}`
  const currentBucket = rateLimitBuckets.get(key)

  if (!currentBucket || now - currentBucket.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, {
      windowStartedAt: now,
      count: 1,
    })
    return false
  }

  currentBucket.count += 1

  if (currentBucket.count <= maxRequests) {
    return false
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((RATE_LIMIT_WINDOW_MS - (now - currentBucket.windowStartedAt)) / 1000),
  )

  writeJson(
    response,
    429,
    { message: 'Too many requests. Please slow down and try again.' },
    { 'Retry-After': String(retryAfterSeconds) },
  )
  return true
}

function logRequest(
  request: import('node:http').IncomingMessage,
  response: import('node:http').ServerResponse,
  url: URL,
  startedAt: number,
) {
  const durationMs = Date.now() - startedAt
  const logEvent = {
    type: 'http_request',
    method: request.method ?? 'GET',
    path: url.pathname,
    statusCode: response.statusCode,
    durationMs,
    clientIp: getClientIp(request),
    forwardedProto: getForwardedProto(request),
  }

  process.stdout.write(`${JSON.stringify(logEvent)}\n`)
}

function buildCorsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
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

function shouldProxyApiRequest(pathname: string) {
  return pathname.startsWith('/api/auth') || pathname.startsWith('/api/grimoire')
}

async function handleDeckImportRequest(
  request: import('node:http').IncomingMessage,
  response: import('node:http').ServerResponse,
  url: URL,
) {
  const requestOrigin = request.headers.origin ?? '*'

  if (request.method !== 'OPTIONS' && isRateLimited('imports', request, response)) {
    return
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      ...buildBaseHeaders(),
      ...buildCorsHeaders(requestOrigin),
      'Cache-Control': 'no-store',
    })
    response.end()
    return
  }

  if (request.method !== 'GET') {
    writeJson(response, 405, { message: 'Method not allowed.' }, buildCorsHeaders(requestOrigin))
    return
  }

  const sourceUrl = url.searchParams.get('url')?.trim() ?? ''

  if (!sourceUrl) {
    writeJson(response, 400, { message: 'Missing deck URL.' }, buildCorsHeaders(requestOrigin))
    return
  }

  try {
    const result = await resolveDeckSiteImport(sourceUrl)

    writeJson(response, 200, result, buildCorsHeaders(requestOrigin))
  } catch (error) {
    writeJson(
      response,
      422,
      {
        message:
          error instanceof Error ? error.message : 'Unable to import that deck URL right now.',
      },
      buildCorsHeaders(requestOrigin),
    )
  }
}

function proxyApiRequest(
  request: import('node:http').IncomingMessage,
  response: import('node:http').ServerResponse,
  url: URL,
) {
  if (isRateLimited('api', request, response)) {
    return
  }

  let upstream: URL

  try {
    upstream = new URL(url.pathname + url.search, AUTH_BACKEND_ORIGIN)
  } catch {
    writeJson(response, 502, { message: 'Auth backend origin is invalid.' })
    return
  }

  const requestUpstream = upstream.protocol === 'https:' ? httpsRequest : httpRequest
  const forwardedHeaders: Record<string, string | string[]> = {}

  for (const [headerName, headerValue] of Object.entries(request.headers)) {
    if (headerValue === undefined) {
      continue
    }

    forwardedHeaders[headerName] = headerValue
  }

  forwardedHeaders.host = upstream.host
  forwardedHeaders['x-forwarded-host'] = request.headers.host ?? ''
  forwardedHeaders['x-forwarded-proto'] = getForwardedProto(request)
  forwardedHeaders['x-forwarded-for'] = appendForwardedFor(request)

  const proxyRequest = requestUpstream(
    upstream,
    {
      method: request.method,
      headers: forwardedHeaders,
    },
    (proxyResponse) => {
      response.writeHead(proxyResponse.statusCode ?? 502, {
        ...buildBaseHeaders(),
        ...proxyResponse.headers,
      })
      proxyResponse.pipe(response)
    },
  )

  proxyRequest.setTimeout(PROXY_REQUEST_TIMEOUT_MS, () => {
    proxyRequest.destroy(new Error('Upstream auth request timed out.'))
  })

  proxyRequest.on('error', () => {
    if (response.headersSent) {
      response.end()
      return
    }

    writeJson(response, 502, { message: 'Unable to reach the auth backend.' })
  })

  request.pipe(proxyRequest)
}

function handleHttpRequest(
  request: import('node:http').IncomingMessage,
  response: import('node:http').ServerResponse,
) {
  const url = new URL(request.url ?? '/', 'http://localhost')
  const startedAt = Date.now()

  response.on('finish', () => {
    logRequest(request, response, url, startedAt)
  })

  if (url.pathname === '/imports/deck-source') {
    void handleDeckImportRequest(request, response, url)
    return
  }

  if (shouldProxyApiRequest(url.pathname)) {
    proxyApiRequest(request, response, url)
    return
  }

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
