import { useEffect } from 'react'
import { Plus, X } from 'lucide-react'

import { COLOR_LABELS, COLOR_SWATCHES } from '@/constants/mtg'
import type { MagicCard } from '@/types/scryfall'
import { formatManaCost, formatMarketPriceLabel, formatUsdPrice } from '@/utils/format'

interface CardDetailsModalProps {
  card: MagicCard | null
  onClose: () => void
  onAddToMainboard: (card: MagicCard) => void
  onAddToSideboard: (card: MagicCard) => void
}

export function CardDetailsModal({
  card,
  onClose,
  onAddToMainboard,
  onAddToSideboard,
}: CardDetailsModalProps) {
  useEffect(() => {
    if (!card) {
      return undefined
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [card, onClose])

  if (!card) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/10 bg-ink-900/95 p-4 shadow-panel sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-details-title"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
              Card details
            </p>
            <h2 id="card-details-title" className="mt-2 font-display text-3xl text-ink-50">
              {card.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-ink-400 transition hover:border-white/20 hover:bg-white/5 hover:text-ink-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-[19rem_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-ink-800/70 shadow-card">
            <img src={card.largeImageUrl} alt={card.name} className="h-full w-full object-cover" />
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-ink-200">
                Mana cost: {formatManaCost(card.manaCost)}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-ink-200">
                Mana value: {card.manaValue}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-ink-200">
                {card.setName} ({card.setCode.toUpperCase()})
              </span>
              <span className="rounded-full bg-tide-500/10 px-3 py-1 text-sm font-medium text-tide-100 ring-1 ring-tide-400/20">
                {card.legalities.standard === 'legal' ? 'Standard legal' : 'Not Standard legal'}
              </span>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">Type</p>
              <p className="mt-2 text-base font-medium text-ink-50">{card.typeLine}</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">Oracle text</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-200">
                {card.oracleText || 'No rules text available.'}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">
                  Market price
                </p>
                <dl className="mt-3 space-y-2 text-sm text-ink-200">
                  <div className="flex items-center justify-between gap-3">
                    <dt>Current price</dt>
                    <dd className="font-medium text-ink-50">{formatMarketPriceLabel(card)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Normal</dt>
                    <dd className="font-medium text-ink-50">
                      {formatUsdPrice(card.prices.usd)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Foil</dt>
                    <dd className="font-medium text-ink-50">
                      {formatUsdPrice(card.prices.usdFoil)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">Colors</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(card.colors.length > 0 ? card.colors : ['C']).map((color) => (
                    <span
                      key={color}
                      className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${
                        COLOR_SWATCHES[color]
                      }`}
                    >
                      {COLOR_LABELS[color]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:col-span-2">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">
                  Print info
                </p>
                <dl className="mt-3 grid gap-2 text-sm text-ink-200 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3">
                    <dt>Collector number</dt>
                    <dd className="font-medium text-ink-50">{card.collectorNumber}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Rarity</dt>
                    <dd className="font-medium capitalize text-ink-50">{card.rarity}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Released</dt>
                    <dd className="font-medium text-ink-50">{card.releasedAt}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onAddToMainboard(card)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-tide-500 px-5 py-4 text-sm font-semibold text-white transition hover:bg-tide-400"
              >
                <Plus className="h-4 w-4" />
                Add to Mainboard
              </button>
              <button
                type="button"
                onClick={() => onAddToSideboard(card)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-ember-400/20 bg-ember-500/10 px-5 py-4 text-sm font-semibold text-ember-100 transition hover:border-ember-400/35 hover:bg-ember-500/15"
              >
                <Plus className="h-4 w-4" />
                Add to Sideboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
