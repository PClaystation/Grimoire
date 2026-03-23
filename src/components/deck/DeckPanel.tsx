import { useEffect, useRef, useState } from 'react'
import {
  Copy,
  Download,
  ExternalLink,
  MoreHorizontal,
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
import { DeckStats } from '@/components/deck/DeckStats'
import { SavedDeckList } from '@/components/deck/SavedDeckList'
import { SectionPanel } from '@/components/ui/SectionPanel'
import type {
  DeckCardEntry,
  DeckFormat,
  DeckSection,
  DeckStats as DeckStatsShape,
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
  stats: DeckStatsShape
  activeDeckId: string | null
  savedDecks: SavedDeck[]
  isSavedDecksLoading: boolean
  savedDecksLabel: string
  savedDecksSubtitle: string
  savedDecksEmptyDescription: string
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
  onCopyPublicPageLink: () => void
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
  publicDeckPageHref: string | null
  buildSavedDeckViewHref: (deck: SavedDeck) => string
  buildSavedDeckCompareHref: (deck: SavedDeck) => string | null
}

function DeckToolsMenu({
  hasCards,
  onCopyDecklist,
  onCopyShareLink,
  onCopyPublicPageLink,
  onDownloadTxt,
  onDownloadJson,
  publicDeckPageHref,
}: {
  hasCards: boolean
  onCopyDecklist: () => void
  onCopyShareLink: () => void
  onCopyPublicPageLink: () => void
  onDownloadTxt: () => void
  onDownloadJson: () => void
  publicDeckPageHref: string | null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current || !(event.target instanceof Node)) {
        return
      }

      if (!menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function closeMenu() {
    setIsOpen(false)
  }

  function runAction(action: () => void) {
    action()
    closeMenu()
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-ink-200 transition hover:border-white/20 hover:bg-ink-700"
      >
        <MoreHorizontal className="h-4 w-4" />
        Tools
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-64 rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,31,39,0.98),rgba(10,22,29,0.99))] p-2 shadow-[0_22px_60px_-26px_rgba(7,19,27,0.92)] ring-1 ring-white/5"
        >
          <div className="grid gap-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => runAction(onCopyDecklist)}
              disabled={!hasCards}
              className="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold text-ink-100 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-4 w-4 shrink-0 text-tide-200" />
              Copy decklist
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => runAction(onCopyShareLink)}
              disabled={!hasCards}
              className="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold text-ink-100 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Share2 className="h-4 w-4 shrink-0 text-tide-200" />
              Copy import link
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => runAction(onCopyPublicPageLink)}
              disabled={!hasCards}
              className="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold text-ink-100 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4 shrink-0 text-tide-200" />
              Copy public page link
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (publicDeckPageHref) {
                  window.open(publicDeckPageHref, '_blank', 'noopener,noreferrer')
                }
                closeMenu()
              }}
              disabled={!publicDeckPageHref}
              className="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold text-ink-100 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4 shrink-0 text-tide-200" />
              Open public page
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => runAction(onDownloadTxt)}
              disabled={!hasCards}
              className="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold text-ink-100 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4 shrink-0 text-tide-200" />
              Download TXT
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => runAction(onDownloadJson)}
              disabled={!hasCards}
              className="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold text-ink-100 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4 shrink-0 text-tide-200" />
              Download JSON
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
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
  stats,
  activeDeckId,
  savedDecks,
  isSavedDecksLoading,
  savedDecksLabel,
  savedDecksSubtitle,
  savedDecksEmptyDescription,
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
  onCopyPublicPageLink,
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
  publicDeckPageHref,
  buildSavedDeckViewHref,
  buildSavedDeckCompareHref,
}: DeckPanelProps) {
  const hasCards = mainboard.length > 0 || sideboard.length > 0
  const [activePanel, setActivePanel] = useState<'deck' | 'analysis' | 'saved'>('deck')

  return (
    <aside className={className}>
      <div className="space-y-6 xl:sticky xl:top-6">
        <SectionPanel
          title="Deck Workspace"
          subtitle="Switch between building, analysis, and saved decks without stacking every panel at once."
        >
          <div className="inline-flex w-full rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-1.5">
            {[
              { id: 'deck', label: 'Deck' },
              { id: 'analysis', label: `Analysis ${hasCards ? `(${stats.rating.score})` : ''}`.trim() },
              { id: 'saved', label: 'Saved' },
            ].map((panel) => (
              <button
                key={panel.id}
                type="button"
                onClick={() => setActivePanel(panel.id as typeof activePanel)}
                className={`flex-1 rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition ${
                  activePanel === panel.id
                    ? 'bg-tide-500 text-white shadow-[0_12px_24px_-16px_rgba(29,150,167,0.9)]'
                    : 'text-ink-300 hover:bg-white/5 hover:text-ink-50'
                }`}
              >
                {panel.label}
              </button>
            ))}
          </div>
        </SectionPanel>

        {activePanel === 'deck' ? (
          <SectionPanel
            title="Current Deck"
            subtitle="Build, save, and test from one panel."
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
                  placeholder="Optional total value cap"
                  className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                <DeckToolsMenu
                  hasCards={hasCards}
                  onCopyDecklist={onCopyDecklist}
                  onCopyShareLink={onCopyShareLink}
                  onCopyPublicPageLink={onCopyPublicPageLink}
                  onDownloadTxt={onDownloadTxt}
                  onDownloadJson={onDownloadJson}
                  publicDeckPageHref={publicDeckPageHref}
                />
              </div>

              {statusMessage ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="rounded-2xl border border-tide-400/20 bg-tide-500/10 px-4 py-3 text-sm text-tide-100"
                >
                  {statusMessage}
                </p>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-ink-200">Deck notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => onNotesChange(event.target.value)}
                    placeholder="Game plan or notes"
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
                description="Primary game-plan cards."
                section="mainboard"
                cards={mainboard}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
                onRemove={onRemove}
                onMove={onMove}
              />

              <DeckCardList
                title="Sideboard"
                description="Matchup cards and flex slots."
                section="sideboard"
                cards={sideboard}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
                onRemove={onRemove}
                onMove={onMove}
              />
            </div>
          </SectionPanel>
        ) : null}

        {activePanel === 'analysis' ? (
          <SectionPanel
            title="Deck Analysis"
            subtitle="Fundamentals-based rating, structure checks, and actionable tuning feedback."
          >
            <DeckStats stats={stats} />
          </SectionPanel>
        ) : null}

        {activePanel === 'saved' ? (
          <SectionPanel
            title="Saved Decks"
            subtitle={savedDecksSubtitle}
            actions={
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-300">
                {savedDecksLabel}
              </span>
            }
          >
            <SavedDeckList
              decks={savedDecks}
              isLoading={isSavedDecksLoading}
              emptyDescription={savedDecksEmptyDescription}
              activeDeckId={activeDeckId}
              onLoad={onLoadDeck}
              onDelete={onDeleteSavedDeck}
              buildViewHref={buildSavedDeckViewHref}
              buildCompareHref={buildSavedDeckCompareHref}
            />
          </SectionPanel>
        ) : null}
      </div>
    </aside>
  )
}
