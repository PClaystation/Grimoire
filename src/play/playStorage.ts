const PLAY_SESSION_KEY = 'grimoire.play.session-id.v1'
const PLAY_NAME_KEY = 'grimoire.play.player-name.v1'

export function readPlaySessionId() {
  const storedValue = window.localStorage.getItem(PLAY_SESSION_KEY)

  if (storedValue && storedValue.trim()) {
    return storedValue.trim()
  }

  const nextValue = crypto.randomUUID()
  window.localStorage.setItem(PLAY_SESSION_KEY, nextValue)
  return nextValue
}

export function writePlaySessionId(sessionId: string) {
  window.localStorage.setItem(PLAY_SESSION_KEY, sessionId)
}

export function readPlayPlayerName() {
  return window.localStorage.getItem(PLAY_NAME_KEY)?.trim() ?? ''
}

export function writePlayPlayerName(playerName: string) {
  window.localStorage.setItem(PLAY_NAME_KEY, playerName)
}
