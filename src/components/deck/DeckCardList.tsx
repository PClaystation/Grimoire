import { ArrowRightLeft, Minus, Plus, Trash2 } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'
import type { DeckCardEntry, DeckSection } from '@/types/deck'
import type { MagicCard } from '@/types/scryfall'
import { formatMarketPriceLabel, formatUsdPrice, getCardMarketPriceUsd } from '@/utils/format'

interface DeckCardListProps {
  title: string
  description: string
  section: DeckSection
  cards: DeckCardEntry[]
  onIncrease: (card: MagicCard, section: DeckSection) => void
  onDecrease: (cardId: string, section: DeckSection) => void
  onRemove: (cardId: string, section: DeckSection) => void
  onMove: (cardId: string, from: DeckSection, to: DeckSection) => void
}

export function DeckCardList({
  title,
  description,
  section,
  cards,
  onIncrease,
  onDecrease,
  onRemove,
  onMove,
}: DeckCardListProps) {
  const moveTarget = section === 'mainboard' ? 'sideboard' : 'mainboard'

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-xl text-ink-50">{title}</h3>
        <p className="mt-1 text-sm text-ink-300">{description}</p>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          title={`No cards in the ${section}`}
          description="Move cards between sections."
        />
      ) : (
        <div className="space-y-3">
          {cards.map((entry) => (
            <div
              key={`${section}-${entry.card.id}`}
              className="rounded-[1.4rem] border border-white/10 bg-ink-800/55 p-4 shadow-card"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-ink-200">
                      {entry.quantity}x
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-50">
                        {entry.card.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-ink-400">
                        {entry.card.typeLine} • MV {entry.card.manaValue}
                      </p>
                      <p className="mt-2 text-xs font-medium text-emerald-300">
                        {formatMarketPriceLabel(entry.card)}
                        {getCardMarketPriceUsd(entry.card) !== null
                          ? ` each • ${formatUsdPrice(
                              getCardMarketPriceUsd(entry.card)! * entry.quantity,
                            )} total`
                          : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => onMove(entry.card.id, section, moveTarget)}
                    className="rounded-full border border-tide-400/20 p-2 text-tide-200 transition hover:border-tide-400/35 hover:bg-tide-500/10 hover:text-tide-100"
                    aria-label={`Move ${entry.card.name} to ${moveTarget}`}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecrease(entry.card.id, section)}
                    className="rounded-full border border-white/10 p-2 text-ink-300 transition hover:border-white/20 hover:bg-white/5 hover:text-ink-50"
                    aria-label={`Remove one ${entry.card.name}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onIncrease(entry.card, section)}
                    className="rounded-full border border-white/10 p-2 text-ink-300 transition hover:border-white/20 hover:bg-white/5 hover:text-ink-50"
                    aria-label={`Add one ${entry.card.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(entry.card.id, section)}
                    className="rounded-full border border-rose-400/20 p-2 text-rose-300 transition hover:border-rose-400/35 hover:bg-rose-500/10 hover:text-rose-200"
                    aria-label={`Remove ${entry.card.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
