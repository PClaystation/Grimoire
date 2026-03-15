import { useEffect, useState } from 'react'
import { DoorOpen } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PlayFrame } from '@/play/components/PlayFrame'
import { usePlay } from '@/play/usePlay'
import { normalizeRoomCode } from '@/shared/play'

export function PlayJoinPage() {
  const navigate = useNavigate()
  const {
    connectionStatus,
    playerName,
    room,
    game,
    error,
    clearError,
    setPlayerName,
    joinRoom,
  } = usePlay()
  const [nameInput, setNameInput] = useState(playerName)
  const [roomCodeInput, setRoomCodeInput] = useState('')

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
      title="Drop into an existing room from another device."
      description="Enter the room code from the host, pick a display name for this browser, and you’ll land in the shared lobby to choose one of your saved decks."
      connectionStatus={connectionStatus}
      error={error}
      onDismissError={clearError}
    >
      <section className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-ink-900/82 p-6 shadow-panel sm:p-7">
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
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Planeswalker"
              className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-base text-ink-50 outline-none transition focus:border-tide-400/40 focus:bg-white/7"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink-100">Room code</span>
            <input
              value={roomCodeInput}
              onChange={(event) => setRoomCodeInput(normalizeRoomCode(event.target.value))}
              placeholder="ABC123"
              className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-base uppercase tracking-[0.18em] text-ink-50 outline-none transition focus:border-ember-400/40 focus:bg-white/7"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-ember-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ember-400"
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
    </PlayFrame>
  )
}
