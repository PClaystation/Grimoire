import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Shuffle, StepForward, X } from 'lucide-react'

import type { DeckCardEntry, DeckFormat } from '@/types/deck'
import type { MagicCard } from '@/types/scryfall'

interface PlaytestModalProps {
  isOpen: boolean
  deckName: string
  format: DeckFormat
  mainboard: DeckCardEntry[]
  onClose: () => void
}

function expandDeck(entries: DeckCardEntry[]): MagicCard[] {
  return entries.flatMap((entry) => Array.from({ length: entry.quantity }, () => entry.card))
}

function shuffleCards(cards: MagicCard[]): MagicCard[] {
  const nextCards = [...cards]

  for (let index = nextCards.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1))
    ;[nextCards[index], nextCards[targetIndex]] = [nextCards[targetIndex], nextCards[index]]
  }

  return nextCards
}

function countHandLands(cards: MagicCard[]): number {
  return cards.filter((card) => card.typeLine.includes('Land')).length
}

export function PlaytestModal({
  isOpen,
  deckName,
  format,
  mainboard,
  onClose,
}: PlaytestModalProps) {
  const [hand, setHand] = useState<MagicCard[]>([])
  const [library, setLibrary] = useState<MagicCard[]>([])
  const [turn, setTurn] = useState(1)
  const [handSize, setHandSize] = useState(7)

  const startNewGame = useCallback((nextHandSize = 7) => {
    const shuffledCards = shuffleCards(expandDeck(mainboard))
    setHand(shuffledCards.slice(0, nextHandSize))
    setLibrary(shuffledCards.slice(nextHandSize))
    setTurn(1)
    setHandSize(nextHandSize)
  }, [mainboard])

  function drawCard() {
    setLibrary((currentLibrary) => {
      const nextCard = currentLibrary[0]

      if (!nextCard) {
        return currentLibrary
      }

      setHand((currentHand) => [...currentHand, nextCard])
      setTurn((currentTurn) => currentTurn + 1)
      return currentLibrary.slice(1)
    })
  }

  function mulligan() {
    startNewGame(Math.max(4, handSize - 1))
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      startNewGame(7)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isOpen, startNewGame])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-6xl rounded-[2rem] border border-white/10 bg-ink-900/95 p-5 shadow-panel sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="playtest-title"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
              Goldfish mode
            </p>
            <h2 id="playtest-title" className="mt-2 font-display text-3xl text-ink-50">
              {deckName}
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-300">
              {format} playtest, turn {turn}. Opening hand has {countHandLands(hand)} lands and{' '}
              {hand.length - countHandLands(hand)} nonlands.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-ink-400 transition hover:border-white/20 hover:bg-white/5 hover:text-ink-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Hand</p>
            <p className="mt-2 text-2xl font-semibold text-ink-50">{hand.length}</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              Library
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink-50">{library.length}</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              Lands in hand
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink-50">{countHandLands(hand)}</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              Mulligan size
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink-50">{handSize}</p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => startNewGame(7)}
            className="inline-flex items-center gap-2 rounded-2xl bg-tide-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-tide-400"
          >
            <Shuffle className="h-4 w-4" />
            New opening hand
          </button>
          <button
            type="button"
            onClick={mulligan}
            disabled={handSize <= 4}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-medium text-ink-200 transition hover:border-white/20 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Mulligan
          </button>
          <button
            type="button"
            onClick={drawCard}
            disabled={library.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl border border-ember-400/20 bg-ember-500/10 px-4 py-3 text-sm font-medium text-ember-100 transition hover:border-ember-400/35 hover:bg-ember-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <StepForward className="h-4 w-4" />
            Draw next turn
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hand.map((card, index) => (
            <div
              key={`${card.id}-${index}`}
              className="rounded-[1.4rem] border border-white/10 bg-ink-800/60 p-4"
            >
              <p className="text-sm font-semibold text-ink-50">{card.name}</p>
              <p className="mt-1 text-xs text-ink-400">{card.typeLine}</p>
              <p className="mt-2 text-xs font-medium text-ink-300">
                MV {card.manaValue} • {card.manaCost || 'No mana cost'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
