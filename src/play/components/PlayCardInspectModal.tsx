import { useEffect } from 'react'
import { X } from 'lucide-react'

import type { MagicCard } from '@/types/scryfall'

interface PlayCardInspectModalProps {
  card: MagicCard | null
  onClose: () => void
}

export function PlayCardInspectModal({ card, onClose }: PlayCardInspectModalProps) {
  useEffect(() => {
    if (!card) {
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
  }, [card, onClose])

  if (!card) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/92 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/10 bg-ink-900/96 p-5 shadow-panel sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="play-card-inspect-title"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
              Card inspection
            </p>
            <h2 id="play-card-inspect-title" className="mt-2 font-display text-3xl text-ink-50">
              {card.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-ink-400 transition hover:border-white/20 hover:bg-white/5 hover:text-ink-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-ink-800/70">
            <img
              src={card.largeImageUrl}
              alt={card.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-ink-200">
                {card.setName} ({card.setCode.toUpperCase()})
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-ink-200">
                Mana value {card.manaValue}
              </span>
              <span className="rounded-full bg-tide-500/12 px-3 py-1 text-sm text-tide-100 ring-1 ring-tide-400/25">
                {card.typeLine}
              </span>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-400">Oracle text</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-200">
                {card.oracleText || 'No oracle text available.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
