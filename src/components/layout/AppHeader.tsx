import { BookOpen, Layers3, Sparkles } from 'lucide-react'

interface AppHeaderProps {
  mainboardCards: number
  sideboardCards: number
  savedDecks: number
}

export function AppHeader({ mainboardCards, sideboardCards, savedDecks }: AppHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-[2.7rem] border border-white/10 bg-ink-900/78 px-6 py-8 shadow-panel backdrop-blur-xl sm:px-8 sm:py-10 lg:px-10 lg:py-11">
      <div className="absolute -left-16 top-0 h-40 w-40 rounded-full bg-tide-500/25 blur-3xl" />
      <div className="absolute -right-12 bottom-0 h-36 w-36 rounded-full bg-ember-500/20 blur-3xl" />

      <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,24rem)] xl:items-end xl:gap-10 2xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,30rem)]">
        <div className="max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-tide-400/20 bg-tide-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-tide-100">
            <Sparkles className="h-3.5 w-3.5" />
            Grimoire Deckbuilder
          </div>
          <h1 className="font-display text-4xl leading-[1.04] tracking-tight text-ink-50 sm:text-5xl xl:text-[3.5rem]">
            Build sharper Magic decks with sideboards, validation, pricing, and live search.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-ink-300 sm:text-lg">
            Search live Scryfall data, sort and page through results, tune both mainboard and
            sideboard, then copy a clean decklist when the build is ready.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              <BookOpen className="h-4 w-4 text-tide-300" />
              Mainboard
            </div>
            <div className="mt-2 text-3xl font-semibold text-ink-50">{mainboardCards}</div>
            <p className="mt-1 text-sm text-ink-400">cards in the main list</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              <Layers3 className="h-4 w-4 text-ember-300" />
              Sideboard
            </div>
            <div className="mt-2 text-3xl font-semibold text-ink-50">{sideboardCards}</div>
            <p className="mt-1 text-sm text-ink-400">tuning and matchup slots</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              <Sparkles className="h-4 w-4 text-tide-300" />
              Local Saves
            </div>
            <div className="mt-2 text-3xl font-semibold text-ink-50">{savedDecks}</div>
            <p className="mt-1 text-sm text-ink-400">browser-stored snapshots</p>
          </div>
        </div>
      </div>
    </header>
  )
}
