import { ChevronLeft, ChevronRight, LibraryBig } from 'lucide-react'

import { CardGridItem } from '@/components/cards/CardGridItem'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionPanel } from '@/components/ui/SectionPanel'
import { CARD_SORT_OPTIONS } from '@/constants/mtg'
import type { CardSearchFilters, CardSortOption } from '@/types/filters'
import type { MagicCard } from '@/types/scryfall'

interface CardGridProps {
  className?: string
  cards: MagicCard[]
  totalCards: number
  filters: CardSearchFilters
  sortBy: CardSortOption
  currentPage: number
  hasMore: boolean
  isLoading: boolean
  error: string | null
  onSortChange: (sortBy: CardSortOption) => void
  onPreview: (card: MagicCard) => void
  onAddToMainboard: (card: MagicCard) => void
  onAddToSideboard: (card: MagicCard) => void
  onPreviousPage: () => void
  onNextPage: () => void
}

function buildResultDescription(filters: CardSearchFilters): string {
  const detailParts: string[] = [`${filters.format[0].toUpperCase()}${filters.format.slice(1)} paper cards`]

  if (filters.legalityOnly) {
    detailParts.push('legal only')
  }

  const hasActiveTextSearch =
    filters.query.trim() ||
    filters.exactName.trim() ||
    filters.oracleText.trim() ||
    filters.flavorText.trim() ||
    filters.keyword.trim() ||
    filters.artist.trim() ||
    filters.collectorNumber.trim()

  if (hasActiveTextSearch) {
    detailParts.push('text-filtered')
  }

  return detailParts.join(' • ')
}

function buildActiveChips(filters: CardSearchFilters): string[] {
  const chips: string[] = []
  const formatLabel = filters.format[0].toUpperCase() + filters.format.slice(1)

  function pushRangeChip(label: string, minValue: string, maxValue: string) {
    if (minValue.trim() && maxValue.trim()) {
      chips.push(`${label} ${minValue.trim()}-${maxValue.trim()}`)
      return
    }

    if (minValue.trim()) {
      chips.push(`${label} >= ${minValue.trim()}`)
    }

    if (maxValue.trim()) {
      chips.push(`${label} <= ${maxValue.trim()}`)
    }
  }

  chips.push(formatLabel)

  if (filters.legalityOnly) {
    chips.push('Legal only')
  }
  if (filters.query.trim()) {
    chips.push(`Query ${filters.query.trim()}`)
  }
  if (filters.exactName.trim()) {
    chips.push(`Exact ${filters.exactName.trim()}`)
  }
  if (filters.subtype.trim()) {
    chips.push(`Subtype ${filters.subtype.trim()}`)
  }
  if (filters.oracleText.trim()) {
    chips.push(`Rules ${filters.oracleText.trim()}`)
  }
  if (filters.flavorText.trim()) {
    chips.push(`Flavor ${filters.flavorText.trim()}`)
  }
  if (filters.keyword.trim()) {
    chips.push(`Keyword ${filters.keyword.trim()}`)
  }
  if (filters.artist.trim()) {
    chips.push(`Artist ${filters.artist.trim()}`)
  }
  if (filters.collectorNumber.trim()) {
    chips.push(`No. ${filters.collectorNumber.trim()}`)
  }
  if (filters.color !== 'ANY') {
    chips.push(filters.color === 'MULTI' ? 'Multicolor' : filters.color)
  }
  if (filters.colorIdentity !== 'ANY') {
    chips.push(
      filters.colorIdentity === 'MULTI'
        ? 'Identity multicolor'
        : filters.colorIdentity === 'COLORLESS'
          ? 'Identity colorless'
          : `Identity ${filters.colorIdentity}`,
    )
  }
  if (filters.colorCount !== 'ANY') {
    chips.push(`Colors ${filters.colorCount}`)
  }
  if (filters.type !== 'ANY') {
    chips.push(filters.type)
  }
  if (filters.manaValue !== 'ANY') {
    chips.push(`MV ${filters.manaValue}`)
  }
  pushRangeChip('MV', filters.manaValueMin, filters.manaValueMax)
  if (filters.rarity !== 'ANY') {
    chips.push(filters.rarity)
  }
  if (filters.setCode !== 'ANY') {
    chips.push(filters.setCode.toUpperCase())
  }
  if (filters.setType !== 'ANY') {
    chips.push(`Set type ${filters.setType.replace(/_/g, ' ')}`)
  }
  if (filters.layout !== 'ANY') {
    chips.push(filters.layout.replace(/_/g, ' '))
  }
  if (filters.manaProduced !== 'ANY') {
    chips.push(`Produces ${filters.manaProduced}`)
  }
  pushRangeChip('Year', filters.releaseYearStart, filters.releaseYearEnd)
  pushRangeChip('$', filters.priceUsdMin, filters.priceUsdMax)
  pushRangeChip('Pow', filters.powerMin, filters.powerMax)
  pushRangeChip('Tou', filters.toughnessMin, filters.toughnessMax)
  pushRangeChip('Loy', filters.loyaltyMin, filters.loyaltyMax)
  if (filters.legendaryOnly) {
    chips.push('Legendary')
  }
  if (filters.basicOnly) {
    chips.push('Basic')
  }
  if (filters.fullArtOnly) {
    chips.push('Full art')
  }
  if (filters.borderlessOnly) {
    chips.push('Borderless')
  }
  if (filters.showcaseOnly) {
    chips.push('Showcase')
  }
  if (filters.retroFrameOnly) {
    chips.push('Retro frame')
  }

  return chips
}

export function CardGrid({
  className,
  cards,
  totalCards,
  filters,
  sortBy,
  currentPage,
  hasMore,
  isLoading,
  error,
  onSortChange,
  onPreview,
  onAddToMainboard,
  onAddToSideboard,
  onPreviousPage,
  onNextPage,
}: CardGridProps) {
  const subtitle = buildResultDescription(filters)
  const activeChips = buildActiveChips(filters)

  return (
    <div className={className}>
      <SectionPanel
        title="Card Browser"
        subtitle={`${subtitle}. Showing ${cards.length}${totalCards > cards.length ? ` of ${totalCards}` : ''} results.`}
        actions={
          <div className="flex max-w-full flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-ink-300">
              <span className="font-medium">Sort</span>
              <select
                value={sortBy}
                onChange={(event) => onSortChange(event.target.value as CardSortOption)}
                className="rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
              >
                {CARD_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPreviousPage}
                disabled={currentPage <= 1 || isLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm font-medium text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span className="text-sm text-ink-400">Page {currentPage}</span>
              <button
                type="button"
                onClick={onNextPage}
                disabled={!hasMore || isLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm font-medium text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      >
        {activeChips.length > 0 ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-ink-200"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {error ? (
          <EmptyState
            title="Card search failed"
            description={error}
            icon={<LibraryBig className="h-5 w-5" />}
          />
        ) : null}

        {!error && isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="mx-auto w-full max-w-[26rem]"
              >
                <div className="aspect-[5/7] animate-pulse rounded-[1.45rem] bg-ink-700 shadow-card" />
                <div className="mt-4 h-4 animate-pulse rounded-full bg-ink-700" />
                <div className="mt-4 h-10 animate-pulse rounded-2xl bg-ink-700" />
              </div>
            ))}
          </div>
        ) : null}

        {!error && !isLoading && cards.length === 0 ? (
          <EmptyState
            title="No cards matched this search"
            description="Adjust the filters, sort differently, or turn Standard-only mode off to broaden the card pool."
            icon={<LibraryBig className="h-5 w-5" />}
          />
        ) : null}

        {!error && !isLoading && cards.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {cards.map((card) => (
                <CardGridItem
                  key={card.id}
                  card={card}
                  onPreview={onPreview}
                  onAddToMainboard={onAddToMainboard}
                  onAddToSideboard={onAddToSideboard}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3">
              <p className="max-w-2xl text-sm leading-6 text-ink-300">
                Page {currentPage}. Use pagination to continue browsing the matching card pool.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPreviousPage}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm font-medium text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous page
                </button>
                <button
                  type="button"
                  onClick={onNextPage}
                  disabled={!hasMore}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm font-medium text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next page
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </SectionPanel>
    </div>
  )
}
