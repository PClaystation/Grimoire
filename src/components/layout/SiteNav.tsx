import { BookOpenText, Swords } from 'lucide-react'
import { NavLink } from 'react-router-dom'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface SiteNavProps {
  connectionStatus?: ConnectionStatus
}

const STATUS_STYLES: Record<ConnectionStatus, string> = {
  connected: 'bg-emerald-500/10 text-emerald-100 ring-emerald-400/25',
  connecting: 'bg-amber-500/10 text-amber-100 ring-amber-400/25',
  disconnected: 'bg-rose-500/10 text-rose-100 ring-rose-400/25',
}

export function SiteNav({ connectionStatus }: SiteNavProps) {
  return (
    <nav className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900/78 px-4 py-4 shadow-panel backdrop-blur-xl sm:px-6">
      <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-tide-500/14 via-tide-500/6 to-transparent" />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-tide-400/25 bg-tide-500/12 text-tide-100">
            <Swords className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-400">
              Grimoire
            </p>
            <p className="text-sm text-ink-200">Deckbuilder and online tabletop</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-[1.2rem] border border-white/10 bg-white/5 p-1.5">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-[0.9rem] px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-tide-500 text-white'
                    : 'text-ink-300 hover:bg-white/6 hover:text-ink-50'
                }`
              }
            >
              <BookOpenText className="h-4 w-4" />
              Deckbuilder
            </NavLink>
            <NavLink
              to="/play"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-[0.9rem] px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-ember-500 text-white'
                    : 'text-ink-300 hover:bg-white/6 hover:text-ink-50'
                }`
              }
            >
              <Swords className="h-4 w-4" />
              Play
            </NavLink>
          </div>

          {connectionStatus ? (
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${STATUS_STYLES[connectionStatus]}`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {connectionStatus}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
