import { type ReactNode } from 'react'
import {
  ArrowRight,
  Clock3,
  EyeOff,
  PlusCircle,
  RadioTower,
  Rows3,
  WandSparkles,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PlayFrame } from '@/play/components/PlayFrame'
import { PublicRoomDirectory } from '@/play/components/PublicRoomDirectory'
import { usePlayRecaps } from '@/play/usePlayRecaps'
import { usePlay } from '@/play/usePlay'
import { formatDateTimeLabel } from '@/utils/format'

export function PlayHomePage() {
  const navigate = useNavigate()
  const recaps = usePlayRecaps()
  const { connectionStatus, playerName, room, roomDirectory, game, error, clearError, joinRoom } =
    usePlay()

  return (
    <PlayFrame
      eyebrow="Online Tabletop"
      title="Run a shared MTG table."
      description="Create a room, browse public tables, and keep public zones in sync."
      connectionStatus={connectionStatus}
      error={error}
      onDismissError={clearError}
      actions={
        <>
          <Link
            to="/play/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-tide-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-tide-400"
          >
            <PlusCircle className="h-4 w-4" />
            Create room
          </Link>
          <Link
            to="/play/join"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-ink-100 transition hover:bg-white/10"
          >
            <RadioTower className="h-4 w-4" />
            Join by code
          </Link>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_28rem]">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.95),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5">
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<EyeOff className="h-4 w-4" />}
              title="Private hand sync"
              description="Only your browser sees your hand."
            />
            <FeatureCard
              icon={<Rows3 className="h-4 w-4" />}
              title="Shared table state"
              description="Battlefield, graveyard, exile, life, and library counts sync."
            />
            <FeatureCard
              icon={<WandSparkles className="h-4 w-4" />}
              title="Manual first"
              description="Move cards, tap permanents, and adjust life totals."
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.95),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
            Current session
          </p>

          {game ? (
            <ResumeCard
              title="Active game found"
              description="This browser already has an active table."
              href={`/play/game/${game.gameId}`}
              actionLabel="Resume game"
            />
          ) : room ? (
            <ResumeCard
              title="Lobby in progress"
              description={`Room ${room.code} is already open here.`}
              href={`/play/room/${room.roomId}`}
              actionLabel="Open lobby"
            />
          ) : (
            <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm text-ink-300">No active room is attached to this browser.</p>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.95),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
              Session recap
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-50">Recent matches on this browser</h2>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
              Sessions
            </p>
            <p className="mt-2 text-xl font-semibold text-ink-50">{recaps.length}</p>
          </div>
        </div>

        {recaps.length > 0 ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {recaps.slice(0, 4).map((recap) => (
              <article
                key={recap.id}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-50">{recap.roomName}</h3>
                    <p className="mt-2 text-sm text-ink-300">
                      {recap.roomCode ? `Room ${recap.roomCode} • ` : ''}
                      {recap.players.length} players • Turn {recap.turnNumber} • {recap.actionCount}{' '}
                      actions
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                      recap.endedAt
                        ? 'bg-white/8 text-ink-200 ring-white/10'
                        : 'bg-emerald-500/12 text-emerald-100 ring-emerald-400/25'
                    }`}
                  >
                    {recap.endedAt ? 'Finished' : 'Live'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {recap.players.map((player) => (
                    <span
                      key={`${recap.id}-${player.id}`}
                      className="rounded-full bg-ink-900/60 px-3 py-1 text-xs text-ink-200 ring-1 ring-white/10"
                    >
                      {player.name}: {player.lifeTotal}
                    </span>
                  ))}
                </div>

                <p className="mt-4 inline-flex items-center gap-2 text-sm text-ink-400">
                  <Clock3 className="h-4 w-4" />
                  {recap.endedAt
                    ? `Wrapped ${formatDateTimeLabel(recap.endedAt)}`
                    : `Updated ${formatDateTimeLabel(recap.updatedAt)}`}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm text-ink-300">
              Start a table and Grimoire will keep a local recap here.
            </p>
          </div>
        )}
      </section>

      <PublicRoomDirectory
        rooms={roomDirectory}
        connectionStatus={connectionStatus}
        activeRoomId={room?.roomId ?? null}
        title="Find a room by search, tags, format, or open seats."
        description={`Jump straight into any public room with the saved display name "${playerName}". Use the join page if you want to change your name first or join a private code-only room.`}
        emptyTitle="No public rooms are available yet."
        emptyDescription="Create a public room to have it listed for everyone on the play page. Private rooms stay hidden and can still be joined by code."
        onJoinRoom={(roomId) => {
          joinRoom(roomId)
          navigate(`/play/room/${roomId}`)
        }}
      />
    </PlayFrame>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
      <div className="inline-flex rounded-full border border-white/10 bg-white/[0.06] p-2 text-tide-100">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-ink-50">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-ink-300">{description}</p>
    </article>
  )
}

function ResumeCard({
  title,
  description,
  href,
  actionLabel,
}: {
  title: string
  description: string
  href: string
  actionLabel: string
}) {
  return (
    <div className="mt-4 rounded-[1.6rem] border border-tide-400/20 bg-[linear-gradient(180deg,rgba(29,150,167,0.14),rgba(255,255,255,0.03))] p-5">
      <h2 className="text-lg font-semibold text-ink-50">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-ink-300">{description}</p>
      <Link
        to={href}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm font-semibold text-ink-50 transition hover:bg-ink-800"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
