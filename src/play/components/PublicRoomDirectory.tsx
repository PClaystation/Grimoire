import { useDeferredValue, useState } from 'react'
import { Compass, DoorOpen, Search, Tag, Users } from 'lucide-react'

import {
  ROOM_FORMAT_LABELS,
  ROOM_FORMAT_OPTIONS,
  ROOM_POWER_LEVEL_LABELS,
  ROOM_POWER_LEVEL_OPTIONS,
} from '@/play/roomSettings'
import type { RoomDirectoryEntry } from '@/shared/play'

interface PublicRoomDirectoryProps {
  rooms: RoomDirectoryEntry[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  activeRoomId: string | null
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  joinButtonLabel?: string
  onJoinRoom: (roomId: string) => void
  onUseCode?: (roomId: string) => void
}

type AvailabilityFilter = 'all' | 'open' | 'ready' | 'wide-open'
type SortMode = 'newest' | 'players' | 'open-seats' | 'name'

export function PublicRoomDirectory({
  rooms,
  connectionStatus,
  activeRoomId,
  title,
  description,
  emptyTitle,
  emptyDescription,
  joinButtonLabel = 'Join room',
  onJoinRoom,
  onUseCode,
}: PublicRoomDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [formatFilter, setFormatFilter] = useState<'all' | (typeof ROOM_FORMAT_OPTIONS)[number]['value']>('all')
  const [powerFilter, setPowerFilter] = useState<
    'all' | (typeof ROOM_POWER_LEVEL_OPTIONS)[number]['value']
  >('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase())

  const tagCounts = new Map<string, number>()

  rooms.forEach((room) => {
    room.settings.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    })
  })

  const topTags = Array.from(tagCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 6)
    .map(([tag]) => tag)

  const filteredRooms = rooms
    .filter((room) => {
      if (formatFilter !== 'all' && room.settings.format !== formatFilter) {
        return false
      }

      if (powerFilter !== 'all' && room.settings.powerLevel !== powerFilter) {
        return false
      }

      if (availabilityFilter === 'open' && room.openSeatCount < 1) {
        return false
      }

      if (availabilityFilter === 'ready' && room.playerCount < room.settings.minPlayers) {
        return false
      }

      if (availabilityFilter === 'wide-open' && room.openSeatCount < 2) {
        return false
      }

      if (activeTag && !room.settings.tags.includes(activeTag)) {
        return false
      }

      if (!deferredSearchQuery) {
        return true
      }

      const searchableText = [
        room.settings.name,
        room.code,
        room.hostPlayerName,
        room.settings.description,
        room.settings.format,
        room.settings.powerLevel,
        ...room.settings.tags,
        ...room.players.map((player) => player.name),
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(deferredSearchQuery)
    })
    .sort((left, right) => {
      switch (sortMode) {
        case 'players':
          return right.playerCount - left.playerCount || right.createdAt.localeCompare(left.createdAt)
        case 'open-seats':
          return right.openSeatCount - left.openSeatCount || right.createdAt.localeCompare(left.createdAt)
        case 'name':
          return left.settings.name.localeCompare(right.settings.name)
        case 'newest':
        default:
          return right.createdAt.localeCompare(left.createdAt)
      }
    })

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
            Public rooms
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-50">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-ink-300">{description}</p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Live rooms
          </p>
          <p className="mt-2 text-xl font-semibold text-ink-50">{rooms.length}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,0.6fr))]">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            Search
          </span>
          <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3">
            <Search className="h-4 w-4 text-ink-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Name, code, host, tag, format"
              className="w-full bg-transparent text-sm text-ink-50 outline-none placeholder:text-ink-500"
            />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            Format
          </span>
          <select
            value={formatFilter}
            onChange={(event) =>
              setFormatFilter(event.target.value as 'all' | (typeof ROOM_FORMAT_OPTIONS)[number]['value'])
            }
            className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-ink-50 outline-none"
          >
            <option value="all" className="bg-slate-950">
              All formats
            </option>
            {ROOM_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-950">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            Vibe
          </span>
          <select
            value={powerFilter}
            onChange={(event) =>
              setPowerFilter(
                event.target.value as 'all' | (typeof ROOM_POWER_LEVEL_OPTIONS)[number]['value'],
              )
            }
            className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-ink-50 outline-none"
          >
            <option value="all" className="bg-slate-950">
              All vibes
            </option>
            {ROOM_POWER_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-950">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            Availability
          </span>
          <select
            value={availabilityFilter}
            onChange={(event) => setAvailabilityFilter(event.target.value as AvailabilityFilter)}
            className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-ink-50 outline-none"
          >
            <option value="all" className="bg-slate-950">
              Any seat count
            </option>
            <option value="open" className="bg-slate-950">
              Open seats
            </option>
            <option value="ready" className="bg-slate-950">
              Ready to start
            </option>
            <option value="wide-open" className="bg-slate-950">
              2+ seats open
            </option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {topTags.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                  activeTag === null
                    ? 'bg-tide-500/15 text-tide-100 ring-tide-400/30'
                    : 'bg-white/6 text-ink-200 ring-white/10 hover:bg-white/10'
                }`}
              >
                All tags
              </button>
              {topTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                    activeTag === tag
                      ? 'bg-tide-500/15 text-tide-100 ring-tide-400/30'
                      : 'bg-white/6 text-ink-200 ring-white/10 hover:bg-white/10'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </>
          ) : (
            <p className="text-sm text-ink-400">Hosts can add tags to make rooms easier to find.</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-300">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            Sort
          </span>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-ink-50 outline-none"
          >
            <option value="newest" className="bg-slate-950">
              Newest
            </option>
            <option value="players" className="bg-slate-950">
              Most players
            </option>
            <option value="open-seats" className="bg-slate-950">
              Most open seats
            </option>
            <option value="name" className="bg-slate-950">
              Name
            </option>
          </select>
        </label>
      </div>

      {filteredRooms.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {filteredRooms.map((room) => {
            const isCurrentRoom = activeRoomId === room.roomId
            const isBusyInOtherRoom = Boolean(activeRoomId && activeRoomId !== room.roomId)
            const isFull = room.openSeatCount < 1
            const joinDisabled =
              connectionStatus === 'disconnected' || isCurrentRoom || isBusyInOtherRoom || isFull

            return (
              <article
                key={room.roomId}
                className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-ink-50">{room.settings.name}</h3>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-ink-200 ring-1 ring-white/10">
                        {ROOM_FORMAT_LABELS[room.settings.format]}
                      </span>
                      <span className="rounded-full bg-ember-500/12 px-3 py-1 text-xs font-semibold text-ember-100 ring-1 ring-ember-400/25">
                        {ROOM_POWER_LEVEL_LABELS[room.settings.powerLevel]}
                      </span>
                      {room.playerCount >= room.settings.minPlayers ? (
                        <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-400/25">
                          Ready to start
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-sm leading-7 text-ink-300">
                      {room.settings.description ||
                        `${room.hostPlayerName} is hosting a ${ROOM_POWER_LEVEL_LABELS[room.settings.powerLevel].toLowerCase()} table.`}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-ink-200 ring-1 ring-white/10">
                        Code {room.code}
                      </span>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-ink-200 ring-1 ring-white/10">
                        {room.playerCount} / {room.settings.maxPlayers} players
                      </span>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-ink-200 ring-1 ring-white/10">
                        Start at {room.settings.minPlayers}
                      </span>
                    </div>

                    {room.settings.tags.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {room.settings.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setActiveTag(tag)}
                            className="inline-flex items-center gap-1 rounded-full bg-tide-500/12 px-3 py-1 text-xs font-semibold text-tide-100 ring-1 ring-tide-400/25 transition hover:bg-tide-500/18"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-[16rem] max-w-[18rem] rounded-[1.4rem] border border-white/10 bg-ink-950/40 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
                      <Users className="h-4 w-4 text-tide-200" />
                      Players
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {room.players.map((player, index) => (
                        <span
                          key={`${room.roomId}-${player.name}-${index}`}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                            player.isConnected
                              ? 'bg-white/8 text-ink-100 ring-white/10'
                              : 'bg-rose-500/12 text-rose-100 ring-rose-400/25'
                          }`}
                        >
                          {player.isHost ? `${player.name} (Host)` : player.name}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={joinDisabled}
                        onClick={() => onJoinRoom(room.roomId)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-tide-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-tide-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <DoorOpen className="h-4 w-4" />
                        {isCurrentRoom
                          ? 'Already here'
                          : isBusyInOtherRoom
                            ? 'Leave current room first'
                            : isFull
                              ? 'Room is full'
                              : joinButtonLabel}
                      </button>
                      {onUseCode ? (
                        <button
                          type="button"
                          onClick={() => onUseCode(room.roomId)}
                          className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-ink-100 transition hover:bg-white/10"
                        >
                          Use code in join form
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.6rem] border border-dashed border-white/10 bg-white/[0.03] p-6">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-3 text-tide-100">
            <Compass className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-ink-50">{emptyTitle}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-300">{emptyDescription}</p>
        </div>
      )}
    </section>
  )
}
