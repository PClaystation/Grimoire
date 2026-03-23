import type { ReactNode } from 'react'

import { COLOR_LABELS, COLOR_ORDER, COLOR_SWATCHES } from '@/constants/mtg'
import { DeckRecommendationsList } from '@/components/deck/DeckRecommendationsList'
import { DeckValidationList } from '@/components/deck/DeckValidationList'
import type {
  DeckColorStatKey,
  DeckSectionStats as DeckSectionStatsShape,
  DeckStats as DeckStatsShape,
  DeckTypeStatKey,
} from '@/types/deck'
import { formatUsdPrice } from '@/utils/format'

interface DeckStatsProps {
  stats: DeckStatsShape
}

const TYPE_GRAPH_ORDER: DeckTypeStatKey[] = [
  'Land',
  'Creature',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Planeswalker',
  'Battle',
  'Other',
]

function getRatingStyle(score: number) {
  if (score >= 85) {
    return {
      cardClassName: 'border-emerald-400/20 bg-emerald-500/10',
      badgeClassName: 'border-emerald-400/25 bg-emerald-500/15 text-emerald-100',
      accentClassName: 'from-emerald-500 to-teal-300',
      textClassName: 'text-emerald-200',
    }
  }

  if (score >= 70) {
    return {
      cardClassName: 'border-tide-400/20 bg-tide-500/10',
      badgeClassName: 'border-tide-400/25 bg-tide-500/15 text-tide-100',
      accentClassName: 'from-tide-500 to-cyan-300',
      textClassName: 'text-tide-100',
    }
  }

  if (score >= 55) {
    return {
      cardClassName: 'border-amber-400/20 bg-amber-500/10',
      badgeClassName: 'border-amber-400/25 bg-amber-500/15 text-amber-100',
      accentClassName: 'from-amber-500 to-amber-300',
      textClassName: 'text-amber-100',
    }
  }

  return {
    cardClassName: 'border-rose-400/20 bg-rose-500/10',
    badgeClassName: 'border-rose-400/25 bg-rose-500/15 text-rose-100',
    accentClassName: 'from-rose-500 to-orange-300',
    textClassName: 'text-rose-100',
  }
}

function SectionBreakdown({
  label,
  stats,
}: {
  label: string
  stats: DeckSectionStatsShape
}) {
  const maxCurveValue = Math.max(...stats.manaCurve.map((entry) => entry.count), 1)

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink-50">{stats.totalCards} cards</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-400">Estimated value</p>
          <p className="mt-2 text-lg font-semibold text-ink-50">
            {formatUsdPrice(stats.estimatedValueUsd)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {COLOR_ORDER.map((color) => (
          <span
            key={`${label}-${color}`}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              COLOR_SWATCHES[color]
            }`}
          >
            <span>{COLOR_LABELS[color]}</span>
            <span>{stats.colorCounts[color]}</span>
          </span>
        ))}
      </div>

      <div className="mt-4 flex h-20 items-end gap-2">
        {stats.manaCurve.map((entry) => (
          <div key={`${label}-${entry.label}`} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-2xl bg-gradient-to-t from-tide-700 to-tide-400"
              style={{
                height: `${Math.max((entry.count / maxCurveValue) * 100, entry.count > 0 ? 12 : 0)}%`,
              }}
            />
            <div className="text-center">
              <p className="text-[11px] font-semibold text-ink-300">{entry.label}</p>
              <p className="text-[10px] text-ink-400">{entry.count}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GraphCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
      <div>
        <p className="text-sm font-semibold text-ink-50">{title}</p>
        <p className="mt-1 text-xs leading-5 text-ink-400">{subtitle}</p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function RatingFactorGraph({ stats }: DeckStatsProps) {
  const maxValue = Math.max(...stats.rating.factors.map((factor) => factor.score), 1)

  return (
    <div className="flex h-40 items-end gap-3">
      {stats.rating.factors.map((factor) => (
        <div key={factor.id} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-full w-full items-end">
            <div
              className="w-full rounded-t-[1rem] bg-gradient-to-t from-tide-700 via-tide-500 to-cyan-300"
              style={{
                height: `${Math.max((factor.score / maxValue) * 100, factor.score > 0 ? 12 : 0)}%`,
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-[11px] font-semibold text-ink-200">{factor.label}</p>
            <p className="text-[10px] text-ink-400">
              {factor.score}/{factor.maxScore}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function HorizontalGraph({
  entries,
  total,
  valueClassName,
}: {
  entries: Array<{ id: string; label: string; value: number; chipClassName?: string }>
  total: number
  valueClassName: string
}) {
  const filteredEntries = entries.filter((entry) => entry.value > 0)
  const maxValue = Math.max(...filteredEntries.map((entry) => entry.value), 1)

  if (filteredEntries.length === 0) {
    return <p className="text-sm text-ink-400">Add cards to generate this graph.</p>
  }

  return (
    <div className="space-y-3">
      {filteredEntries.map((entry) => {
        const percentOfTotal = total > 0 ? Math.round((entry.value / total) * 100) : 0

        return (
          <div key={entry.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {entry.chipClassName ? (
                  <span className={`h-2.5 w-2.5 rounded-full ${entry.chipClassName}`} />
                ) : null}
                <p className="text-xs font-semibold text-ink-200">{entry.label}</p>
              </div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-400">
                {entry.value} • {percentOfTotal}%
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${valueClassName}`}
                style={{ width: `${Math.max((entry.value / maxValue) * 100, 8)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ManaMixGraph({ stats }: { stats: DeckSectionStatsShape }) {
  const landCount = stats.typeCounts.Land
  const nonlandCount = Math.max(stats.totalCards - landCount, 0)
  const total = Math.max(stats.totalCards, 1)
  const landPercent = (landCount / total) * 100
  const nonlandPercent = (nonlandCount / total) * 100

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-full border border-white/10 bg-ink-900/60">
        <div className="flex h-5">
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-300"
            style={{ width: `${landPercent}%` }}
          />
          <div
            className="bg-gradient-to-r from-tide-600 to-cyan-300"
            style={{ width: `${nonlandPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[1rem] border border-white/10 bg-ink-900/40 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-400">Lands</p>
          <p className="mt-2 text-xl font-semibold text-ink-50">{landCount}</p>
          <p className="mt-1 text-xs text-ink-400">{Math.round(landPercent)}% of section</p>
        </div>
        <div className="rounded-[1rem] border border-white/10 bg-ink-900/40 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-400">Spells</p>
          <p className="mt-2 text-xl font-semibold text-ink-50">{nonlandCount}</p>
          <p className="mt-1 text-xs text-ink-400">{Math.round(nonlandPercent)}% of section</p>
        </div>
      </div>
    </div>
  )
}

function buildColorGraphEntries(
  colorCounts: Record<DeckColorStatKey, number>,
): Array<{ id: string; label: string; value: number; chipClassName: string }> {
  return COLOR_ORDER.map((color) => ({
    id: color,
    label: COLOR_LABELS[color],
    value: colorCounts[color],
    chipClassName: COLOR_SWATCHES[color].split(' ')[0] ?? 'bg-white/60',
  }))
}

function buildTypeGraphEntries(
  typeCounts: Record<DeckTypeStatKey, number>,
): Array<{ id: string; label: string; value: number }> {
  return TYPE_GRAPH_ORDER.map((type) => ({
    id: type,
    label: type,
    value: typeCounts[type],
  }))
}

export function DeckStats({ stats }: DeckStatsProps) {
  const ratingStyle = getRatingStyle(stats.rating.score)

  return (
    <div className="space-y-4">
      <div
        className={`rounded-[1.5rem] border p-5 shadow-[0_18px_50px_-32px_rgba(6,16,22,0.9)] ${ratingStyle.cardClassName}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-300">
              Deck rating
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <p className="text-5xl font-semibold leading-none text-ink-50">{stats.rating.score}</p>
              <p className="pb-1 text-sm uppercase tracking-[0.18em] text-ink-300">/ 100</p>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${ratingStyle.badgeClassName}`}
              >
                {stats.rating.label}
              </span>
            </div>
            <p className={`mt-3 text-sm leading-6 ${ratingStyle.textClassName}`}>
              {stats.rating.summary}
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-white/10 bg-ink-950/25 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-300">
              Scale
            </p>
            <p className="mt-2 text-sm text-ink-100">1 means structurally broken.</p>
            <p className="mt-1 text-sm text-ink-100">100 means tuned fundamentals.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {stats.rating.factors.map((factor) => {
            const fillPercent = factor.maxScore > 0 ? (factor.score / factor.maxScore) * 100 : 0
            const progressWidth = factor.score > 0 ? Math.max(6, fillPercent) : 0

            return (
              <div
                key={factor.id}
                className="rounded-[1.2rem] border border-white/10 bg-ink-950/20 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink-50">{factor.label}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-300">
                    {factor.score} / {factor.maxScore}
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${ratingStyle.accentClassName}`}
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-200">{factor.summary}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GraphCard
          title="Rating factor graph"
          subtitle="Relative strength of each scoring bucket."
        >
          <RatingFactorGraph stats={stats} />
        </GraphCard>

        <GraphCard
          title="Mainboard mana mix"
          subtitle="Quick view of lands versus nonland spells."
        >
          <ManaMixGraph stats={stats.mainboard} />
        </GraphCard>

        <GraphCard
          title="Mainboard color graph"
          subtitle="Color spread across the section."
        >
          <HorizontalGraph
            entries={buildColorGraphEntries(stats.mainboard.colorCounts)}
            total={stats.mainboard.totalCards}
            valueClassName="bg-gradient-to-r from-amber-400 via-tide-300 to-emerald-300"
          />
        </GraphCard>

        <GraphCard
          title="Mainboard type graph"
          subtitle="Where the cards are actually allocated."
        >
          <HorizontalGraph
            entries={buildTypeGraphEntries(stats.mainboard.typeCounts)}
            total={stats.mainboard.totalCards}
            valueClassName="bg-gradient-to-r from-tide-700 to-cyan-300"
          />
        </GraphCard>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            Actionable changes
          </p>
          <div className="mt-3">
            <DeckRecommendationsList recommendations={stats.recommendations} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            Format checks
          </p>
          <div className="mt-3">
            <DeckValidationList issues={stats.validation} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
        <div className="min-w-0 rounded-[1.3rem] border border-white/10 bg-ink-800/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Mainboard</p>
          <p className="mt-2 text-2xl font-semibold text-ink-50">{stats.mainboard.totalCards}</p>
          <p className="mt-1 text-sm text-ink-400">
            {stats.cardsToTarget} cards to {stats.mainboardTarget}
          </p>
        </div>
        <div className="min-w-0 rounded-[1.3rem] border border-white/10 bg-ink-800/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Sideboard</p>
          <p className="mt-2 text-2xl font-semibold text-ink-50">{stats.sideboard.totalCards}</p>
          <p className="mt-1 text-sm text-ink-400">
            {stats.sideboardMax === 0 ? 'Not used in this format' : `${stats.sideboardSlotsLeft} slots left`}
          </p>
        </div>
        <div className="min-w-0 rounded-[1.3rem] border border-white/10 bg-ink-800/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Main Avg. MV</p>
          <p className="mt-2 text-2xl font-semibold text-ink-50">{stats.mainboard.averageManaValue}</p>
          <p className="mt-1 text-sm text-ink-400">Weighted by copies</p>
        </div>
        <div className="min-w-0 rounded-[1.3rem] border border-white/10 bg-ink-800/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Unique</p>
          <p className="mt-2 text-2xl font-semibold text-ink-50">
            {stats.mainboard.uniqueCards + stats.sideboard.uniqueCards}
          </p>
          <p className="mt-1 text-sm text-ink-400">combined entries</p>
        </div>
        <div className="min-w-0 rounded-[1.3rem] border border-white/10 bg-ink-800/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Est. Value</p>
          <p className="mt-2 text-2xl font-semibold text-ink-50">
            {formatUsdPrice(stats.totalEstimatedValueUsd)}
          </p>
          <p className="mt-1 text-sm text-ink-400">
            {stats.mainboard.pricedCards + stats.sideboard.pricedCards} priced copies
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <SectionBreakdown label="Mainboard profile" stats={stats.mainboard} />
        <SectionBreakdown label="Sideboard profile" stats={stats.sideboard} />
      </div>
    </div>
  )
}
