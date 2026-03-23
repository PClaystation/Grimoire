import { useEffect, useRef, useState } from 'react'
import { BookmarkPlus, PlusCircle, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PlayFrame } from '@/play/components/PlayFrame'
import { useRoomPresets } from '@/play/useRoomPresets'
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
  const [presetStatusMessage, setPresetStatusMessage] = useState<string | null>(null)
  const { presets, savePreset, deletePreset } = useRoomPresets()

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
      title="Open a tabletop room."
      description="Set your name, choose public or private, and tune the table before anyone joins."
      connectionStatus={connectionStatus}
      error={error}
      onDismissError={clearError}
    >
      <section className="mx-auto w-full max-w-4xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5 sm:p-7">
        <div className="mb-5 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                Room presets
              </p>
              <p className="mt-1 text-sm text-ink-300">
                Save recurring pod settings and reuse them in one click.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                savePreset(roomSettingsDraft.name || nameInput, draftToRoomSettingsInput(roomSettingsDraft))
                setPresetStatusMessage(`Saved preset "${roomSettingsDraft.name || nameInput}".`)
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-100 transition hover:border-white/20 hover:bg-ink-700"
            >
              <BookmarkPlus className="h-4 w-4" />
              Save current
            </button>
          </div>

          {presets.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-ink-900/45 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-50">{preset.name}</p>
                    <p className="mt-1 text-xs text-ink-400">
                      {preset.settings.visibility ?? 'private'} • {preset.settings.format ?? 'any'} •{' '}
                      {preset.settings.minPlayers ?? 2}-{preset.settings.maxPlayers ?? 6} players
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRoomSettingsDraft(createRoomSettingsDraft(preset.settings, nameInput))
                        suggestedRoomNameRef.current =
                          preset.settings.name ?? buildDefaultRoomName(nameInput)
                        setPresetStatusMessage(`Loaded preset "${preset.name}".`)
                      }}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-ink-100 transition hover:bg-white/[0.08]"
                    >
                      Use preset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deletePreset(preset.id)
                        setPresetStatusMessage(`Deleted preset "${preset.name}".`)
                      }}
                      className="rounded-full border border-rose-400/20 p-2 text-rose-300 transition hover:border-rose-400/35 hover:bg-rose-500/10 hover:text-rose-200"
                      aria-label={`Delete preset ${preset.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-400">
              No saved presets yet.
            </p>
          )}

          {presetStatusMessage ? (
            <p className="mt-4 text-sm text-tide-100">{presetStatusMessage}</p>
          ) : null}
        </div>

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
