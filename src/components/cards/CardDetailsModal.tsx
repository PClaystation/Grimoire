import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'

import { fetchCardPrints } from '@/api/scryfall'
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
  const [prints, setPrints] = useState<MagicCard[]>([])
  const [selectedPrintId, setSelectedPrintId] = useState<string | null>(null)
  const [isLoadingPrints, setIsLoadingPrints] = useState(false)
  const [loadedOracleId, setLoadedOracleId] = useState<string | null>(null)

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

  useEffect(() => {
    if (!card?.oracleId) {
      return
    }

    const controller = new AbortController()

    void (async () => {
      setIsLoadingPrints(true)

      try {
        const nextPrints = await fetchCardPrints(card.oracleId!, controller.signal)

        if (controller.signal.aborted) {
          return
        }

        setPrints(nextPrints.length > 0 ? nextPrints : [card])
        setLoadedOracleId(card.oracleId)
      } catch {
        if (!controller.signal.aborted) {
          setPrints([card])
          setLoadedOracleId(card.oracleId)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPrints(false)
        }
      }
    })()

    return () => {
      controller.abort()
    }
  }, [card])

  if (!card) {
    return null
  }

  const visiblePrints =
    card.oracleId && loadedOracleId === card.oracleId ? prints : card.oracleId ? [] : [card]
  const activeCard = visiblePrints.find((print) => print.id === selectedPrintId) ?? card

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/92 p-4"
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
            <img
              src={activeCard.largeImageUrl}
              alt={activeCard.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-ink-200">
                Mana cost: {formatManaCost(activeCard.manaCost)}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-ink-200">
                Mana value: {activeCard.manaValue}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-ink-200">
                {activeCard.setName} ({activeCard.setCode.toUpperCase()})
              </span>
              <span className="rounded-full bg-tide-500/10 px-3 py-1 text-sm font-medium text-tide-100 ring-1 ring-tide-400/20">
                {activeCard.legalities.standard === 'legal'
                  ? 'Standard legal'
                  : 'Not Standard legal'}
              </span>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">Type</p>
              <p className="mt-2 text-base font-medium text-ink-50">{activeCard.typeLine}</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">Oracle text</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-200">
                {activeCard.oracleText || 'No rules text.'}
              </p>
            </div>

            {visiblePrints.length > 1 || isLoadingPrints ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">
                    Print selection
                  </p>
                  <p className="text-xs text-ink-400">
                    {isLoadingPrints ? 'Loading prints...' : `${visiblePrints.length} printings`}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {visiblePrints.slice(0, 18).map((print) => (
                    <button
                      key={print.id}
                      type="button"
                      onClick={() => setSelectedPrintId(print.id)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                        print.id === activeCard.id
                          ? 'bg-tide-500/15 text-tide-100 ring-tide-400/30'
                          : 'bg-white/5 text-ink-200 ring-white/10 hover:bg-white/10'
                      }`}
                    >
                      {print.setCode.toUpperCase()} • {print.rarity}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">
                  Market price
                </p>
                <dl className="mt-3 space-y-2 text-sm text-ink-200">
                  <div className="flex items-center justify-between gap-3">
                    <dt>Current price</dt>
                    <dd className="font-medium text-ink-50">
                      {formatMarketPriceLabel(activeCard)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Normal</dt>
                    <dd className="font-medium text-ink-50">
                      {formatUsdPrice(activeCard.prices.usd)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Foil</dt>
                    <dd className="font-medium text-ink-50">
                      {formatUsdPrice(activeCard.prices.usdFoil)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">Colors</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(activeCard.colors.length > 0 ? activeCard.colors : ['C']).map((color) => (
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
                    <dd className="font-medium text-ink-50">{activeCard.collectorNumber}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Rarity</dt>
                    <dd className="font-medium capitalize text-ink-50">{activeCard.rarity}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Released</dt>
                    <dd className="font-medium text-ink-50">{activeCard.releasedAt}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-ink-300">
                Most cards belong in your deck. Use the smaller sideboard action only for matchup
                swaps.
              </p>
              <button
                type="button"
                onClick={() => onAddToMainboard(activeCard)}
                className="inline-flex w-full items-center justify-between gap-4 rounded-[1.75rem] bg-gradient-to-r from-tide-500 via-cyan-500 to-sky-400 px-5 py-4 text-left text-white shadow-lg shadow-tide-950/30 ring-1 ring-white/15 transition hover:from-tide-400 hover:via-cyan-400 hover:to-sky-300"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/15">
                    <Plus className="h-5 w-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-base font-semibold">Add to Deck</span>
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/75">
                      Mainboard
                    </span>
                  </span>
                </span>
                <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-white/80 sm:block">
                  Primary action
                </span>
              </button>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onAddToSideboard(activeCard)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-ember-400/25 bg-ember-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-ember-100 transition hover:border-ember-400/40 hover:bg-ember-500/15"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add to Sideboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
