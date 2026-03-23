import type { DeckCardEntry } from '@/types/deck'
import { countDeckEntries } from '@/utils/format'

interface DeckReadOnlyListProps {
  title: string
  entries: DeckCardEntry[]
  emptyDescription: string
}

export function DeckReadOnlyList({
  title,
  entries,
  emptyDescription,
}: DeckReadOnlyListProps) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink-50">{title}</h2>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-300 ring-1 ring-white/10">
          {countDeckEntries(entries)} cards
        </span>
      </div>

      {entries.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {entries.map((entry) => (
            <div
              key={`${title}-${entry.card.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-ink-900/45 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-50">{entry.card.name}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {entry.card.setCode.toUpperCase()} • {entry.card.typeLine}
                </p>
              </div>
              <span className="rounded-full bg-tide-500/12 px-3 py-1 text-xs font-semibold text-tide-100 ring-1 ring-tide-400/20">
                x{entry.quantity}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-300">{emptyDescription}</p>
      )}
    </section>
  )
}
