import { useEffect, useRef, useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PlayFrame } from '@/play/components/PlayFrame'
import { RoomSettingsForm } from '@/play/components/RoomSettingsForm'
import {
  createRoomSettingsDraft,
  draftToRoomSettingsInput,
} from '@/play/roomSettings'
import { usePlay } from '@/play/usePlay'
import { buildDefaultRoomName, PLAYER_NAME_MAX_LENGTH } from '@/shared/play'

export function PlayCreatePage() {
  const navigate = useNavigate()
  const {
    connectionStatus,
    playerName,
    room,
    game,
    error,
    clearError,
    setPlayerName,
    createRoom,
  } = usePlay()
  const [nameInput, setNameInput] = useState(playerName)
  const [roomSettingsDraft, setRoomSettingsDraft] = useState(() =>
    createRoomSettingsDraft(null, playerName),
  )
  const suggestedRoomNameRef = useRef(buildDefaultRoomName(playerName))

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
    const nextDefaultName = buildDefaultRoomName(nameInput)

    setRoomSettingsDraft((currentDraft) =>
      currentDraft.name === suggestedRoomNameRef.current
        ? {
            ...currentDraft,
            name: nextDefaultName,
          }
        : currentDraft,
    )
    suggestedRoomNameRef.current = nextDefaultName
  }, [nameInput])

  return (
    <PlayFrame
      eyebrow="Create Room"
      title="Open a tabletop room with real lobby settings."
      description="Set your display name, choose whether the room is public or private, and tune the table before anyone joins."
      connectionStatus={connectionStatus}
      error={error}
      onDismissError={clearError}
    >
      <section className="mx-auto w-full max-w-4xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5 sm:p-7">
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            setPlayerName(nameInput)
            createRoom(draftToRoomSettingsInput(roomSettingsDraft))
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

          <RoomSettingsForm draft={roomSettingsDraft} onChange={setRoomSettingsDraft} />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={connectionStatus === 'disconnected'}
              className="inline-flex items-center gap-2 rounded-2xl bg-tide-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-tide-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircle className="h-4 w-4" />
              Create {roomSettingsDraft.visibility} room
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
