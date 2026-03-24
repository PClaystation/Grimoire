import type { Dispatch, SetStateAction } from 'react'

import { DEFAULT_FILTERS, normalizeCardSearchFilters } from '@/constants/mtg'
import type { DeckDeleteResult, DeckSaveResult, DeckSyncState } from '@/decks/deckRepository'
import type { AppSettingsContextValue } from '@/settings/appSettingsContext'
import type { AppSettings, DeckWorkspaceTab } from '@/settings/appSettings'
import type { DeckCardEntry, DeckDraft, DeckFormat, SavedDeck } from '@/types/deck'
import type { CardSearchFilters, CardSortOption } from '@/types/filters'
import type { MagicCard } from '@/types/scryfall'
import { copyTextToClipboard } from '@/utils/clipboard'
import { buildAppRouteUrl } from '@/utils/appRouteUrl'
import { resolveDeckImportInput } from '@/utils/deckSiteImport'
import {
  buildDeckExportJson,
  buildDecklistText,
  buildPortableDeckPayload,
} from '@/utils/decklist'
import { resolveImportedDeckInput } from '@/utils/resolveImportedDeck'
import { countDeckEntries } from '@/utils/format'
import { encodeDeckSharePayload } from '@/utils/share'

type FiltersSetter = Dispatch<SetStateAction<CardSearchFilters>>
type NumberSetter = Dispatch<SetStateAction<number>>
type MessageSetter = Dispatch<SetStateAction<string | null>>
type BooleanSetter = Dispatch<SetStateAction<boolean>>
type WorkspaceSetter = Dispatch<SetStateAction<DeckWorkspaceTab>>
type ErrorSetter = Dispatch<SetStateAction<string | null>>

interface DeckBuilderActionOptions {
  deckDraft: DeckDraft
  deckName: string
  format: DeckFormat
  notes: string
  matchupNotes: string
  activeDeckId: string | null
  hasCurrentDeckCards: boolean
  mainboard: DeckCardEntry[]
  sideboard: DeckCardEntry[]
  savedDecks: SavedDeck[]
  activeWorkspaceTab: DeckWorkspaceTab
  settings: AppSettings
  updateSettings: AppSettingsContextValue['updateSettings']
  syncState: DeckSyncState
  saveDeck: (deck: DeckDraft) => Promise<DeckSaveResult>
  deleteDeck: (deckId: string) => Promise<DeckDeleteResult>
  replaceDeck: (draft: DeckDraft) => void
  loadDeck: (deck: SavedDeck) => void
  resetDeck: () => void
  syncSavedDeck: (deck: SavedDeck) => void
  detachSavedDeck: () => void
  addCard: (card: MagicCard, section?: 'mainboard' | 'sideboard') => void
  setDeckFormat: (format: DeckFormat) => void
  setBudgetTargetUsd: (budgetTargetUsd: number | null) => void
  setDraftFilters: FiltersSetter
  setAppliedFilters: FiltersSetter
  setCurrentPage: NumberSetter
  setSortBy: Dispatch<SetStateAction<CardSortOption>>
  setStatusMessage: MessageSetter
  setIsImportOpen: BooleanSetter
  setIsImporting: BooleanSetter
  setImportError: ErrorSetter
  setActiveWorkspaceTab: WorkspaceSetter
}

function buildDeckViewHref(deck: SavedDeck | DeckDraft) {
  return buildAppRouteUrl('/decks/view', {
    deck: encodeDeckSharePayload(buildPortableDeckPayload(deck)),
  })
}

function buildDeckCompareHref(leftDeck: SavedDeck | DeckDraft, rightDeck: SavedDeck | DeckDraft) {
  return buildAppRouteUrl('/decks/compare', {
    left: encodeDeckSharePayload(buildPortableDeckPayload(leftDeck)),
    right: encodeDeckSharePayload(buildPortableDeckPayload(rightDeck)),
  })
}

async function copyUrlToClipboard(
  url: string,
  successMessage: string,
  failureMessage: string,
  setStatusMessage: MessageSetter,
) {
  try {
    const didCopy = await copyTextToClipboard(url)
    setStatusMessage(didCopy ? successMessage : failureMessage)
  } catch {
    setStatusMessage(failureMessage)
  }
}

function syncFiltersToFormat(
  nextFormat: DeckFormat,
  setDraftFilters: FiltersSetter,
  setAppliedFilters: FiltersSetter,
  setCurrentPage: NumberSetter,
) {
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

function buildSaveMessage(savedDeck: SavedDeck, syncState: DeckSyncState) {
  if (syncState.mode !== 'cloud') {
    return `Saved "${savedDeck.name}" to local browser storage.`
  }

  if (syncState.health === 'ready') {
    return `Saved and synced "${savedDeck.name}" to your Continental ID account.`
  }

  return `Saved "${savedDeck.name}". ${syncState.message ?? 'Cloud sync will retry automatically.'}`
}

function buildDeleteMessage(deckName: string, syncState: DeckSyncState) {
  if (syncState.mode !== 'cloud') {
    return `Deleted "${deckName}".`
  }

  if (syncState.health === 'ready') {
    return `Deleted and synced "${deckName}" across your Continental ID deck list.`
  }

  return `Deleted "${deckName}". ${syncState.message ?? 'Cloud sync will retry automatically.'}`
}

export function createDeckBuilderActions(options: DeckBuilderActionOptions) {
  const {
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
    settings,
    updateSettings,
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
  } = options

  return {
    buildDeckViewHref,
    buildDeckCompareHref: (leftDeck: SavedDeck | DeckDraft, rightDeck: SavedDeck | DeckDraft) =>
      buildDeckCompareHref(leftDeck, rightDeck),
    handleApplyFilters(draftFilters: CardSearchFilters) {
      setCurrentPage(1)
      setAppliedFilters(normalizeCardSearchFilters(draftFilters))
    },
    handleResetFilters() {
      const nextFilters: CardSearchFilters = {
        ...normalizeCardSearchFilters(DEFAULT_FILTERS),
        format,
      }

      setDraftFilters(nextFilters)
      setAppliedFilters(nextFilters)
      setCurrentPage(1)
      setSortBy('RELEVANCE')
    },
    handleDeckFormatChange(nextFormat: DeckFormat) {
      setDeckFormat(nextFormat)
      syncFiltersToFormat(nextFormat, setDraftFilters, setAppliedFilters, setCurrentPage)
    },
    handleSaveDeck() {
      if (mainboard.length === 0 && sideboard.length === 0) {
        return
      }

      void (async () => {
        try {
          const result = await saveDeck(deckDraft)
          syncSavedDeck(result.savedDeck)
          setStatusMessage(buildSaveMessage(result.savedDeck, result.syncState))
        } catch (saveError) {
          setStatusMessage(
            saveError instanceof Error
              ? saveError.message
              : 'Unable to save this deck in local browser storage.',
          )
        }
      })()
    },
    async handleCopyDecklist() {
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
    },
    async handleCopyShareLink() {
      if (!hasCurrentDeckCards) {
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
    },
    async handleCopyPublicDeckPageLink() {
      if (!hasCurrentDeckCards) {
        return
      }

      await copyUrlToClipboard(
        buildDeckViewHref(deckDraft),
        'Copied the public deck page link to the clipboard.',
        'Unable to copy the public deck page link in this browser.',
        setStatusMessage,
      )
    },
    handleDownloadTxt() {
      if (!hasCurrentDeckCards) {
        return
      }

      downloadFile(
        `${(deckName.trim() || 'deck').replace(/\s+/g, '-').toLowerCase()}.txt`,
        buildDecklistText(deckName, format, mainboard, sideboard, notes, matchupNotes),
        'text/plain;charset=utf-8',
      )

      setStatusMessage('Downloaded a text export of the current deck.')
    },
    handleDownloadJson() {
      if (!hasCurrentDeckCards) {
        return
      }

      downloadFile(
        `${(deckName.trim() || 'deck').replace(/\s+/g, '-').toLowerCase()}.json`,
        buildDeckExportJson(deckDraft),
        'application/json;charset=utf-8',
      )

      setStatusMessage('Downloaded a JSON export of the current deck.')
    },
    async handleImportDeck(input: string) {
      setIsImporting(true)
      setImportError(null)

      try {
        const { normalizedInput, sourceLabel } = await resolveDeckImportInput(input)
        const importedDeck = await resolveImportedDeckInput(normalizedInput, format)
        const importedMainboardCount = countDeckEntries(importedDeck.deck.mainboard)
        const importedSideboardCount = countDeckEntries(importedDeck.deck.sideboard)

        replaceDeck(importedDeck.deck)
        syncFiltersToFormat(
          importedDeck.deck.format,
          setDraftFilters,
          setAppliedFilters,
          setCurrentPage,
        )
        setIsImportOpen(false)

        const warningParts: string[] = []

        if (importedDeck.missingCards.length > 0) {
          warningParts.push(`${importedDeck.missingCards.length} unresolved cards`)
        }

        if (importedDeck.warnings.length > 0) {
          warningParts.push(`${importedDeck.warnings.length} skipped lines`)
        }

        setStatusMessage(
          `Imported "${importedDeck.deck.name}"${sourceLabel ? ` from ${sourceLabel}` : ''} with ${importedMainboardCount} mainboard cards and ${importedSideboardCount} sideboard cards.${warningParts.length > 0 ? ` ${warningParts.join(', ')}.` : ''}`,
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
    },
    handleLoadDeck(deckId: string) {
      const deckToLoad = savedDecks.find((deck) => deck.id === deckId)

      if (!deckToLoad) {
        return
      }

      loadDeck(deckToLoad)
      syncFiltersToFormat(deckToLoad.format, setDraftFilters, setAppliedFilters, setCurrentPage)
      setStatusMessage(`Loaded "${deckToLoad.name}".`)
    },
    handleDeleteSavedDeck(deckId: string) {
      const deckToDelete = savedDecks.find((deck) => deck.id === deckId)

      void (async () => {
        try {
          const result = await deleteDeck(deckId)

          if (activeDeckId === deckId) {
            detachSavedDeck()
          }

          if (deckToDelete) {
            setStatusMessage(buildDeleteMessage(deckToDelete.name, result.syncState))
          }
        } catch (deleteError) {
          setStatusMessage(
            deleteError instanceof Error
              ? deleteError.message
              : 'Unable to delete that saved deck right now.',
          )
        }
      })()
    },
    handleStartNewDeck() {
      resetDeck()
      syncFiltersToFormat(DEFAULT_FILTERS.format, setDraftFilters, setAppliedFilters, setCurrentPage)
      setStatusMessage('Started a fresh deck list.')
    },
    handleAddToMainboard(card: MagicCard) {
      addCard(card, 'mainboard')
      setStatusMessage(`Added ${card.name} to the mainboard.`)
    },
    handleAddToSideboard(card: MagicCard) {
      addCard(card, 'sideboard')
      setStatusMessage(`Added ${card.name} to the sideboard.`)
    },
    handleBudgetTargetChange(nextValue: number | null) {
      setBudgetTargetUsd(
        nextValue !== null && Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : null,
      )
    },
    handleActiveWorkspaceTabChange(nextTab: DeckWorkspaceTab) {
      setActiveWorkspaceTab(nextTab)

      if (
        settings.rememberLastDeckWorkspaceTab &&
        settings.defaultDeckWorkspaceTab !== nextTab
      ) {
        updateSettings({
          defaultDeckWorkspaceTab: nextTab,
        })
      }
    },
  }
}
