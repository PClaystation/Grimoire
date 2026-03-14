import { useState } from 'react'

import { CardDetailsModal } from '@/components/cards/CardDetailsModal'
import { CardGrid } from '@/components/cards/CardGrid'
import { DeckPanel } from '@/components/deck/DeckPanel'
import { FilterBar } from '@/components/filters/FilterBar'
import { AppHeader } from '@/components/layout/AppHeader'
import { DEFAULT_FILTERS } from '@/constants/mtg'
import { useCardSearch } from '@/hooks/useCardSearch'
import { useCardSets } from '@/hooks/useCardSets'
import { useDeckBuilder } from '@/state/useDeckBuilder'
import { useSavedDecks } from '@/state/useSavedDecks'
import type { CardSearchFilters, CardSortOption } from '@/types/filters'
import type { MagicCard } from '@/types/scryfall'
import { sortCards } from '@/utils/cardSort'
import { getDeckStats } from '@/utils/deckStats'
import { buildDecklistText } from '@/utils/decklist'

function App() {
  const [draftFilters, setDraftFilters] = useState<CardSearchFilters>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<CardSearchFilters>(DEFAULT_FILTERS)
  const [selectedCard, setSelectedCard] = useState<MagicCard | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<CardSortOption>('RELEVANCE')
  const [currentPage, setCurrentPage] = useState(1)

  const {
    mainboard,
    sideboard,
    deckDraft,
    deckName,
    setDeckName,
    activeDeckId,
    addCard,
    decreaseCard,
    removeCard,
    moveCard,
    resetDeck,
    loadDeck,
    syncSavedDeck,
    detachSavedDeck,
  } = useDeckBuilder()
  const { savedDecks, saveDeck, deleteDeck } = useSavedDecks()
  const {
    cards,
    totalCards,
    hasMore,
    isLoading: isSearching,
    error: searchError,
  } = useCardSearch(appliedFilters, currentPage)
  const { sets, isLoading: areSetsLoading, error: setsError } = useCardSets()

  const sortedCards = sortCards(cards, sortBy)
  const deckStats = getDeckStats(mainboard, sideboard)

  function handleApplyFilters() {
    setCurrentPage(1)
    setAppliedFilters({ ...draftFilters })
  }

  function handleResetFilters() {
    setDraftFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
    setCurrentPage(1)
    setSortBy('RELEVANCE')
  }

  function handleSaveDeck() {
    if (mainboard.length === 0 && sideboard.length === 0) {
      return
    }

    const savedDeck = saveDeck(deckDraft)
    syncSavedDeck(savedDeck)
    setStatusMessage(`Saved "${savedDeck.name}" to local storage.`)
  }

  async function handleCopyDecklist() {
    if (mainboard.length === 0 && sideboard.length === 0) {
      return
    }

    const decklist = buildDecklistText(deckName, mainboard, sideboard)

    try {
      await navigator.clipboard.writeText(decklist)
      setStatusMessage('Copied decklist to the clipboard.')
    } catch {
      setStatusMessage('Unable to copy decklist in this browser.')
    }
  }

  function handleLoadDeck(deckId: string) {
    const deckToLoad = savedDecks.find((deck) => deck.id === deckId)

    if (!deckToLoad) {
      return
    }

    loadDeck(deckToLoad)
    setStatusMessage(`Loaded "${deckToLoad.name}".`)
  }

  function handleDeleteSavedDeck(deckId: string) {
    const deckToDelete = savedDecks.find((deck) => deck.id === deckId)

    deleteDeck(deckId)

    if (activeDeckId === deckId) {
      detachSavedDeck()
    }

    if (deckToDelete) {
      setStatusMessage(`Deleted "${deckToDelete.name}".`)
    }
  }

  function handleStartNewDeck() {
    resetDeck()
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

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 text-ink-50 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
        <AppHeader
          mainboardCards={deckStats.mainboard.totalCards}
          sideboardCards={deckStats.sideboard.totalCards}
          savedDecks={savedDecks.length}
        />

        <FilterBar
          filters={draftFilters}
          onFiltersChange={setDraftFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          sets={sets}
          setsError={setsError}
          isSearching={isSearching}
          areSetsLoading={areSetsLoading}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_28rem] 2xl:grid-cols-[minmax(0,1.2fr)_30rem]">
          <DeckPanel
            className="order-1 xl:order-2"
            deckName={deckName}
            mainboard={mainboard}
            sideboard={sideboard}
            stats={deckStats}
            activeDeckId={activeDeckId}
            savedDecks={savedDecks}
            statusMessage={statusMessage}
            onDeckNameChange={setDeckName}
            onSave={handleSaveDeck}
            onCopyDecklist={handleCopyDecklist}
            onNewDeck={handleStartNewDeck}
            onIncrease={addCard}
            onDecrease={decreaseCard}
            onRemove={removeCard}
            onMove={moveCard}
            onLoadDeck={handleLoadDeck}
            onDeleteSavedDeck={handleDeleteSavedDeck}
          />

          <CardGrid
            className="order-2 xl:order-1"
            cards={sortedCards}
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
        </div>
      </div>

      <CardDetailsModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onAddToMainboard={handleAddToMainboard}
        onAddToSideboard={handleAddToSideboard}
      />
    </div>
  )
}

export default App
