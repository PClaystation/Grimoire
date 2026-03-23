import { useEffect, useState } from 'react'
import { Download, Upload, X } from 'lucide-react'

interface DeckImportModalProps {
  isOpen: boolean
  isImporting: boolean
  error: string | null
  onClose: () => void
  onImport: (input: string) => void
}

const SAMPLE_IMPORT = `# Esper Midrange
# Format: standard

Deck
4 Deep-Cavern Bat
4 Raffine, Scheming Seer
2 Cut Down
2 Go for the Throat

Sideboard
2 Negate
2 Disdainful Stroke`

const SAMPLE_ARCHIDEKT_URL = 'https://archidekt.com/decks/17524195'

export function DeckImportModal({
  isOpen,
  isImporting,
  error,
  onClose,
  onImport,
}: DeckImportModalProps) {
  const [input, setInput] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/92 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-ink-900/95 p-5 shadow-panel sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-import-title"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
              Import
            </p>
            <h2 id="deck-import-title" className="mt-2 font-display text-3xl text-ink-50">
              Paste a decklist or deck URL
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

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.9fr)]">
          <div className="space-y-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Paste deck text, JSON, or a supported deck URL"
              className="min-h-[20rem] w-full rounded-[1.5rem] border border-white/10 bg-ink-800/80 px-4 py-4 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
            />

            {error ? (
              <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onImport(input)}
                disabled={isImporting || input.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-tide-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-tide-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {isImporting ? 'Importing...' : 'Import deck'}
              </button>
              <button
                type="button"
                onClick={() => setInput(SAMPLE_IMPORT)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-medium text-ink-200 transition hover:border-white/20 hover:bg-ink-700"
              >
                <Download className="h-4 w-4" />
                Load text example
              </button>
              <button
                type="button"
                onClick={() => setInput(SAMPLE_ARCHIDEKT_URL)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-medium text-ink-200 transition hover:border-white/20 hover:bg-ink-700"
              >
                <Download className="h-4 w-4" />
                Load URL example
              </button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              Accepted input
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-ink-200">
              <li>`4 Lightning Bolt`</li>
              <li>`4 Lightning Bolt (M11) 146`</li>
              <li>`SB: 2 Disdainful Stroke`</li>
              <li>`# Format: modern`</li>
              <li>`https://archidekt.com/decks/...`</li>
              <li>`https://tappedout.net/mtg-decks/...`</li>
              <li>`Notes` and `Matchups` sections from Grimoire exports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
