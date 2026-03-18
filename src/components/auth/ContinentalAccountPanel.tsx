import { CloudOff, LogIn, LogOut, ShieldCheck, ShieldEllipsis } from 'lucide-react'

import { SectionPanel } from '@/components/ui/SectionPanel'
import type { AuthStatus, AuthUser } from '@/auth/types'

const lastLoginFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatLastLogin(lastLoginAt: string | null) {
  if (!lastLoginAt) {
    return 'No active session'
  }

  const date = new Date(lastLoginAt)

  if (Number.isNaN(date.getTime())) {
    return 'Unavailable'
  }

  return lastLoginFormatter.format(date)
}

interface ContinentalAccountPanelProps {
  status: AuthStatus
  user: AuthUser | null
  errorMessage: string | null
  isBusy: boolean
  onSignIn: () => void
  onSignOut: () => void
}

export function ContinentalAccountPanel({
  status,
  user,
  errorMessage,
  isBusy,
  onSignIn,
  onSignOut,
}: ContinentalAccountPanelProps) {
  const accountUser = status === 'authenticated' ? user : null
  const isAuthenticated = accountUser !== null
  const badgeClassName = isAuthenticated
    ? 'border-emerald-400/25 bg-emerald-500/12 text-emerald-100'
    : status === 'loading'
      ? 'border-amber-400/25 bg-amber-500/12 text-amber-100'
      : 'border-white/10 bg-white/5 text-ink-200'

  return (
    <SectionPanel
      title="Continental ID"
      subtitle="The existing Continental popup auth flow is connected now. Sign in works, the logged-in account state is available in the app, and deck saves remain local until cloud sync is added."
      actions={
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badgeClassName}`}
        >
          {isAuthenticated ? <ShieldCheck className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
          {isAuthenticated ? 'Connected' : status === 'loading' ? 'Checking session' : 'Local only'}
        </span>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Status</p>
            <p className="mt-3 text-lg font-semibold text-ink-50">
              {isAuthenticated
                ? accountUser.displayName
                : status === 'loading'
                  ? 'Checking session...'
                  : 'Not signed in'}
            </p>
            <p className="mt-2 text-sm text-ink-300">
              {isAuthenticated
                ? 'Continental ID account is available to the app.'
                : 'You can sign in now, but deck sync is still disabled.'}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Email</p>
            <p className="mt-3 break-all text-sm font-medium text-ink-100">
              {isAuthenticated ? accountUser.email : 'Local deck mode only'}
            </p>
            <p className="mt-2 text-sm text-ink-300">
              {isAuthenticated
                ? accountUser.isVerified
                  ? 'This account is verified.'
                  : 'This account is not verified yet.'
                : 'No account data is attached to local saves yet.'}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              Continental ID
            </p>
            <p className="mt-3 break-all font-mono text-sm text-tide-100">
              {isAuthenticated ? accountUser.continentalId : 'Unavailable until sign-in'}
            </p>
            <p className="mt-2 text-sm text-ink-300">
              Future cloud deck sync should use this value as the external user identifier.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              Session note
            </p>
            <p className="mt-3 text-sm font-medium text-ink-100">
              {isAuthenticated
                ? `Last login ${formatLastLogin(accountUser.lastLoginAt)}`
                : 'Deck saves stay local'}
            </p>
            <p className="mt-2 text-sm text-ink-300">
              The app now keeps the short-lived access token in memory only and is ready for a later sync API.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <button
            type="button"
            onClick={isAuthenticated ? () => void onSignOut() : onSignIn}
            disabled={isBusy || status === 'loading'}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isAuthenticated
                ? 'border border-white/10 bg-white/5 text-ink-100 hover:bg-white/10'
                : 'bg-tide-500 text-white hover:bg-tide-400'
            }`}
          >
            {isAuthenticated ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {isBusy
              ? isAuthenticated
                ? 'Signing out...'
                : 'Connecting...'
              : status === 'loading'
                ? 'Checking session...'
              : isAuthenticated
                ? 'Sign out'
                : 'Sign in with Continental ID'}
          </button>

          <p className="max-w-sm text-sm text-ink-300 xl:text-right">
            {isAuthenticated
              ? 'Cloud deck sync is intentionally disabled for now. Signing in only establishes account context and the token flow.'
              : 'This sign-in groundwork uses the same popup and refresh-token architecture as the Dashboard.'}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-5 rounded-[1.4rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          <span className="inline-flex items-center gap-2">
            <ShieldEllipsis className="h-4 w-4" />
            {errorMessage}
          </span>
        </p>
      ) : null}
    </SectionPanel>
  )
}
