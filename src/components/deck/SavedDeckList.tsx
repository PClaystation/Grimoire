import { ExternalLink, FileDiff, FolderOpen, Trash2 } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'
import type { SavedDeck } from '@/types/deck'
import { countDeckEntries, formatSavedDeckDate } from '@/utils/format'

interface SavedDeckListProps {
  decks: SavedDeck[]
  isLoading?: boolean
  emptyDescription?: string
  activeDeckId: string | null
  onLoad: (deckId: string) => void
  onDelete: (deckId: string) => void
  buildViewHref?: (deck: SavedDeck) => string
  buildCompareHref?: (deck: SavedDeck) => string | null
}

export function SavedDeckList({
  decks,
  isLoading = false,
  emptyDescription = 'Save a deck to keep a local snapshot.',
  activeDeckId,
  onLoad,
  onDelete,
  buildViewHref,
  buildCompareHref,
}: SavedDeckListProps) {
  if (isLoading) {
    return (
      <EmptyState
        title="Loading saved decks"
        description="Loading saved decks."
      />
    )
  }

  if (decks.length === 0) {
    return (
      <EmptyState
        title="No saved decks yet"
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="space-y-3">
      {decks.map((deck) => {
        const isActive = deck.id === activeDeckId
        const mainboardCount = countDeckEntries(deck.mainboard)
        const sideboardCount = countDeckEntries(deck.sideboard)
        const viewHref = buildViewHref?.(deck) ?? null
        const compareHref = buildCompareHref?.(deck) ?? null

        return (
          <div
            key={deck.id}
            className={`rounded-[1.4rem] border p-4 transition ${
              isActive
                ? 'border-tide-400/25 bg-tide-500/12 shadow-card'
                : 'border-white/10 bg-ink-800/55 shadow-card'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink-50">{deck.name}</p>
                  {isActive ? (
                    <span className="rounded-full bg-tide-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-tide-100">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-ink-400">
                  {deck.format} • {mainboardCount} main • {sideboardCount} side • saved{' '}
                  {formatSavedDeckDate(deck.updatedAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                {viewHref ? (
                  <a
                    href={viewHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full border border-white/10 p-2 text-ink-300 transition hover:border-white/20 hover:bg-white/5 hover:text-ink-50"
                    aria-label={`Open public page for ${deck.name}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                {compareHref ? (
                  <a
                    href={compareHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full border border-white/10 p-2 text-ink-300 transition hover:border-white/20 hover:bg-white/5 hover:text-ink-50"
                    aria-label={`Compare ${deck.name}`}
                  >
                    <FileDiff className="h-4 w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => onLoad(deck.id)}
                  className="rounded-full border border-white/10 p-2 text-ink-300 transition hover:border-white/20 hover:bg-white/5 hover:text-ink-50"
                  aria-label={`Load ${deck.name}`}
                >
                  <FolderOpen className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(deck.id)}
                  className="rounded-full border border-rose-400/20 p-2 text-rose-300 transition hover:border-rose-400/35 hover:bg-rose-500/10 hover:text-rose-200"
                  aria-label={`Delete ${deck.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
