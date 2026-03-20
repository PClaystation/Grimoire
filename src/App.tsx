import { useEffect, useRef, useState } from 'react'

import { useAuth } from '@/auth/useAuth'
import { lookupDeckCards } from '@/api/scryfall'
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
import { useDeckBuilder } from '@/state/useDeckBuilder'
import { useSavedDecks } from '@/state/useSavedDecks'
import type { DeckFormat } from '@/types/deck'
import type { CardSearchFilters, CardSortOption } from '@/types/filters'
import type { MagicCard } from '@/types/scryfall'
import { copyTextToClipboard } from '@/utils/clipboard'
import { getDeckImportIdentifiers, parseDeckImport, buildImportedDeck } from '@/utils/deckImport'
import { buildDeckExportJson, buildDecklistText, buildPortableDeckPayload } from '@/utils/decklist'
import { getDeckStats } from '@/utils/deckStats'
import { countDeckEntries, formatDateTimeLabel } from '@/utils/format'
import { decodeDeckSharePayload, encodeDeckSharePayload } from '@/utils/share'

async function resolveImportedDeck(input: string, fallbackFormat: DeckFormat) {
  const parsedImport = parseDeckImport(input)
  const identifiers = getDeckImportIdentifiers(parsedImport)
  const resolvedCards = await lookupDeckCards(identifiers)
  return buildImportedDeck(parsedImport, resolvedCards, fallbackFormat)
}

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
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'browser' | 'deck'>('browser')
  const hasProcessedSharedDeckRef = useRef(false)
  const {
    status: authStatus,
    user: authUser,
    errorMessage: authErrorMessage,
  } = useAuth()
  const deckRepository = useDeckRepository()
  const normalizedDraftFilters = normalizeCardSearchFilters(draftFilters)
  const normalizedAppliedFilters = normalizeCardSearchFilters(appliedFilters)

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
  } = useCardSearch(normalizedAppliedFilters, sortBy, currentPage)
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

  function syncFiltersToFormat(nextFormat: DeckFormat) {
    setDraftFilters((currentFilters) => ({
      ...normalizeCardSearchFilters(currentFilters),
      format: nextFormat,
    }))
    setAppliedFilters((currentFilters) => ({
      ...normalizeCardSearchFilters(currentFilters),
      format: nextFormat,
    }))
    setCurrentPage(1)
  }

  function downloadFile(filename: string, content: string, contentType: string) {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (hasProcessedSharedDeckRef.current) {
      return
    }

    hasProcessedSharedDeckRef.current = true
    const deckParam = new URLSearchParams(window.location.search).get('deck')

    if (!deckParam) {
      return
    }

    const sharedPayload = decodeDeckSharePayload(deckParam)

    if (!sharedPayload) {
      setStatusMessage('Unable to decode the shared deck link.')
      return
    }

    let isCancelled = false

    void (async () => {
      try {
        const importedDeck = await resolveImportedDeck(
          JSON.stringify(sharedPayload),
          sharedPayload.format,
        )

        if (isCancelled) {
          return
        }

        replaceDeck(importedDeck.deck)
        setDraftFilters((currentFilters) => ({
          ...normalizeCardSearchFilters(currentFilters),
          format: importedDeck.deck.format,
        }))
        setAppliedFilters((currentFilters) => ({
          ...normalizeCardSearchFilters(currentFilters),
          format: importedDeck.deck.format,
        }))
        setCurrentPage(1)

        const suffix =
          importedDeck.missingCards.length > 0
            ? ` Missing ${importedDeck.missingCards.length} unresolved cards.`
            : ''

        setStatusMessage(`Loaded shared deck "${importedDeck.deck.name}".${suffix}`)
      } catch {
        if (!isCancelled) {
          setStatusMessage('Unable to load the shared deck from Scryfall.')
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [replaceDeck])

  function handleApplyFilters() {
    setCurrentPage(1)
    setAppliedFilters(normalizeCardSearchFilters(normalizedDraftFilters))
  }

  function handleResetFilters() {
    const nextFilters: CardSearchFilters = {
      ...normalizeCardSearchFilters(DEFAULT_FILTERS),
      format,
    }

    setDraftFilters(nextFilters)
    setAppliedFilters(nextFilters)
    setCurrentPage(1)
    setSortBy('RELEVANCE')
  }

  function handleDeckFormatChange(nextFormat: DeckFormat) {
    setDeckFormat(nextFormat)
    syncFiltersToFormat(nextFormat)
  }

  function handleSaveDeck() {
    if (mainboard.length === 0 && sideboard.length === 0) {
      return
    }

    void (async () => {
      try {
        const result = await saveDeck(deckDraft)
        syncSavedDeck(result.savedDeck)
        setStatusMessage(
          result.syncState.mode === 'cloud'
            ? result.syncState.health === 'ready'
              ? `Saved and synced "${result.savedDeck.name}" to your Continental ID account.`
              : `Saved "${result.savedDeck.name}". ${result.syncState.message ?? 'Cloud sync will retry automatically.'}`
            : `Saved "${result.savedDeck.name}" to local browser storage.`,
        )
      } catch (saveError) {
        setStatusMessage(
          saveError instanceof Error
            ? saveError.message
            : 'Unable to save this deck in local browser storage.',
        )
      }
    })()
  }

  async function handleCopyDecklist() {
    if (mainboard.length === 0 && sideboard.length === 0) {
      return
    }

    const decklist = buildDecklistText(
      deckName,
      format,
      mainboard,
      sideboard,
      notes,
      matchupNotes,
    )

    try {
      const didCopy = await copyTextToClipboard(decklist)
      setStatusMessage(
        didCopy
          ? 'Copied decklist to the clipboard.'
          : 'Unable to copy decklist in this browser.',
      )
    } catch {
      setStatusMessage('Unable to copy decklist in this browser.')
    }
  }

  async function handleCopyShareLink() {
    if (mainboard.length === 0 && sideboard.length === 0) {
      return
    }

    const payload = buildPortableDeckPayload(deckDraft)
    const url = new URL(window.location.href)
    url.searchParams.set('deck', encodeDeckSharePayload(payload))

    try {
      const didCopy = await copyTextToClipboard(url.toString())
      setStatusMessage(
        didCopy
          ? 'Copied a shareable deck link to the clipboard.'
          : 'Unable to copy the share link in this browser.',
      )
    } catch {
      setStatusMessage('Unable to copy the share link in this browser.')
    }
  }

  function handleDownloadTxt() {
    if (mainboard.length === 0 && sideboard.length === 0) {
      return
    }

    downloadFile(
      `${(deckName.trim() || 'deck').replace(/\s+/g, '-').toLowerCase()}.txt`,
      buildDecklistText(deckName, format, mainboard, sideboard, notes, matchupNotes),
      'text/plain;charset=utf-8',
    )

    setStatusMessage('Downloaded a text export of the current deck.')
  }

  function handleDownloadJson() {
    if (mainboard.length === 0 && sideboard.length === 0) {
      return
    }

    downloadFile(
      `${(deckName.trim() || 'deck').replace(/\s+/g, '-').toLowerCase()}.json`,
      buildDeckExportJson(deckDraft),
      'application/json;charset=utf-8',
    )

    setStatusMessage('Downloaded a JSON export of the current deck.')
  }

  async function handleImportDeck(input: string) {
    setIsImporting(true)
    setImportError(null)

    try {
      const importedDeck = await resolveImportedDeck(input, format)
      const importedMainboardCount = countDeckEntries(importedDeck.deck.mainboard)
      const importedSideboardCount = countDeckEntries(importedDeck.deck.sideboard)

      replaceDeck(importedDeck.deck)
      syncFiltersToFormat(importedDeck.deck.format)
      setIsImportOpen(false)

      const warningParts: string[] = []

      if (importedDeck.missingCards.length > 0) {
        warningParts.push(`${importedDeck.missingCards.length} unresolved cards`)
      }

      if (importedDeck.warnings.length > 0) {
        warningParts.push(`${importedDeck.warnings.length} skipped lines`)
      }

      setStatusMessage(
        `Imported "${importedDeck.deck.name}" with ${importedMainboardCount} mainboard cards and ${importedSideboardCount} sideboard cards.${warningParts.length > 0 ? ` ${warningParts.join(', ')}.` : ''}`,
      )
    } catch (importDeckError) {
      setImportError(
        importDeckError instanceof Error
          ? importDeckError.message
          : 'Unable to import that decklist.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  function handleLoadDeck(deckId: string) {
    const deckToLoad = savedDecks.find((deck) => deck.id === deckId)

    if (!deckToLoad) {
      return
    }

    loadDeck(deckToLoad)
    syncFiltersToFormat(deckToLoad.format)
    setStatusMessage(`Loaded "${deckToLoad.name}".`)
  }

  function handleDeleteSavedDeck(deckId: string) {
    const deckToDelete = savedDecks.find((deck) => deck.id === deckId)

    void (async () => {
      try {
        const result = await deleteDeck(deckId)

        if (activeDeckId === deckId) {
          detachSavedDeck()
        }

        if (deckToDelete) {
          setStatusMessage(
            result.syncState.mode === 'cloud'
              ? result.syncState.health === 'ready'
                ? `Deleted and synced "${deckToDelete.name}" across your Continental ID deck list.`
                : `Deleted "${deckToDelete.name}". ${result.syncState.message ?? 'Cloud sync will retry automatically.'}`
              : `Deleted "${deckToDelete.name}".`,
          )
        }
      } catch (deleteError) {
        setStatusMessage(
          deleteError instanceof Error
            ? deleteError.message
            : 'Unable to delete that saved deck right now.',
        )
      }
    })()
  }

  function handleStartNewDeck() {
    resetDeck()
    syncFiltersToFormat(DEFAULT_FILTERS.format)
    setStatusMessage('Started a fresh deck list.')
  }

  function handleAddToMainboard(card: MagicCard) {
    addCard(card, 'mainboard')
    setStatusMessage(`Added ${card.name} to the mainboard.`)
  }

  function handleAddToSideboard(card: MagicCard) {
    addCard(card, 'sideboard')
    setStatusMessage(`Added ${card.name} to the sideboard.`)
  }

  function handleBudgetTargetChange(nextValue: number | null) {
    setBudgetTargetUsd(
      nextValue !== null && Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : null,
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 text-ink-50 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
        <SiteNav />

        <AppHeader
          mainboardCards={deckStats.mainboard.totalCards}
          sideboardCards={deckStats.sideboard.totalCards}
          savedDecks={savedDecks.length}
        />

        <ContinentalAccountPanel
          status={authStatus}
          user={authUser}
          errorMessage={authErrorMessage}
          syncState={syncState}
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-[1.4rem] border border-white/10 bg-ink-900/72 p-1.5 shadow-panel backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setActiveWorkspaceTab('browser')}
              className={`rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition ${
                activeWorkspaceTab === 'browser'
                  ? 'bg-tide-500 text-white'
                  : 'text-ink-300 hover:bg-white/5 hover:text-ink-50'
              }`}
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkspaceTab('deck')}
              className={`rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition ${
                activeWorkspaceTab === 'deck'
                  ? 'bg-tide-500 text-white'
                  : 'text-ink-300 hover:bg-white/5 hover:text-ink-50'
              }`}
            >
              Gallery
            </button>
          </div>

          <p className="text-sm text-ink-300">
            {activeWorkspaceTab === 'browser'
              ? 'Search the card pool and add cards without scrolling past the full deck panel first.'
              : 'Review the finished list as full-card previews.'}
          </p>
        </div>

        {activeWorkspaceTab === 'browser' ? (
          <FilterBar
            filters={normalizedDraftFilters}
            onFiltersChange={setDraftFilters}
            onApply={handleApplyFilters}
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
          />

          {activeWorkspaceTab === 'browser' ? (
            <CardGrid
              className="order-1 xl:order-1"
              cards={cards}
              totalCards={totalCards}
              filters={normalizedAppliedFilters}
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
