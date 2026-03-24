import { useState } from 'react'

import { createDeckBuilderActions } from '@/app/createDeckBuilderActions'
import { useSharedDeckQueryLoader } from '@/app/useSharedDeckQueryLoader'
import { useAuth } from '@/auth/useAuth'
import { ContinentalAccountPanel } from '@/components/auth/ContinentalAccountPanel'
import { CardDetailsModal } from '@/components/cards/CardDetailsModal'
import { CardGrid } from '@/components/cards/CardGrid'
import { DeckGalleryView } from '@/components/deck/DeckGalleryView'
import { DeckImportModal } from '@/components/deck/DeckImportModal'
import { DeckPanel } from '@/components/deck/DeckPanel'
import { PlaytestModal } from '@/components/deck/PlaytestModal'
import { FilterBar } from '@/components/filters/FilterBar'
import { AppHeader } from '@/components/layout/AppHeader'
import { SiteNav } from '@/components/layout/SiteNav'
import { DEFAULT_FILTERS, normalizeCardSearchFilters } from '@/constants/mtg'
import { useDeckRepository } from '@/decks/useDeckRepository'
import { useCardSearch } from '@/hooks/useCardSearch'
import { useCardSets } from '@/hooks/useCardSets'
import { useAppSettings } from '@/settings/useAppSettings'
import { useDeckBuilder } from '@/state/useDeckBuilder'
import { useSavedDecks } from '@/state/useSavedDecks'
import type { CardSearchFilters, CardSortOption } from '@/types/filters'
import type { MagicCard } from '@/types/scryfall'
import { getDeckStats } from '@/utils/deckStats'
import { formatDateTimeLabel } from '@/utils/format'

function App() {
  const [draftFilters, setDraftFilters] = useState<CardSearchFilters>(() =>
    normalizeCardSearchFilters(DEFAULT_FILTERS),
  )
  const [appliedFilters, setAppliedFilters] = useState<CardSearchFilters>(() =>
    normalizeCardSearchFilters(DEFAULT_FILTERS),
  )
  const [selectedCard, setSelectedCard] = useState<MagicCard | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<CardSortOption>('RELEVANCE')
  const [currentPage, setCurrentPage] = useState(1)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [isPlaytestOpen, setIsPlaytestOpen] = useState(false)
  const { settings, updateSettings } = useAppSettings()
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'browser' | 'deck'>(
    () => settings.defaultDeckWorkspaceTab,
  )
  const {
    status: authStatus,
    user: authUser,
    errorMessage: authErrorMessage,
  } = useAuth()
  const deckRepository = useDeckRepository()

  const {
    mainboard,
    sideboard,
    deckDraft,
    deckName,
    setDeckName,
    format,
    setDeckFormat,
    notes,
    setNotes,
    matchupNotes,
    setMatchupNotes,
    budgetTargetUsd,
    setBudgetTargetUsd,
    activeDeckId,
    addCard,
    decreaseCard,
    removeCard,
    moveCard,
    resetDeck,
    loadDeck,
    replaceDeck,
    syncSavedDeck,
    detachSavedDeck,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDeckBuilder()
  const {
    savedDecks,
    isLoading: isSavedDecksLoading,
    lastSyncedAt,
    syncState,
    presentation: savedDecksPresentation,
    saveDeck,
    deleteDeck,
  } = useSavedDecks(deckRepository)
  const {
    cards,
    totalCards,
    hasMore,
    isLoading: isSearching,
    error: searchError,
  } = useCardSearch(appliedFilters, sortBy, currentPage)
  const { sets, isLoading: areSetsLoading, error: setsError } = useCardSets()

  const deckStats = getDeckStats(mainboard, sideboard, format, budgetTargetUsd)
  const isCloudSyncEnabled = syncState.mode === 'cloud'
  const savedDecksSubtitleParts = [savedDecksPresentation.subtitle]
  if (isCloudSyncEnabled && lastSyncedAt) {
    savedDecksSubtitleParts.push(`Last synced ${formatDateTimeLabel(lastSyncedAt)}.`)
  }
  if (isCloudSyncEnabled && syncState.message) {
    savedDecksSubtitleParts.push(syncState.message)
  }
  const savedDecksSubtitle = savedDecksSubtitleParts.join(' ')
  const hasCurrentDeckCards = mainboard.length > 0 || sideboard.length > 0

  useSharedDeckQueryLoader({
    replaceDeck,
    setDraftFilters,
    setAppliedFilters,
    setCurrentPage,
    setStatusMessage,
  })

  const {
    buildDeckViewHref,
    buildDeckCompareHref,
    handleApplyFilters,
    handleResetFilters,
    handleDeckFormatChange,
    handleSaveDeck,
    handleCopyDecklist,
    handleCopyShareLink,
    handleCopyPublicDeckPageLink,
    handleDownloadTxt,
    handleDownloadJson,
    handleImportDeck,
    handleLoadDeck,
    handleDeleteSavedDeck,
    handleStartNewDeck,
    handleAddToMainboard,
    handleAddToSideboard,
    handleBudgetTargetChange,
    handleActiveWorkspaceTabChange,
  } = createDeckBuilderActions({
    deckDraft,
    deckName,
    format,
    notes,
    matchupNotes,
    activeDeckId,
    hasCurrentDeckCards,
    mainboard,
    sideboard,
    savedDecks,
    activeWorkspaceTab,
    settings,
    updateSettings,
    syncState,
    saveDeck,
    deleteDeck,
    replaceDeck,
    loadDeck,
    resetDeck,
    syncSavedDeck,
    detachSavedDeck,
    addCard,
    setDeckFormat,
    setBudgetTargetUsd,
    setDraftFilters,
    setAppliedFilters,
    setCurrentPage,
    setSortBy,
    setStatusMessage,
    setIsImportOpen,
    setIsImporting,
    setImportError,
    setActiveWorkspaceTab,
  })

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-6 text-ink-50 sm:px-6 lg:px-10 lg:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,150,167,0.08),transparent_18%),radial-gradient(circle_at_top_right,rgba(223,107,11,0.08),transparent_14%)]" />
      <div className="relative mx-auto flex w-full max-w-[1520px] flex-col gap-6">
        <SiteNav />

        {settings.showDeckbuilderHero ? (
          <AppHeader
            mainboardCards={deckStats.mainboard.totalCards}
            sideboardCards={deckStats.sideboard.totalCards}
            savedDecks={savedDecks.length}
          />
        ) : null}

        {settings.showAccountStatusPanel ? (
          <ContinentalAccountPanel
            status={authStatus}
            user={authUser}
            errorMessage={authErrorMessage}
            syncState={syncState}
          />
        ) : null}

        <section className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.95),rgba(11,24,31,0.99))] px-4 py-4 shadow-panel ring-1 ring-white/5 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-1.5">
              <button
                type="button"
                onClick={() => handleActiveWorkspaceTabChange('browser')}
                className={`rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition ${
                  activeWorkspaceTab === 'browser'
                    ? 'bg-tide-500 text-white shadow-[0_12px_24px_-16px_rgba(29,150,167,0.9)]'
                    : 'text-ink-300 hover:bg-white/5 hover:text-ink-50'
                }`}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => handleActiveWorkspaceTabChange('deck')}
                className={`rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition ${
                  activeWorkspaceTab === 'deck'
                    ? 'bg-tide-500 text-white shadow-[0_12px_24px_-16px_rgba(29,150,167,0.9)]'
                    : 'text-ink-300 hover:bg-white/5 hover:text-ink-50'
                }`}
              >
                Gallery
              </button>
            </div>

            {settings.showWorkspaceHelperText ? (
              <p className="max-w-2xl text-sm leading-6 text-ink-300">
                {activeWorkspaceTab === 'browser'
                  ? 'Search first, deck panel second.'
                  : 'Review the list as full-card previews.'}
              </p>
            ) : null}
          </div>
        </section>

        {activeWorkspaceTab === 'browser' ? (
          <FilterBar
            filters={draftFilters}
            onFiltersChange={setDraftFilters}
            onApply={() => handleApplyFilters(draftFilters)}
            onReset={handleResetFilters}
            sets={sets}
            setsError={setsError}
            isSearching={isSearching}
            areSetsLoading={areSetsLoading}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_28rem] 2xl:grid-cols-[minmax(0,1.2fr)_30rem]">
          <DeckPanel
            className="order-2 xl:order-2"
            deckName={deckName}
            format={format}
            notes={notes}
            matchupNotes={matchupNotes}
            budgetTargetUsd={budgetTargetUsd}
            mainboard={mainboard}
            sideboard={sideboard}
            stats={deckStats}
            activeDeckId={activeDeckId}
            savedDecks={savedDecks}
            isSavedDecksLoading={isSavedDecksLoading}
            savedDecksLabel={savedDecksPresentation.badgeLabel}
            savedDecksSubtitle={savedDecksSubtitle}
            savedDecksEmptyDescription={savedDecksPresentation.emptyStateDescription}
            statusMessage={statusMessage}
            canUndo={canUndo}
            canRedo={canRedo}
            onDeckNameChange={setDeckName}
            onFormatChange={handleDeckFormatChange}
            onNotesChange={setNotes}
            onMatchupNotesChange={setMatchupNotes}
            onBudgetTargetChange={handleBudgetTargetChange}
            onSave={handleSaveDeck}
            onImport={() => setIsImportOpen(true)}
            onCopyDecklist={handleCopyDecklist}
            onCopyShareLink={handleCopyShareLink}
            onCopyPublicPageLink={handleCopyPublicDeckPageLink}
            onDownloadTxt={handleDownloadTxt}
            onDownloadJson={handleDownloadJson}
            onOpenPlaytest={() => setIsPlaytestOpen(true)}
            onNewDeck={handleStartNewDeck}
            onUndo={undo}
            onRedo={redo}
            onIncrease={addCard}
            onDecrease={decreaseCard}
            onRemove={removeCard}
            onMove={moveCard}
            onLoadDeck={handleLoadDeck}
            onDeleteSavedDeck={handleDeleteSavedDeck}
            publicDeckPageHref={hasCurrentDeckCards ? buildDeckViewHref(deckDraft) : null}
            buildSavedDeckViewHref={buildDeckViewHref}
            buildSavedDeckCompareHref={(savedDeck) =>
              hasCurrentDeckCards ? buildDeckCompareHref(deckDraft, savedDeck) : null
            }
          />

          {activeWorkspaceTab === 'browser' ? (
            <CardGrid
              className="order-1 xl:order-1"
              cards={cards}
              totalCards={totalCards}
              filters={appliedFilters}
              sortBy={sortBy}
              currentPage={currentPage}
              hasMore={hasMore}
              isLoading={isSearching}
              error={searchError}
              onSortChange={setSortBy}
              onPreview={setSelectedCard}
              onAddToMainboard={handleAddToMainboard}
              onAddToSideboard={handleAddToSideboard}
              onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNextPage={() => setCurrentPage((page) => page + 1)}
            />
          ) : (
            <DeckGalleryView
              className="order-1 xl:order-1"
              deckName={deckName}
              format={format}
              mainboard={mainboard}
              sideboard={sideboard}
              stats={deckStats}
              onPreview={setSelectedCard}
            />
          )}
        </div>
      </div>

      <CardDetailsModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onAddToMainboard={handleAddToMainboard}
        onAddToSideboard={handleAddToSideboard}
      />

      <DeckImportModal
        isOpen={isImportOpen}
        isImporting={isImporting}
        error={importError}
        onClose={() => {
          setIsImportOpen(false)
          setImportError(null)
        }}
        onImport={handleImportDeck}
      />

      <PlaytestModal
        isOpen={isPlaytestOpen}
        deckName={deckName}
        format={format}
        mainboard={mainboard}
        onClose={() => setIsPlaytestOpen(false)}
      />
    </div>
  )
}

export default App
