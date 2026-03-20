import { BookOpen, Layers3, Sparkles } from 'lucide-react'

interface AppHeaderProps {
  mainboardCards: number
  sideboardCards: number
  savedDecks: number
}

export function AppHeader({ mainboardCards, sideboardCards, savedDecks }: AppHeaderProps) {
  return (
    <header className="relative isolate overflow-hidden rounded-[2.2rem] border border-white/10 bg-ink-900/94 px-5 py-6 shadow-panel sm:px-6 sm:py-7">
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_left_top,rgba(29,150,167,0.16),transparent_32%),radial-gradient(circle_at_right_bottom,rgba(223,107,11,0.14),transparent_28%)]" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-tide-400/20 bg-tide-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-tide-100">
            <Sparkles className="h-3.5 w-3.5" />
            Deck builder
          </div>
          <h1 className="mt-4 font-display text-3xl leading-[1.06] tracking-tight text-ink-50 sm:text-4xl">
            Search cards, tune the list, and export fast.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-300 sm:text-base">
            Live Scryfall results, subtype search, visual deck browsing, local saves, and quick
            playtesting in one workspace.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              <BookOpen className="h-4 w-4 text-tide-300" />
              Mainboard
            </div>
            <div className="mt-2 text-3xl font-semibold text-ink-50">{mainboardCards}</div>
            <p className="mt-1 text-sm text-ink-400">cards ready to play</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              <Layers3 className="h-4 w-4 text-ember-300" />
              Sideboard
            </div>
            <div className="mt-2 text-3xl font-semibold text-ink-50">{sideboardCards}</div>
            <p className="mt-1 text-sm text-ink-400">swap and matchup slots</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              <Sparkles className="h-4 w-4 text-tide-300" />
              Deck Saves
            </div>
            <div className="mt-2 text-3xl font-semibold text-ink-50">{savedDecks}</div>
            <p className="mt-1 text-sm text-ink-400">available in this browser right now</p>
          </div>
        </div>
      </div>
    </header>
  )
}
