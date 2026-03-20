import { Eye, Plus } from 'lucide-react'

import type { MagicCard } from '@/types/scryfall'
import { formatMarketPriceLabel } from '@/utils/format'

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
  return (
    <article className="group flex h-full flex-col">
      <button
        type="button"
        onClick={() => onPreview(card)}
        className="flex flex-1 flex-col text-left"
        aria-label={`Preview ${card.name}`}
      >
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col gap-3">
          <div className="aspect-[5/7] transition duration-200 group-hover:-translate-y-1">
            <img
              src={card.imageUrl}
              alt={card.name}
              loading="lazy"
              className="h-full w-full rounded-[1.45rem] object-contain shadow-[0_28px_60px_rgba(0,0,0,0.46)] transition duration-300 group-hover:scale-[1.015]"
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

      <div className="mx-auto mt-3 grid w-full max-w-[26rem] gap-2 sm:grid-cols-2">
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
