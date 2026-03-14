import { COLOR_LABELS, COLOR_ORDER, COLOR_SWATCHES } from '@/constants/mtg'
import type { DeckSectionStats as DeckSectionStatsShape, DeckStats as DeckStatsShape } from '@/types/deck'
import { formatUsdPrice } from '@/utils/format'

interface DeckStatsProps {
  stats: DeckStatsShape
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

export function DeckStats({ stats }: DeckStatsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
        <div className="min-w-0 rounded-[1.3rem] border border-white/10 bg-ink-800/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Mainboard</p>
          <p className="mt-2 text-2xl font-semibold text-ink-50">{stats.mainboard.totalCards}</p>
          <p className="mt-1 text-sm text-ink-400">{stats.cardsToSixty} cards to 60</p>
        </div>
        <div className="min-w-0 rounded-[1.3rem] border border-white/10 bg-ink-800/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Sideboard</p>
          <p className="mt-2 text-2xl font-semibold text-ink-50">{stats.sideboard.totalCards}</p>
          <p className="mt-1 text-sm text-ink-400">{stats.sideboardSlotsLeft} slots left</p>
        </div>
        <div className="min-w-0 rounded-[1.3rem] border border-white/10 bg-ink-800/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Main Avg. MV</p>
          <p className="mt-2 text-2xl font-semibold text-ink-50">{stats.mainboard.averageManaValue}</p>
          <p className="mt-1 text-sm text-ink-400">weighted by copies</p>
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
