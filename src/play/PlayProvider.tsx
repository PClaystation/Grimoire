import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'

import {
  type ClientGameAction,
  type DeckSelectionSnapshot,
  normalizePlayerName,
  normalizeRoomCode,
  type ClientMessage,
  type ServerMessage,
} from '@/shared/play'
import { PlayContext, type PlayContextValue, type PlayState } from '@/play/playContext'
import {
  readPlayPlayerName,
  readPlaySessionId,
  writePlayPlayerName,
  writePlaySessionId,
} from '@/play/playStorage'

function buildSocketUrl() {
  const fallbackSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }

  const configuredServerUrl = import.meta.env.VITE_PLAY_SERVER_URL?.trim()

  if (!configuredServerUrl) {
    return fallbackSocketUrl()
  }

  try {
    const normalizedUrl = new URL(configuredServerUrl, window.location.href)

    if (normalizedUrl.protocol === 'http:') {
      normalizedUrl.protocol = 'ws:'
    } else if (normalizedUrl.protocol === 'https:') {
      normalizedUrl.protocol = 'wss:'
    }

    if (!normalizedUrl.pathname || normalizedUrl.pathname === '/') {
      normalizedUrl.pathname = '/ws'
    }

    return normalizedUrl.toString()
  } catch {
    return fallbackSocketUrl()
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseServerMessage(value: string): ServerMessage | null {
  try {
    const parsed = JSON.parse(value) as unknown

    if (!isRecord(parsed) || typeof parsed.type !== 'string') {
      return null
    }

    return parsed as ServerMessage
  } catch {
    return null
  }
}

function getSocketCloseMessage(event: CloseEvent) {
  if (event.code === 4001) {
    return 'Another Grimoire tab or window is already using this play session.'
  }

  if (event.code === 1006) {
    return 'The play server connection dropped unexpectedly.'
  }

  return 'Unable to reach the play server right now.'
}

export function PlayProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PlayState>(() => {
    const storedPlayerName = readPlayPlayerName()

    return {
      sessionId: readPlaySessionId(),
      playerName: storedPlayerName ? normalizePlayerName(storedPlayerName) : 'Planeswalker',
      connectionStatus: 'connecting',
      room: null,
      game: null,
      error: null,
    }
  })

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const shouldReconnectRef = useRef(true)
  const sessionIdRef = useRef(state.sessionId)
  const playerNameRef = useRef(state.playerName)

  useEffect(() => {
    sessionIdRef.current = state.sessionId
  }, [state.sessionId])

  useEffect(() => {
    playerNameRef.current = state.playerName
  }, [state.playerName])

  const handleServerMessage = useEffectEvent((message: ServerMessage) => {
    startTransition(() => {
      setState((currentState) => {
        switch (message.type) {
          case 'session_ready': {
            if (typeof message.sessionId !== 'string' || typeof message.playerName !== 'string') {
              return currentState
            }

            writePlaySessionId(message.sessionId)
            writePlayPlayerName(message.playerName)
            sessionIdRef.current = message.sessionId
            playerNameRef.current = message.playerName
            const activeRoomId = typeof message.roomId === 'string' ? message.roomId : null
            const activeGameId = typeof message.gameId === 'string' ? message.gameId : null

            return {
              ...currentState,
              sessionId: message.sessionId,
              playerName: message.playerName,
              room:
                activeRoomId && currentState.room?.roomId === activeRoomId
                  ? currentState.room
                  : null,
              game:
                activeGameId && currentState.game?.gameId === activeGameId
                  ? currentState.game
                  : null,
              error: null,
            }
          }

          case 'room_snapshot':
            if (!(message.room && typeof message.room.roomId === 'string')) {
              return currentState
            }

            return {
              ...currentState,
              room: message.room,
              error: null,
            }

          case 'game_snapshot':
            if (!(message.game && typeof message.game.gameId === 'string')) {
              return currentState
            }

            return {
              ...currentState,
              game: message.game,
              error: null,
            }

          case 'room_left':
            if (typeof message.roomId !== 'string') {
              return currentState
            }

            return {
              ...currentState,
              room:
                currentState.room?.roomId === message.roomId ? null : currentState.room,
              game:
                currentState.game?.roomId === message.roomId ? null : currentState.game,
              error: null,
            }

          case 'error':
            if (typeof message.message !== 'string') {
              return currentState
            }

            return {
              ...currentState,
              error: message.message,
            }
        }
      })
    })
  })

  useEffect(() => {
    function sendHelloMessage() {
      const socket = socketRef.current

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return
      }

      const message: ClientMessage = {
        type: 'hello',
        sessionId: sessionIdRef.current,
        playerName: playerNameRef.current,
      }

      socket.send(JSON.stringify(message))
    }

    function connectSocket() {
      if (socketRef.current) {
        return
      }

      const socket = new WebSocket(buildSocketUrl())
      socketRef.current = socket

      setState((currentState) => ({
        ...currentState,
        connectionStatus: 'connecting',
      }))

      socket.addEventListener('open', () => {
        setState((currentState) => ({
          ...currentState,
          connectionStatus: 'connected',
        }))

        sendHelloMessage()
      })

      socket.addEventListener('message', (event) => {
        if (typeof event.data !== 'string') {
          return
        }

        const message = parseServerMessage(event.data)

        if (!message) {
          return
        }

        handleServerMessage(message)
      })

      socket.addEventListener('close', (event) => {
        socketRef.current = null

        setState((currentState) => ({
          ...currentState,
          connectionStatus: 'disconnected',
          error: currentState.error ?? getSocketCloseMessage(event),
        }))

        if (!shouldReconnectRef.current || event.code === 4001) {
          return
        }

        if (reconnectTimerRef.current !== null) {
          window.clearTimeout(reconnectTimerRef.current)
        }

        reconnectTimerRef.current = window.setTimeout(() => {
          connectSocket()
        }, 1500)
      })

      socket.addEventListener('error', () => {
        setState((currentState) => ({
          ...currentState,
          error: currentState.error ?? 'Unable to reach the play server right now.',
        }))
      })
    }

    connectSocket()

    return () => {
      shouldReconnectRef.current = false

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
      }

      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  function sendMessage(message: Exclude<ClientMessage, { type: 'hello' }>) {
    const socket = socketRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setState((currentState) => ({
        ...currentState,
        error: 'The play server is still connecting. Try again in a moment.',
      }))
      return
    }

    socket.send(JSON.stringify(message))
  }

  function setPlayerName(playerName: string) {
    const normalizedName = normalizePlayerName(playerName)
    writePlayPlayerName(normalizedName)
    playerNameRef.current = normalizedName

    setState((currentState) => ({
      ...currentState,
      playerName: normalizedName,
    }))

    const socket = socketRef.current

    if (socket && socket.readyState === WebSocket.OPEN) {
      const message: ClientMessage = {
        type: 'hello',
        sessionId: sessionIdRef.current,
        playerName: normalizedName,
      }

      socket.send(JSON.stringify(message))
    }
  }

  const contextValue: PlayContextValue = {
    ...state,
    clearError() {
      setState((currentState) => ({
        ...currentState,
        error: null,
      }))
    },
    setPlayerName,
    createRoom() {
      sendMessage({ type: 'create_room' })
    },
    joinRoom(roomId: string) {
      sendMessage({
        type: 'join_room',
        roomId: normalizeRoomCode(roomId),
      })
    },
    leaveRoom(roomId: string) {
      sendMessage({
        type: 'leave_room',
        roomId: normalizeRoomCode(roomId),
      })
    },
    selectDeck(roomId: string, deck: DeckSelectionSnapshot) {
      sendMessage({
        type: 'select_deck',
        roomId: normalizeRoomCode(roomId),
        deck,
      })
    },
    startGame(roomId: string) {
      sendMessage({
        type: 'start_game',
        roomId: normalizeRoomCode(roomId),
      })
    },
    sendGameAction(gameId: string, action: ClientGameAction) {
      sendMessage({
        type: 'game_action',
        gameId,
        action,
      })
    },
  }

  return <PlayContext.Provider value={contextValue}>{children}</PlayContext.Provider>
}
