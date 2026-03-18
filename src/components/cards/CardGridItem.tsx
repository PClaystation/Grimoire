import { Eye, Plus } from 'lucide-react'

import { COLOR_LABELS, COLOR_SWATCHES } from '@/constants/mtg'
import type { MagicCard } from '@/types/scryfall'
import { formatManaCost, formatMarketPriceLabel, formatTypeLine } from '@/utils/format'

interface CardGridItemProps {
  card: MagicCard
  onPreview: (card: MagicCard) => void
  onAddToMainboard: (card: MagicCard) => void
  onAddToSideboard: (card: MagicCard) => void
}

export function CardGridItem({
  card,
  onPreview,
  onAddToMainboard,
  onAddToSideboard,
}: CardGridItemProps) {
  const colorTag = card.colors[0] ?? 'C'

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-ink-900/85 shadow-card transition duration-200 hover:-translate-y-1 hover:border-white/15 hover:shadow-panel">
      <button
        type="button"
        onClick={() => onPreview(card)}
        className="flex flex-1 flex-col text-left"
      >
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold leading-tight text-ink-50">{card.name}</h3>
                <p className="mt-2 text-sm text-ink-400">{formatTypeLine(card.typeLine)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-ink-200">
                {formatManaCost(card.manaCost)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-100">
                {card.setCode.toUpperCase()}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-100">
                {card.rarity}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                  COLOR_SWATCHES[colorTag]
                }`}
              >
                {COLOR_LABELS[colorTag]}
              </span>
            </div>
          </div>

          <div className="relative aspect-[5/7] overflow-hidden rounded-[1.3rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(29,150,167,0.12),transparent_45%),rgba(9,17,23,0.96)] p-3">
            <img
              src={card.imageUrl}
              alt={card.name}
              loading="lazy"
              className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
            />
          </div>

          <div className="mt-auto flex items-center justify-between gap-2">
            <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/20">
              Market: {formatMarketPriceLabel(card)}
            </div>

            <span className="inline-flex items-center gap-1 text-xs font-medium text-tide-200">
              <Eye className="h-3.5 w-3.5" />
              View details
            </span>
          </div>
        </div>
      </button>

      <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onAddToMainboard(card)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-tide-400/20 bg-tide-500/10 px-4 py-3 text-sm font-semibold text-tide-100 transition hover:border-tide-400/35 hover:bg-tide-500/15"
        >
          <Plus className="h-4 w-4" />
          Mainboard
        </button>
        <button
          type="button"
          onClick={() => onAddToSideboard(card)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ember-400/20 bg-ember-500/10 px-4 py-3 text-sm font-semibold text-ember-100 transition hover:border-ember-400/35 hover:bg-ember-500/15"
        >
          <Plus className="h-4 w-4" />
          Sideboard
        </button>
      </div>
    </article>
  )
}
