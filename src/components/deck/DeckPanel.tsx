import {
  Copy,
  Download,
  Play,
  Redo2,
  Save,
  Share2,
  Undo2,
  Upload,
  WandSparkles,
} from 'lucide-react'

import { DECK_FORMAT_OPTIONS } from '@/constants/mtg'
import { DeckCardList } from '@/components/deck/DeckCardList'
import { SavedDeckList } from '@/components/deck/SavedDeckList'
import { SectionPanel } from '@/components/ui/SectionPanel'
import type {
  DeckCardEntry,
  DeckFormat,
  DeckSection,
  SavedDeck,
} from '@/types/deck'
import type { MagicCard } from '@/types/scryfall'

interface DeckPanelProps {
  className?: string
  deckName: string
  format: DeckFormat
  notes: string
  matchupNotes: string
  budgetTargetUsd: number | null
  mainboard: DeckCardEntry[]
  sideboard: DeckCardEntry[]
  activeDeckId: string | null
  savedDecks: SavedDeck[]
  statusMessage: string | null
  canUndo: boolean
  canRedo: boolean
  onDeckNameChange: (name: string) => void
  onFormatChange: (format: DeckFormat) => void
  onNotesChange: (notes: string) => void
  onMatchupNotesChange: (notes: string) => void
  onBudgetTargetChange: (budgetTargetUsd: number | null) => void
  onSave: () => void
  onImport: () => void
  onCopyDecklist: () => void
  onCopyShareLink: () => void
  onDownloadTxt: () => void
  onDownloadJson: () => void
  onOpenPlaytest: () => void
  onNewDeck: () => void
  onUndo: () => void
  onRedo: () => void
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
  format,
  notes,
  matchupNotes,
  budgetTargetUsd,
  mainboard,
  sideboard,
  activeDeckId,
  savedDecks,
  statusMessage,
  canUndo,
  canRedo,
  onDeckNameChange,
  onFormatChange,
  onNotesChange,
  onMatchupNotesChange,
  onBudgetTargetChange,
  onSave,
  onImport,
  onCopyDecklist,
  onCopyShareLink,
  onDownloadTxt,
  onDownloadJson,
  onOpenPlaytest,
  onNewDeck,
  onUndo,
  onRedo,
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
          subtitle="Tune format rules, import lists, export in multiple forms, and goldfish the build without leaving the editor."
          actions={
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-300">
              {activeDeckId ? 'Saved deck' : 'Draft'}
            </span>
          }
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
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

              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink-200">Format</span>
                <select
                  value={format}
                  onChange={(event) => onFormatChange(event.target.value as DeckFormat)}
                  className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                >
                  {DECK_FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink-200">Budget target (USD)</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={budgetTargetUsd ?? ''}
                onChange={(event) => {
                  const nextValue = event.target.value
                  onBudgetTargetChange(nextValue ? Number.parseFloat(nextValue) : null)
                }}
                placeholder="Optional cap for the total deck value"
                className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <button
                type="button"
                onClick={onSave}
                disabled={!hasCards}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-tide-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-tide-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {activeDeckId ? 'Update Deck' : 'Save Deck'}
              </button>
              <button
                type="button"
                onClick={onImport}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-200 transition hover:border-white/20 hover:bg-ink-700"
              >
                <Upload className="h-4 w-4" />
                Import
              </button>
              <button
                type="button"
                onClick={onOpenPlaytest}
                disabled={!hasCards}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ember-400/20 bg-ember-500/10 px-4 py-3 text-sm font-semibold text-ember-100 transition hover:border-ember-400/35 hover:bg-ember-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play className="h-4 w-4" />
                Playtest
              </button>
              <button
                type="button"
                onClick={onCopyDecklist}
                disabled={!hasCards}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Copy className="h-4 w-4" />
                Copy Text
              </button>
              <button
                type="button"
                onClick={onCopyShareLink}
                disabled={!hasCards}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Share2 className="h-4 w-4" />
                Share Link
              </button>
              <button
                type="button"
                onClick={onDownloadTxt}
                disabled={!hasCards}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                Download TXT
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={onDownloadJson}
                disabled={!hasCards}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                Download JSON
              </button>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Redo2 className="h-4 w-4" />
                Redo
              </button>
              <button
                type="button"
                onClick={onNewDeck}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-200 transition hover:border-white/20 hover:bg-ink-700"
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

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink-200">Deck notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => onNotesChange(event.target.value)}
                  placeholder="Core game plan, flex slots, or metagame notes"
                  className="min-h-32 w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-ink-200">Matchup plans</span>
                <textarea
                  value={matchupNotes}
                  onChange={(event) => onMatchupNotesChange(event.target.value)}
                  placeholder="Example: vs Control +2 Negate, -2 Cut Down"
                  className="min-h-32 w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                />
              </label>
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
          subtitle="Deck snapshots are stored in localStorage with format, notes, budget, and both sections."
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
