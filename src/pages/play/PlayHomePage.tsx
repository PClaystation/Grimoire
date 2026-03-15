import { ArrowRight, PlusCircle, RadioTower } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PlayFrame } from '@/play/components/PlayFrame'
import { usePlay } from '@/play/usePlay'

export function PlayHomePage() {
  const { connectionStatus, room, game, error, clearError } = usePlay()

  return (
    <PlayFrame
      eyebrow="Online Tabletop"
      title="Spin up a shared MTG table without turning the site into a rules engine."
      description="Create a private room, bring a saved deck from this browser, and play with synchronized public zones while each player keeps their own hand hidden."
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
        <section className="rounded-[2rem] border border-white/10 bg-ink-900/82 p-6 shadow-panel">
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              title="Private hand sync"
              description="Each browser only receives that player’s hand contents. Everyone else sees hand counts only."
            />
            <FeatureCard
              title="Shared table state"
              description="Battlefield, graveyard, exile, life totals, and library counts stay synchronized over WebSockets."
            />
            <FeatureCard
              title="Manual first"
              description="Players move cards, tap permanents, and adjust life totals without a full MTG rules engine."
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-ink-900/82 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
            Current session
          </p>

          {game ? (
            <ResumeCard
              title="Active game found"
              description="Your browser already has an active multiplayer table open."
              href={`/play/game/${game.gameId}`}
              actionLabel="Resume game"
            />
          ) : room ? (
            <ResumeCard
              title="Lobby in progress"
              description={`Room ${room.code} is already tied to this browser session.`}
              href={`/play/room/${room.roomId}`}
              actionLabel="Open lobby"
            />
          ) : (
            <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-ink-300">
                No active room is attached to this browser right now.
              </p>
            </div>
          )}
        </section>
      </div>
    </PlayFrame>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
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
    <div className="mt-4 rounded-[1.6rem] border border-tide-400/20 bg-tide-500/10 p-5">
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
