import { useEffect, useRef, useState } from 'react'

import {
  BookOpenText,
  ChevronDown,
  ExternalLink,
  LogIn,
  LogOut,
  Settings2,
  Swords,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { ContinentalBranding } from '@/components/layout/ContinentalBranding'
import { CONTINENTAL_DASHBOARD_URL } from '@/constants/continental'
import { useAppSettings } from '@/settings/useAppSettings'

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
  const { settings } = useAppSettings()
  const accountUser = authStatus === 'authenticated' ? user : null
  const isAuthenticated = accountUser !== null
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const authLabel = isAuthenticated
    ? accountUser.displayName
    : authStatus === 'loading'
      ? 'Checking session'
      : 'Continental ID'

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current || !(event.target instanceof Node)) {
        return
      }

      if (!menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  const dashboardLinkAttributes =
    settings.dashboardLinkTarget === 'new-tab'
      ? { target: '_blank', rel: 'noreferrer noopener' as const }
      : {}

  return (
    <nav
      className={`relative isolate z-40 overflow-visible rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,31,39,0.96),rgba(10,22,29,0.96))] shadow-panel ring-1 ring-white/5 ${
        compact ? 'px-4 py-3 sm:px-5' : 'px-4 py-4 sm:px-6'
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-tide-500/14 via-tide-500/6 to-transparent" />
      <div className="absolute right-0 top-0 h-20 w-48 bg-[radial-gradient(circle_at_top_right,rgba(223,107,11,0.14),transparent_56%)]" />

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
                {isAuthenticated
                  ? accountUser.continentalId
                  : errorMessage
                    ? 'Auth issue'
                    : 'Login ready'}
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

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="Open account menu"
              onClick={() => setIsMenuOpen((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-[1.2rem] border border-white/10 bg-white/5 text-ink-100 transition hover:bg-white/10 ${
                compact ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-sm'
              }`}
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Menu</span>
              <ChevronDown
                className={`h-4 w-4 transition ${isMenuOpen ? 'rotate-180' : undefined}`}
              />
            </button>

            {isMenuOpen ? (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[18.5rem] rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,31,39,0.98),rgba(10,22,29,0.99))] p-2 shadow-[0_22px_60px_-26px_rgba(7,19,27,0.92)] ring-1 ring-white/5"
              >
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                    Quick access
                  </p>
                  <p className="mt-1 text-sm text-ink-200">
                    Manage Grimoire preferences or jump into your Continental ID dashboard.
                  </p>
                </div>

                <div className="mt-2 grid gap-1">
                  <Link
                    to="/settings"
                    role="menuitem"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-start gap-3 rounded-[1rem] px-3 py-3 text-left text-ink-100 transition hover:bg-white/[0.06]"
                  >
                    <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-tide-200" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">Settings</span>
                      <span className="mt-0.5 block text-sm leading-5 text-ink-300">
                        Default view, motion, backdrop, and dashboard link behavior.
                      </span>
                    </span>
                  </Link>

                  <a
                    href={CONTINENTAL_DASHBOARD_URL}
                    {...dashboardLinkAttributes}
                    role="menuitem"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-start gap-3 rounded-[1rem] px-3 py-3 text-left text-ink-100 transition hover:bg-white/[0.06]"
                  >
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-ember-200" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        Continental ID Dashboard
                      </span>
                      <span className="mt-0.5 block text-sm leading-5 text-ink-300">
                        Open profile, security, sessions, and account-wide settings.
                      </span>
                    </span>
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  )
}
