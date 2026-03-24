import type { ReactNode } from 'react'
import { ArrowRight, History } from 'lucide-react'

import type { GameActionEvent, PermanentCounter } from '@/shared/play'
import type { MagicCard } from '@/types/scryfall'
import { formatManaCost, formatTypeLine } from '@/utils/format'

export function TableCard({
  card,
  variant,
  tapped = false,
  selected = false,
  counters = [],
  note,
  badge,
}: {
  card: MagicCard
  variant: 'battlefield' | 'hand' | 'zone'
  tapped?: boolean
  selected?: boolean
  counters?: PermanentCounter[]
  note?: string
  badge?: string
}) {
  const cardClassName =
    variant === 'battlefield'
      ? 'w-[7.2rem]'
      : variant === 'hand'
        ? 'w-[8.75rem]'
        : 'w-full'
  const imageClassName =
    variant === 'battlefield'
      ? 'h-[9.25rem]'
      : variant === 'hand'
        ? 'h-[12rem]'
        : 'h-[13.75rem]'
  const manaLabel =
    card.manaCost
      ? formatManaCost(card.manaCost)
      : card.typeLine.includes('Land')
        ? 'Land'
        : `MV ${card.manaValue}`
  const battlefieldRotationClassName =
    tapped && variant === 'battlefield' ? 'rotate-90 origin-center' : ''
  const showDetails = variant !== 'zone'
  const zoneVariantClassName = selected
    ? 'bg-transparent p-0 shadow-[0_0_0_1px_rgba(132,225,255,0.36),0_18px_36px_rgba(0,0,0,0.34)]'
    : 'bg-transparent p-0 shadow-[0_14px_32px_rgba(0,0,0,0.28)]'

  return (
    <article
      className={`${cardClassName} rounded-[1.2rem] transition duration-200 ${battlefieldRotationClassName} ${
        variant === 'zone'
          ? zoneVariantClassName
          : `border bg-ink-900/95 p-2 shadow-card ${
              selected
                ? 'border-tide-300/60 ring-2 ring-tide-300/20'
                : 'border-white/10 hover:border-white/20'
            }`
      }`}
    >
      <div
        className={`relative ${imageClassName} overflow-hidden ${
          variant === 'zone'
            ? `rounded-[1.05rem] ${
                selected
                  ? 'ring-2 ring-tide-300/35 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]'
                  : ''
              }`
            : 'rounded-[0.95rem] border border-white/10 bg-ink-800/70'
        }`}
      >
        <div className="absolute inset-0">
          <img src={card.imageUrl} alt={card.name} className="h-full w-full object-contain" />
          {showDetails ? (
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-black/25 to-transparent px-2 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-xs font-semibold text-white">{card.name}</p>
                <span className="max-w-[46%] rounded-full border border-black/20 bg-black/55 px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-white/90">
                  {manaLabel}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showDetails ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="line-clamp-2 text-[0.68rem] font-medium text-ink-300">
            {formatTypeLine(card.typeLine)}
          </p>
          {badge ? (
            <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-ink-100">
              {badge}
            </span>
          ) : null}
        </div>
      ) : null}

      {variant === 'battlefield' && (counters.length > 0 || note) ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {counters.slice(0, 3).map((counter) => (
            <span
              key={counter.kind}
              className="rounded-full border border-ember-400/20 bg-ember-500/10 px-2 py-1 text-[0.6rem] font-semibold text-ember-100"
            >
              {counter.kind} {counter.amount}
            </span>
          ))}
          {note ? (
            <span className="rounded-full border border-tide-400/20 bg-tide-500/10 px-2 py-1 text-[0.6rem] font-semibold text-tide-100">
              Note
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export function InspectorSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 open:bg-white/[0.07]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-200">
            {title}
          </h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-300">
          Toggle
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}

export function MetaPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-ink-100">
      {icon}
      {label}
    </span>
  )
}

export function HudButton({
  icon,
  label,
  onClick,
  disabled = false,
  dataTestId,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  dataTestId?: string
}) {
  return (
    <button
      type="button"
      data-testid={dataTestId}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-ink-100 transition ${
        disabled
          ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-60'
          : 'border-white/10 bg-white/6 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export function TurnDock({
  activePlayerName,
  isLocalPlayersTurn,
  onAdvanceTurn,
}: {
  activePlayerName: string
  isLocalPlayersTurn: boolean
  onAdvanceTurn: () => void
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1720px] justify-end">
        <div
          className={`pointer-events-auto flex max-w-[28rem] items-center justify-between gap-4 rounded-[1.6rem] border px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur ${
            isLocalPlayersTurn
              ? 'border-emerald-400/30 bg-[linear-gradient(180deg,rgba(8,35,24,0.96),rgba(5,20,15,0.96))]'
              : 'border-white/10 bg-ink-950/92'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                isLocalPlayersTurn
                  ? 'bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.95)] animate-pulse'
                  : 'bg-amber-300 shadow-[0_0_16px_rgba(253,186,116,0.8)]'
              }`}
            />
            <div>
              <p
                className={`text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${
                  isLocalPlayersTurn ? 'text-emerald-100' : 'text-ember-100/85'
                }`}
              >
                {isLocalPlayersTurn ? 'Your turn' : `${activePlayerName} is acting`}
              </p>
              <p className="text-sm text-ink-300">
                {isLocalPlayersTurn
                  ? 'Pass here without scrolling back to the top.'
                  : 'The pass button will unlock when the active player finishes.'}
              </p>
            </div>
          </div>

          <HudButton
            icon={<ArrowRight className="h-4 w-4" />}
            label="Pass turn"
            onClick={onAdvanceTurn}
            disabled={!isLocalPlayersTurn}
            dataTestId="turn-dock-pass-turn"
          />
        </div>
      </div>
    </div>
  )
}

export function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-ink-100">
      {label} {value}
    </span>
  )
}

export function LifeButton({
  children,
  tone,
  onClick,
}: {
  children: ReactNode
  tone: 'secondary' | 'primary' | 'accent'
  onClick: () => void
}) {
  const toneClassName =
    tone === 'primary'
      ? 'border-tide-400/25 bg-tide-500/12 text-tide-100 hover:border-tide-400/40'
      : tone === 'accent'
        ? 'border-ember-400/25 bg-ember-500/12 text-ember-100 hover:border-ember-400/40'
        : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${toneClassName}`}
    >
      {children}
    </button>
  )
}

export function InspectorButton({
  children,
  tone = 'secondary',
  onClick,
}: {
  children: ReactNode
  tone?: 'secondary' | 'primary' | 'danger'
  onClick: () => void
}) {
  const toneClassName =
    tone === 'primary'
      ? 'border-tide-400/25 bg-tide-500/12 text-tide-100 hover:border-tide-400/40'
      : tone === 'danger'
        ? 'border-rose-400/25 bg-rose-500/12 text-rose-100 hover:border-rose-400/40'
        : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${toneClassName}`}
    >
      {children}
    </button>
  )
}

export function ZoneActionButton({
  children,
  tone = 'secondary',
  disabled = false,
  onClick,
}: {
  children: ReactNode
  tone?: 'secondary' | 'primary' | 'danger'
  disabled?: boolean
  onClick: () => void
}) {
  const toneClassName =
    tone === 'primary'
      ? 'border-tide-400/25 bg-tide-500/12 text-tide-100 hover:border-tide-400/40'
      : tone === 'danger'
        ? 'border-rose-400/25 bg-rose-500/12 text-rose-100 hover:border-rose-400/40'
        : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        disabled ? 'cursor-not-allowed border-white/10 bg-white/5 text-ink-500' : toneClassName
      }`}
    >
      {children}
    </button>
  )
}

export function InfoChip({
  label,
  tone = 'default',
}: {
  label: string
  tone?: 'default' | 'info' | 'warning' | 'accent'
}) {
  const toneClassName =
    tone === 'info'
      ? 'border-tide-400/25 bg-tide-500/12 text-tide-100'
      : tone === 'warning'
        ? 'border-ember-400/25 bg-ember-500/12 text-ember-100'
        : tone === 'accent'
          ? 'border-rose-400/25 bg-rose-500/12 text-rose-100'
          : 'border-white/10 bg-white/6 text-ink-100'

  return (
    <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClassName}`}>
      {label}
    </span>
  )
}

export function OverviewStat({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
      <div className="flex items-center gap-2 text-tide-100">{icon}</div>
      <h3 className="mt-3 text-base font-semibold text-ink-50">{title}</h3>
      <p className="mt-2 text-sm text-ink-300">{body}</p>
    </article>
  )
}

export function ClockPip() {
  return <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
}

export function ActivityLog({ entries }: { entries: GameActionEvent[] }) {
  return (
    <section className="rounded-[1.9rem] border border-white/10 bg-ink-900/90 p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-ember-200" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
            Table feed
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink-50">Latest actions</h2>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="mt-4 grid max-h-[18rem] gap-2 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.25rem] border border-white/10 bg-white/5 px-3 py-3"
            >
              <p className="text-sm font-medium text-ink-100">{entry.message}</p>
              <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-400">
                {new Date(entry.createdAt).toLocaleTimeString()}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-ink-300">
          No actions recorded yet.
        </div>
      )}
    </section>
  )
}
