import assert from 'node:assert/strict'
import test from 'node:test'

import { PlayServer } from '../server/playServer.ts'
import type {
  RoomSnapshot,
  ServerMessage,
} from '../src/shared/play.ts'

function createHarness() {
  const sentMessages = new Map<string, ServerMessage[]>()
  const scheduledTimeouts = new Map<number, { callback: () => void; delayMs: number }>()
  let nextTimeoutId = 1

  return {
    clearMessages() {
      sentMessages.clear()
    },
    clearTimeout(timeoutId: ReturnType<typeof globalThis.setTimeout>) {
      scheduledTimeouts.delete(Number(timeoutId))
    },
    roomSnapshotCount(sessionId: string) {
      return (
        sentMessages
          .get(sessionId)
          ?.filter((message) => message.type === 'room_snapshot').length ?? 0
      )
    },
    latestRoomSnapshot(sessionId: string) {
      const roomMessages =
        sentMessages
          .get(sessionId)
          ?.filter((message): message is Extract<ServerMessage, { type: 'room_snapshot' }> => {
            return message.type === 'room_snapshot'
          }) ?? []

      const latestMessage = roomMessages.at(-1)
      assert.ok(latestMessage, `Expected a room snapshot for ${sessionId}.`)
      return latestMessage.room
    },
    pendingTimeoutCount() {
      return scheduledTimeouts.size
    },
    runNextTimeout() {
      const nextEntry = scheduledTimeouts.entries().next().value
      assert.ok(nextEntry, 'Expected a scheduled timeout.')
      const [timeoutId, scheduledTimeout] = nextEntry
      scheduledTimeouts.delete(timeoutId)
      scheduledTimeout.callback()
      return scheduledTimeout.delayMs
    },
    sendToSession(sessionId: string, message: ServerMessage) {
      const existingMessages = sentMessages.get(sessionId) ?? []
      existingMessages.push(message)
      sentMessages.set(sessionId, existingMessages)
    },
    setTimeout(callback: () => void, delayMs: number) {
      const timeoutId = nextTimeoutId
      nextTimeoutId += 1
      scheduledTimeouts.set(timeoutId, { callback, delayMs })
      return timeoutId as ReturnType<typeof globalThis.setTimeout>
    },
  }
}

function findPlayer(room: RoomSnapshot, playerName: string) {
  const player = room.players.find((entry) => entry.name === playerName)
  assert.ok(player, `Expected ${playerName} to exist in the room snapshot.`)
  return player
}

test('PlayServer keeps a player connected when they reconnect before the grace timeout', () => {
  const harness = createHarness()
  const playServer = new PlayServer({
    sendToSession: harness.sendToSession,
    disconnectGracePeriodMs: 5_000,
    setTimeout: harness.setTimeout,
    clearTimeout: harness.clearTimeout,
  })

  playServer.handleHello('session-alice', 'Alice')
  playServer.handleMessage('session-alice', { type: 'create_room' })
  const roomId = harness.latestRoomSnapshot('session-alice').roomId

  playServer.handleHello('session-bob', 'Bob')
  playServer.handleMessage('session-bob', { type: 'join_room', roomId })

  harness.clearMessages()

  playServer.handleDisconnect('session-bob')

  assert.equal(harness.pendingTimeoutCount(), 1)
  assert.equal(harness.roomSnapshotCount('session-alice'), 0)
  playServer.handleHello('session-bob', 'Bob')

  assert.equal(harness.pendingTimeoutCount(), 0)
  assert.equal(findPlayer(harness.latestRoomSnapshot('session-alice'), 'Bob').isConnected, true)
})

test('PlayServer marks a player disconnected after the grace timeout expires', () => {
  const harness = createHarness()
  const playServer = new PlayServer({
    sendToSession: harness.sendToSession,
    disconnectGracePeriodMs: 5_000,
    setTimeout: harness.setTimeout,
    clearTimeout: harness.clearTimeout,
  })

  playServer.handleHello('session-alice', 'Alice')
  playServer.handleMessage('session-alice', { type: 'create_room' })
  const roomId = harness.latestRoomSnapshot('session-alice').roomId

  playServer.handleHello('session-bob', 'Bob')
  playServer.handleMessage('session-bob', { type: 'join_room', roomId })

  harness.clearMessages()

  playServer.handleDisconnect('session-bob')

  assert.equal(harness.pendingTimeoutCount(), 1)
  assert.equal(harness.runNextTimeout(), 5_000)
  assert.equal(findPlayer(harness.latestRoomSnapshot('session-alice'), 'Bob').isConnected, false)
})
