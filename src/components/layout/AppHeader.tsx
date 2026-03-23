import { BookOpen, Layers3, Sparkles } from 'lucide-react'

interface AppHeaderProps {
  mainboardCards: number
  sideboardCards: number
  savedDecks: number
}

export function AppHeader({ mainboardCards, sideboardCards, savedDecks }: AppHeaderProps) {
  return (
    <header className="relative isolate overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,31,39,0.98),rgba(10,20,27,0.96)_58%,rgba(18,35,44,0.98))] px-5 py-5 shadow-panel ring-1 ring-white/5 sm:px-6 sm:py-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_left_top,rgba(29,150,167,0.12),transparent_24%),radial-gradient(circle_at_85%_20%,rgba(223,107,11,0.1),transparent_22%)]" />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-tide-400/20 bg-tide-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-tide-100">
            <Sparkles className="h-3.5 w-3.5" />
            Deck builder
          </div>
          <h1 className="mt-3 font-display text-3xl leading-[1.06] tracking-tight text-ink-50 sm:text-[2.35rem]">
            Search, tune, and share from one workspace.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-300">
            Scryfall search, local or cloud saves, public deck pages, and quick testing.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.25rem] border border-tide-400/15 bg-[linear-gradient(180deg,rgba(29,150,167,0.08),rgba(255,255,255,0.03))] px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              <BookOpen className="h-4 w-4 text-tide-300" />
              Mainboard
            </div>
            <div className="mt-2 text-2xl font-semibold text-ink-50">{mainboardCards}</div>
          </div>
          <div className="rounded-[1.25rem] border border-ember-400/15 bg-[linear-gradient(180deg,rgba(223,107,11,0.08),rgba(255,255,255,0.03))] px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              <Layers3 className="h-4 w-4 text-ember-300" />
              Sideboard
            </div>
            <div className="mt-2 text-2xl font-semibold text-ink-50">{sideboardCards}</div>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              <Sparkles className="h-4 w-4 text-tide-300" />
              Saved
            </div>
            <div className="mt-2 text-2xl font-semibold text-ink-50">{savedDecks}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
