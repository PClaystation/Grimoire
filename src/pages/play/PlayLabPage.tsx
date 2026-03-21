import { useEffect, useRef, useState } from 'react'
import { FlaskConical, LockKeyhole } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PlayFrame } from '@/play/components/PlayFrame'
import { usePlay } from '@/play/usePlay'

export function PlayLabPage() {
  const navigate = useNavigate()
  const { connectionStatus, room, game, error, clearError, debugUnlocked, unlockDebugMode, createDebugRoom } =
    usePlay()
  const [password, setPassword] = useState('')
  const hasOpenedRoomRef = useRef(false)

  useEffect(() => {
    if (game) {
      navigate(`/play/game/${game.gameId}`, { replace: true })
      return
    }

    if (room) {
      navigate(`/play/room/${room.roomId}`, { replace: true })
    }
  }, [game, navigate, room])

  useEffect(() => {
    if (!debugUnlocked || room || game || hasOpenedRoomRef.current) {
      return
    }

    hasOpenedRoomRef.current = true
    createDebugRoom({
      name: 'Debug Lab',
      description: 'Hidden sandbox for board layout checks.',
      visibility: 'private',
      minPlayers: 1,
      maxPlayers: 6,
      format: 'any',
      powerLevel: 'casual',
      tags: ['debug', 'sandbox'],
    })
  }, [createDebugRoom, debugUnlocked, game, room])

  return (
    <PlayFrame
      eyebrow="Hidden Lab"
      title="Unlock the private table sandbox."
      description="This page is not linked from the normal play flow. Enter the lab password, and the server will open a hidden room for layout tests and placeholder seats."
      connectionStatus={connectionStatus}
      error={error}
      onDismissError={clearError}
    >
      <section className="mx-auto w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5 sm:p-7">
        {!debugUnlocked ? (
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              unlockDebugMode(password)
            }}
          >
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink-100">Lab password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter the lab password"
                autoComplete="current-password"
                className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-ink-50 outline-none transition focus:border-tide-400/40 focus:bg-white/[0.07]"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={connectionStatus === 'disconnected'}
                className="inline-flex items-center gap-2 rounded-2xl bg-tide-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-tide-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LockKeyhole className="h-4 w-4" />
                Unlock lab
              </button>
              <Link
                to="/play"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-ink-100 transition hover:bg-white/10"
              >
                Back
              </Link>
            </div>
          </form>
        ) : (
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-tide-400/20 bg-tide-500/10 p-5">
              <p className="text-sm font-semibold text-tide-100">Lab unlocked</p>
              <p className="mt-2 text-sm leading-7 text-ink-200">
                The sandbox room opens automatically. Use the lobby to add or remove placeholder
                seats, then start the game once the board looks right.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  createDebugRoom({
                    name: 'Debug Lab',
                    description: 'Hidden sandbox for board layout checks.',
                    visibility: 'private',
                    minPlayers: 1,
                    maxPlayers: 6,
                    format: 'any',
                    powerLevel: 'casual',
                    tags: ['debug', 'sandbox'],
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-ember-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ember-400"
              >
                <FlaskConical className="h-4 w-4" />
                Open sandbox now
              </button>
              <Link
                to="/play"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-ink-100 transition hover:bg-white/10"
              >
                Back
              </Link>
            </div>
          </div>
        )}
      </section>
    </PlayFrame>
  )
}
