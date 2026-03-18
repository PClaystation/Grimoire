import { BookOpenText, LogIn, LogOut, Swords } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { ContinentalBranding } from '@/components/layout/ContinentalBranding'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface SiteNavProps {
  connectionStatus?: ConnectionStatus
  compact?: boolean
}

const STATUS_STYLES: Record<ConnectionStatus, string> = {
  connected: 'bg-emerald-500/10 text-emerald-100 ring-emerald-400/25',
  connecting: 'bg-amber-500/10 text-amber-100 ring-amber-400/25',
  disconnected: 'bg-rose-500/10 text-rose-100 ring-rose-400/25',
}

export function SiteNav({ connectionStatus, compact = false }: SiteNavProps) {
  const { status: authStatus, user, errorMessage, isBusy, signIn, signOut } = useAuth()
  const accountUser = authStatus === 'authenticated' ? user : null
  const isAuthenticated = accountUser !== null
  const authLabel = isAuthenticated
    ? accountUser.displayName
    : authStatus === 'loading'
      ? 'Checking session'
      : 'Continental ID'

  return (
    <nav
      className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900/78 shadow-panel backdrop-blur-xl ${
        compact ? 'px-4 py-3 sm:px-5' : 'px-4 py-4 sm:px-6'
      }`}
    >
      <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-tide-500/14 via-tide-500/6 to-transparent" />

      <div
        className={`relative flex flex-col md:flex-row md:items-center md:justify-between ${
          compact ? 'gap-3' : 'gap-4'
        }`}
      >
        <ContinentalBranding variant="nav" />

        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`inline-flex rounded-[1.2rem] border border-white/10 bg-white/5 ${
              compact ? 'p-1' : 'p-1.5'
            }`}
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-[0.9rem] font-semibold transition ${
                  compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
                } ${
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
                `inline-flex items-center gap-2 rounded-[0.9rem] font-semibold transition ${
                  compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
                } ${
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

          <div
            title={errorMessage ?? undefined}
            className={`inline-flex items-center gap-2 rounded-[1.2rem] border border-white/10 bg-white/5 ${
              compact ? 'px-2 py-1.5' : 'px-2.5 py-2'
            }`}
          >
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                {authLabel}
              </p>
              <p className="truncate text-[11px] text-ink-300">
                {isAuthenticated ? accountUser.continentalId : errorMessage ? 'Auth issue' : 'Login ready'}
              </p>
            </div>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={isBusy}
                className={`inline-flex items-center gap-2 rounded-[0.9rem] border border-white/10 bg-white/6 font-semibold text-ink-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 ${
                  compact ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-sm'
                }`}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={signIn}
                disabled={isBusy || authStatus === 'loading'}
                className={`inline-flex items-center gap-2 rounded-[0.9rem] bg-tide-500 font-semibold text-white transition hover:bg-tide-400 disabled:cursor-not-allowed disabled:opacity-60 ${
                  compact ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-sm'
                }`}
              >
                <LogIn className="h-4 w-4" />
                {authStatus === 'loading' ? 'Checking...' : 'Sign in'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
