import { useState } from 'react'
import { BookOpen, Eye, Layers3 } from 'lucide-react'

import { DECK_FORMAT_OPTIONS } from '@/constants/mtg'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionPanel } from '@/components/ui/SectionPanel'
import type { DeckCardEntry, DeckFormat, DeckStats as DeckStatsShape } from '@/types/deck'
import { countDeckEntries, formatMarketPriceLabel, formatTypeLine, formatUsdPrice, getCardMarketPriceUsd } from '@/utils/format'

type DeckGallerySection = 'all' | 'mainboard' | 'sideboard'
type DeckGallerySort = 'CURVE' | 'NAME' | 'PRICE'

interface DeckGalleryViewProps {
  className?: string
  deckName: string
  format: DeckFormat
  mainboard: DeckCardEntry[]
  sideboard: DeckCardEntry[]
  stats: DeckStatsShape
  onPreview: (card: DeckCardEntry['card']) => void
}

function getFormatLabel(format: DeckFormat): string {
  return DECK_FORMAT_OPTIONS.find((option) => option.value === format)?.label ?? format
}

function sortEntries(entries: DeckCardEntry[], sortBy: DeckGallerySort): DeckCardEntry[] {
  const nextEntries = [...entries]

  switch (sortBy) {
    case 'NAME':
      return nextEntries.sort((left, right) => left.card.name.localeCompare(right.card.name))
    case 'PRICE':
      return nextEntries.sort((left, right) => {
        const leftPrice = getCardMarketPriceUsd(left.card) ?? -1
        const rightPrice = getCardMarketPriceUsd(right.card) ?? -1

        if (leftPrice !== rightPrice) {
          return rightPrice - leftPrice
        }

        return left.card.name.localeCompare(right.card.name)
      })
    case 'CURVE':
    default:
      return nextEntries.sort((left, right) => {
        if (left.card.manaValue !== right.card.manaValue) {
          return left.card.manaValue - right.card.manaValue
        }

        return left.card.name.localeCompare(right.card.name)
      })
  }
}

function DeckGallerySectionGrid({
  title,
  description,
  entries,
  badgeTone,
  onPreview,
}: {
  title: string
  description: string
  entries: DeckCardEntry[]
  badgeTone: string
  onPreview: (card: DeckCardEntry['card']) => void
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title={`No cards in ${title.toLowerCase()}`}
        description={description}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl text-ink-50">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-ink-300">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {entries.map((entry) => {
          const totalValue = getCardMarketPriceUsd(entry.card)
          const quantityPips = Math.min(entry.quantity, 6)

          return (
            <article
              key={`${title}-${entry.card.id}`}
              className="group overflow-hidden rounded-[1.6rem] border border-white/10 bg-ink-900/85 shadow-card transition duration-200 hover:-translate-y-1 hover:border-white/15 hover:shadow-panel"
            >
              <button
                type="button"
                onClick={() => onPreview(entry.card)}
                className="w-full text-left"
              >
                <div className="relative aspect-[5/7] overflow-hidden">
                  {entry.quantity > 1 ? (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 translate-x-2 translate-y-2 rounded-[1.3rem] border border-white/8 bg-ink-950/45"
                    />
                  ) : null}
                  {entry.quantity > 2 ? (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 translate-x-4 translate-y-4 rounded-[1.3rem] border border-white/5 bg-ink-950/25"
                    />
                  ) : null}

                  <img
                    src={entry.card.imageUrl}
                    alt={entry.card.name}
                    loading="lazy"
                    className="relative z-[1] h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 top-0 z-[2] flex items-start justify-between bg-gradient-to-b from-ink-900/80 via-ink-900/35 to-transparent p-3 text-white">
                    <div className="space-y-2">
                      <div className="inline-flex min-w-[4.25rem] items-baseline justify-center gap-1 rounded-[1rem] border border-tide-300/30 bg-tide-500/88 px-3 py-2 text-white shadow-lg shadow-tide-950/30">
                        <span className="text-2xl font-black leading-none">{entry.quantity}</span>
                        <span className="text-xs font-bold uppercase tracking-[0.16em]">copies</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: quantityPips }, (_, index) => (
                          <span
                            key={`${entry.card.id}-pip-${index}`}
                            className="h-2.5 w-2.5 rounded-full bg-tide-200/95 ring-2 ring-tide-900/35"
                          />
                        ))}
                        {entry.quantity > quantityPips ? (
                          <span className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white">
                            +{entry.quantity - quantityPips}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${badgeTone}`}>
                      {entry.card.setCode.toUpperCase()}
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-50">{entry.card.name}</p>
                        <p className="mt-1 truncate text-xs text-ink-300">
                          {formatTypeLine(entry.card.typeLine)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-black/40 px-2 py-1 text-[11px] font-semibold text-ink-100">
                        MV {entry.card.manaValue}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              <div className="space-y-3 px-4 py-4">
                <div className="rounded-[1rem] border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                      Quantity
                    </span>
                    <span className="text-lg font-black text-tide-100">{entry.quantity}x</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-950/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-tide-500 to-tide-300"
                      style={{ width: `${Math.min(entry.quantity, 4) / 4 * 100}%` }}
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="truncate text-xs font-medium text-emerald-300">
                        {formatMarketPriceLabel(entry.card)}
                      </p>
                      <p className="mt-1 text-xs text-ink-400">
                        {totalValue === null
                          ? 'No USD price'
                          : `${formatUsdPrice(totalValue * entry.quantity)} total`}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-medium text-tide-200">
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </span>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function DeckGalleryView({
  className,
  deckName,
  format,
  mainboard,
  sideboard,
  stats,
  onPreview,
}: DeckGalleryViewProps) {
  const [activeSection, setActiveSection] = useState<DeckGallerySection>('all')
  const [sortBy, setSortBy] = useState<DeckGallerySort>('CURVE')

  const sortedMainboard = sortEntries(mainboard, sortBy)
  const sortedSideboard = sortEntries(sideboard, sortBy)
  const totalCards = countDeckEntries(mainboard) + countDeckEntries(sideboard)

  return (
    <div className={className}>
      <SectionPanel
        title="Deck View"
        subtitle={`${deckName.trim() || 'Untitled Deck'} • ${getFormatLabel(format)} • ${stats.mainboard.totalCards} mainboard • ${stats.sideboard.totalCards} sideboard`}
        actions={
          <div className="flex max-w-full flex-wrap items-center gap-3">
            <div className="inline-flex rounded-2xl border border-white/10 bg-ink-800/60 p-1">
              {[
                ['all', 'All'],
                ['mainboard', 'Mainboard'],
                ['sideboard', 'Sideboard'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveSection(value as DeckGallerySection)}
                  className={`rounded-[1rem] px-3 py-2 text-sm font-semibold transition ${
                    activeSection === value
                      ? 'bg-tide-500 text-white'
                      : 'text-ink-300 hover:bg-white/5 hover:text-ink-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-ink-300">
              <span className="font-medium">Sort</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as DeckGallerySort)}
                className="rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
              >
                <option value="CURVE">Curve</option>
                <option value="NAME">Name A-Z</option>
                <option value="PRICE">Price high-low</option>
              </select>
            </label>
          </div>
        }
      >
        {totalCards === 0 ? (
          <EmptyState
            title="No deck to display"
            description="Add cards to the mainboard or sideboard and this view will render the deck as a visual gallery."
            icon={<Layers3 className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/10 bg-ink-800/55 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                  <BookOpen className="h-4 w-4 text-tide-300" />
                  Mainboard
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink-50">{stats.mainboard.totalCards}</p>
                <p className="mt-1 text-sm text-ink-400">{stats.mainboard.uniqueCards} unique cards</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-ink-800/55 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                  <Layers3 className="h-4 w-4 text-ember-300" />
                  Sideboard
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink-50">{stats.sideboard.totalCards}</p>
                <p className="mt-1 text-sm text-ink-400">{stats.sideboard.uniqueCards} unique cards</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-ink-800/55 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                  <Eye className="h-4 w-4 text-tide-300" />
                  Estimated Value
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink-50">
                  {formatUsdPrice(stats.totalEstimatedValueUsd)}
                </p>
                <p className="mt-1 text-sm text-ink-400">Click any card to inspect the full art</p>
              </div>
            </div>

            {(activeSection === 'all' || activeSection === 'mainboard') && (
              <DeckGallerySectionGrid
                title="Mainboard"
                description="Your primary plan rendered as full card art."
                entries={sortedMainboard}
                badgeTone="bg-tide-500/20 text-tide-100"
                onPreview={onPreview}
              />
            )}

            {(activeSection === 'all' || activeSection === 'sideboard') && (
              <DeckGallerySectionGrid
                title="Sideboard"
                description="Swap pieces, bullets, and matchup tools shown with full art."
                entries={sortedSideboard}
                badgeTone="bg-ember-500/20 text-ember-100"
                onPreview={onPreview}
              />
            )}
          </div>
        )}
      </SectionPanel>
    </div>
  )
}
