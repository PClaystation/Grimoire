import { useEffect, useState } from 'react'
import { DoorOpen } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { PlayFrame } from '@/play/components/PlayFrame'
import { PublicRoomDirectory } from '@/play/components/PublicRoomDirectory'
import { usePlay } from '@/play/usePlay'
import { PLAYER_NAME_MAX_LENGTH, ROOM_CODE_LENGTH, normalizeRoomCode } from '@/shared/play'

export function PlayJoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    connectionStatus,
    playerName,
    room,
    roomDirectory,
    game,
    error,
    clearError,
    setPlayerName,
    joinRoom,
  } = usePlay()
  const [nameInput, setNameInput] = useState(playerName)
  const [roomCodeInput, setRoomCodeInput] = useState(() =>
    normalizeRoomCode(searchParams.get('room') ?? ''),
  )

  useEffect(() => {
    if (game) {
      navigate(`/play/game/${game.gameId}`, { replace: true })
      return
    }

    if (room) {
      navigate(`/play/room/${room.roomId}`, { replace: true })
    }
  }, [game, navigate, room])

  return (
    <PlayFrame
      eyebrow="Join Room"
      title="Join a room by code or browse public tables."
      description="Use a direct room code, or scan the public directory and jump into the lobby you want."
      connectionStatus={connectionStatus}
      error={error}
      onDismissError={clearError}
    >
      <div className="grid gap-6">
        <section className="mx-auto w-full max-w-4xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5 sm:p-7">
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              setPlayerName(nameInput)
              joinRoom(roomCodeInput)
            }}
          >
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink-100">Display name</span>
              <input
                type="text"
                name="display-name"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="Planeswalker"
                autoComplete="nickname"
                maxLength={PLAYER_NAME_MAX_LENGTH}
                className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-ink-50 outline-none transition focus:border-tide-400/40 focus:bg-white/[0.07]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink-100">Room code</span>
              <input
                type="text"
                name="room-code"
                value={roomCodeInput}
                onChange={(event) => setRoomCodeInput(normalizeRoomCode(event.target.value))}
                placeholder="ABC123"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                maxLength={ROOM_CODE_LENGTH}
                className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base uppercase tracking-[0.18em] text-ink-50 outline-none transition focus:border-ember-400/40 focus:bg-white/[0.07]"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!roomCodeInput || connectionStatus === 'disconnected'}
                className="inline-flex items-center gap-2 rounded-2xl bg-ember-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ember-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <DoorOpen className="h-4 w-4" />
                Join room
              </button>
              <Link
                to="/play"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-ink-100 transition hover:bg-white/10"
              >
                Back
              </Link>
            </div>
          </form>
        </section>

        <PublicRoomDirectory
          rooms={roomDirectory}
          connectionStatus={connectionStatus}
          activeRoomId={room?.roomId ?? null}
          title="Browse the live public lobby list."
          description="Search by code, host, tags, format, or vibe, then join immediately or copy a code into the join form above."
          emptyTitle="No public rooms are live right now."
          emptyDescription="Create a public room from the play page if you want it to show up here for everyone else."
          joinButtonLabel="Join from directory"
          onJoinRoom={(nextRoomId) => {
            setPlayerName(nameInput)
            joinRoom(nextRoomId)
          }}
          onUseCode={(nextRoomId) => {
            setRoomCodeInput(nextRoomId)
          }}
        />
      </div>
    </PlayFrame>
  )
}
