import { useState } from 'react'
import { BookOpen, Eye, Layers3 } from 'lucide-react'

import { DECK_FORMAT_OPTIONS } from '@/constants/mtg'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionPanel } from '@/components/ui/SectionPanel'
import type { DeckCardEntry, DeckFormat, DeckStats as DeckStatsShape } from '@/types/deck'
import { countDeckEntries, formatUsdPrice, getCardMarketPriceUsd } from '@/utils/format'

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
  onPreview,
}: {
  title: string
  description: string
  entries: DeckCardEntry[]
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

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {entries.map((entry) => {
          const totalValue = getCardMarketPriceUsd(entry.card)
          const stackDepth = Math.min(entry.quantity, 4)
          const stackOffsets = Array.from({ length: stackDepth - 1 }, (_, index) => stackDepth - index - 1)

          return (
            <article key={`${title}-${entry.card.id}`} className="group space-y-3">
              <button
                type="button"
                onClick={() => onPreview(entry.card)}
                className="w-full text-left"
                aria-label={`Preview ${entry.card.name}`}
              >
                <div className="mx-auto w-full max-w-[26rem] pr-5 pb-5">
                  <div className="relative aspect-[5/7] transition duration-200 group-hover:-translate-y-1">
                    {stackOffsets.map((offset) => (
                      <img
                        key={`${entry.card.id}-stack-${offset}`}
                        src={entry.card.imageUrl}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full rounded-[1.45rem] object-contain shadow-[0_24px_48px_rgba(0,0,0,0.28)]"
                        style={{
                          transform: `translate(${offset * 6}px, ${offset * 6}px)`,
                          opacity: 0.28 + offset * 0.12,
                        }}
                      />
                    ))}

                    <img
                      src={entry.card.imageUrl}
                      alt={entry.card.name}
                      loading="lazy"
                      className="relative z-[1] h-full w-full rounded-[1.45rem] object-contain shadow-[0_28px_60px_rgba(0,0,0,0.46)] transition duration-300 group-hover:scale-[1.015]"
                    />
                  </div>
                </div>
              </button>

              <div className="mx-auto flex w-full max-w-[26rem] items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/20">
                    {totalValue === null ? 'No USD price' : `${formatUsdPrice(totalValue * entry.quantity)} total`}
                  </div>
                  <span className="text-xs font-medium text-ink-400">
                    {entry.quantity} {entry.quantity === 1 ? 'copy' : 'copies'}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-medium text-tide-200">
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </span>
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
                <p className="mt-1 text-sm text-ink-400">Cards render at a larger size for direct reading</p>
              </div>
            </div>

            {(activeSection === 'all' || activeSection === 'mainboard') && (
              <DeckGallerySectionGrid
                title="Mainboard"
                description="Your primary plan rendered as full card art."
                entries={sortedMainboard}
                onPreview={onPreview}
              />
            )}

            {(activeSection === 'all' || activeSection === 'sideboard') && (
              <DeckGallerySectionGrid
                title="Sideboard"
                description="Swap pieces, bullets, and matchup tools shown with full art."
                entries={sortedSideboard}
                onPreview={onPreview}
              />
            )}
          </div>
        )}
      </SectionPanel>
    </div>
  )
}
