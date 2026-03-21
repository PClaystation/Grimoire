import {
  ROOM_DESCRIPTION_MAX_LENGTH,
  ROOM_FORMAT_OPTIONS,
  ROOM_PLAYER_COUNT_OPTIONS,
  ROOM_POWER_LEVEL_OPTIONS,
  ROOM_TAG_MAX_LENGTH,
  ROOM_VISIBILITY_OPTIONS,
  ROOM_NAME_MAX_LENGTH,
  type RoomSettingsDraft,
  updateRoomPlayerBounds,
} from '@/play/roomSettings'

interface RoomSettingsFormProps {
  draft: RoomSettingsDraft
  disabled?: boolean
  onChange: (draft: RoomSettingsDraft) => void
}

export function RoomSettingsForm({
  draft,
  disabled = false,
  onChange,
}: RoomSettingsFormProps) {
  function updateDraft<Key extends keyof RoomSettingsDraft>(
    key: Key,
    value: RoomSettingsDraft[Key],
  ) {
    onChange({
      ...draft,
      [key]: value,
    })
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <span className="text-sm font-semibold text-ink-100">Visibility</span>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROOM_VISIBILITY_OPTIONS.map((option) => {
            const isActive = draft.visibility === option.value

            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => updateDraft('visibility', option.value)}
                className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                  isActive
                    ? 'border-tide-400/30 bg-tide-500/12'
                    : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <p className="text-sm font-semibold text-ink-50">{option.label}</p>
                <p className="mt-2 text-sm leading-6 text-ink-300">
                  {option.value === 'public'
                    ? 'Listed on the play page so anyone can browse and join.'
                    : 'Invite-only. Players join with the room code only.'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-ink-100">Room name</span>
        <input
          type="text"
          name="room-name"
          value={draft.name}
          disabled={disabled}
          maxLength={ROOM_NAME_MAX_LENGTH}
          onChange={(event) => updateDraft('name', event.target.value)}
          placeholder="Friday Night Table"
          className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-ink-50 outline-none transition focus:border-tide-400/40 focus:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-100">Preferred format</span>
          <select
            name="room-format"
            value={draft.format}
            disabled={disabled}
            onChange={(event) => updateDraft('format', event.target.value as RoomSettingsDraft['format'])}
            className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-ink-50 outline-none transition focus:border-tide-400/40 focus:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ROOM_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-950">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-100">Table vibe</span>
          <select
            name="room-power-level"
            value={draft.powerLevel}
            disabled={disabled}
            onChange={(event) =>
              updateDraft('powerLevel', event.target.value as RoomSettingsDraft['powerLevel'])
            }
            className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-ink-50 outline-none transition focus:border-tide-400/40 focus:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ROOM_POWER_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-950">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-100">Minimum players to start</span>
          <select
            name="room-min-players"
            value={draft.minPlayers}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                updateRoomPlayerBounds(draft, 'minPlayers', Number.parseInt(event.target.value, 10)),
              )
            }
            className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-ink-50 outline-none transition focus:border-tide-400/40 focus:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ROOM_PLAYER_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count} className="bg-slate-950">
                {count} players
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-100">Maximum players</span>
          <select
            name="room-max-players"
            value={draft.maxPlayers}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                updateRoomPlayerBounds(draft, 'maxPlayers', Number.parseInt(event.target.value, 10)),
              )
            }
            className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-ink-50 outline-none transition focus:border-tide-400/40 focus:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ROOM_PLAYER_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count} className="bg-slate-950">
                {count} players
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-ink-100">Room notes</span>
        <textarea
          name="room-description"
          value={draft.description}
          disabled={disabled}
          maxLength={ROOM_DESCRIPTION_MAX_LENGTH}
          onChange={(event) => updateDraft('description', event.target.value)}
          rows={4}
          placeholder="Spell out the pod, house rules, or what kind of game you want."
          className="min-h-28 rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-ink-50 outline-none transition focus:border-tide-400/40 focus:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-ink-100">Tags</span>
        <input
          type="text"
          name="room-tags"
          value={draft.tagsInput}
          disabled={disabled}
          onChange={(event) => updateDraft('tagsInput', event.target.value)}
          placeholder="budget, webcam, no proxies"
          className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-ink-50 outline-none transition focus:border-tide-400/40 focus:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <p className="text-xs leading-6 text-ink-400">
          Comma-separated tags. Up to 6 tags, {ROOM_TAG_MAX_LENGTH} characters each.
        </p>
      </label>
    </div>
  )
}
