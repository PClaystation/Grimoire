import { ArrowRight, EyeOff, PlusCircle, RadioTower, Rows3, WandSparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

import { PlayFrame } from '@/play/components/PlayFrame'
import { usePlay } from '@/play/usePlay'

export function PlayHomePage() {
  const { connectionStatus, room, game, error, clearError } = usePlay()

  return (
    <PlayFrame
      eyebrow="Online Tabletop"
      title="Run a shared MTG table without the rules engine."
      description="Create a room, bring a saved deck, and keep public zones in sync."
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
              description="Only the active browser sees its own hand."
            />
            <FeatureCard
              icon={<Rows3 className="h-4 w-4" />}
              title="Shared table state"
              description="Battlefield, graveyard, exile, life, and library counts sync live."
            />
            <FeatureCard
              icon={<WandSparkles className="h-4 w-4" />}
              title="Manual first"
              description="Move cards, tap permanents, and adjust life totals manually."
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
