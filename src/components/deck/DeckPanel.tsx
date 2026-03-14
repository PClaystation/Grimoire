import { Copy, Save, WandSparkles } from 'lucide-react'

import { DeckCardList } from '@/components/deck/DeckCardList'
import { DeckStats } from '@/components/deck/DeckStats'
import { DeckValidationList } from '@/components/deck/DeckValidationList'
import { SavedDeckList } from '@/components/deck/SavedDeckList'
import { SectionPanel } from '@/components/ui/SectionPanel'
import type {
  DeckCardEntry,
  DeckSection,
  DeckStats as DeckStatsShape,
  SavedDeck,
} from '@/types/deck'
import type { MagicCard } from '@/types/scryfall'

interface DeckPanelProps {
  className?: string
  deckName: string
  mainboard: DeckCardEntry[]
  sideboard: DeckCardEntry[]
  stats: DeckStatsShape
  activeDeckId: string | null
  savedDecks: SavedDeck[]
  statusMessage: string | null
  onDeckNameChange: (name: string) => void
  onSave: () => void
  onCopyDecklist: () => void
  onNewDeck: () => void
  onIncrease: (card: MagicCard, section: DeckSection) => void
  onDecrease: (cardId: string, section: DeckSection) => void
  onRemove: (cardId: string, section: DeckSection) => void
  onMove: (cardId: string, from: DeckSection, to: DeckSection) => void
  onLoadDeck: (deckId: string) => void
  onDeleteSavedDeck: (deckId: string) => void
}

export function DeckPanel({
  className,
  deckName,
  mainboard,
  sideboard,
  stats,
  activeDeckId,
  savedDecks,
  statusMessage,
  onDeckNameChange,
  onSave,
  onCopyDecklist,
  onNewDeck,
  onIncrease,
  onDecrease,
  onRemove,
  onMove,
  onLoadDeck,
  onDeleteSavedDeck,
}: DeckPanelProps) {
  const hasCards = mainboard.length > 0 || sideboard.length > 0

  return (
    <aside className={className}>
      <div className="space-y-6 xl:sticky xl:top-6">
        <SectionPanel
          title="Current Deck"
          subtitle="Build the mainboard, manage the sideboard, validate deck structure, and export a clean decklist."
          actions={
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-300">
              {activeDeckId ? 'Saved deck' : 'Draft'}
            </span>
          }
        >
          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink-200">Deck name</span>
              <input
                type="text"
                value={deckName}
                onChange={(event) => onDeckNameChange(event.target.value)}
                placeholder="Azorius Tempo"
                className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onSave}
                disabled={!hasCards}
                className="inline-flex items-center gap-2 rounded-2xl bg-tide-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-tide-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {activeDeckId ? 'Update Deck' : 'Save Deck'}
              </button>
              <button
                type="button"
                onClick={onCopyDecklist}
                disabled={!hasCards}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Copy className="h-4 w-4" />
                Copy Decklist
              </button>
              <button
                type="button"
                onClick={onNewDeck}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-200 transition hover:border-white/20 hover:bg-ink-700"
              >
                <WandSparkles className="h-4 w-4" />
                New Deck
              </button>
            </div>

            {statusMessage ? (
              <p className="rounded-2xl border border-tide-400/20 bg-tide-500/10 px-4 py-3 text-sm text-tide-100">
                {statusMessage}
              </p>
            ) : null}

            <DeckStats stats={stats} />

            <div className="space-y-3">
              <div>
                <h3 className="font-display text-xl text-ink-50">Validation</h3>
                <p className="mt-1 max-w-prose text-sm leading-6 text-ink-300">
                  Mainboard size, sideboard size, copy limits, and Standard legality are checked live.
                </p>
              </div>
              <DeckValidationList issues={stats.validation} />
            </div>

            <DeckCardList
              title="Mainboard"
              description="Primary game plan cards. Use the move action to send single copies into the sideboard."
              section="mainboard"
              cards={mainboard}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
              onRemove={onRemove}
              onMove={onMove}
            />

            <DeckCardList
              title="Sideboard"
              description="Flexible matchup cards. Move them back to mainboard one copy at a time when tuning."
              section="sideboard"
              cards={sideboard}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
              onRemove={onRemove}
              onMove={onMove}
            />
          </div>
        </SectionPanel>

        <SectionPanel
          title="Saved Decks"
          subtitle="Deck snapshots are stored in localStorage and now preserve both sections."
        >
          <SavedDeckList
            decks={savedDecks}
            activeDeckId={activeDeckId}
            onLoad={onLoadDeck}
            onDelete={onDeleteSavedDeck}
          />
        </SectionPanel>
      </div>
    </aside>
  )
}
