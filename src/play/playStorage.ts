const PLAY_SESSION_KEY = 'grimoire.play.session-id.v1'
const PLAY_NAME_KEY = 'grimoire.play.player-name.v1'
let memorySessionId: string | null = null
let memoryPlayerName = ''

function readStorageValue(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorageValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Continue with the in-memory fallback when browser storage is blocked.
  }
}

export function readPlaySessionId() {
  const storedValue = readStorageValue(PLAY_SESSION_KEY)

  if (storedValue && storedValue.trim()) {
    const normalizedValue = storedValue.trim()
    memorySessionId = normalizedValue
    return normalizedValue
  }

  if (memorySessionId) {
    return memorySessionId
  }

  const nextValue = crypto.randomUUID()
  memorySessionId = nextValue
  writeStorageValue(PLAY_SESSION_KEY, nextValue)
  return nextValue
}

export function writePlaySessionId(sessionId: string) {
  memorySessionId = sessionId
  writeStorageValue(PLAY_SESSION_KEY, sessionId)
}

export function readPlayPlayerName() {
  const storedValue = readStorageValue(PLAY_NAME_KEY)?.trim() ?? ''

  if (storedValue) {
    memoryPlayerName = storedValue
    return storedValue
  }

  return memoryPlayerName
}

export function writePlayPlayerName(playerName: string) {
  memoryPlayerName = playerName
  writeStorageValue(PLAY_NAME_KEY, playerName)
}
