import { CloudOff, ShieldAlert, ShieldCheck } from 'lucide-react'

import type { AuthStatus, AuthUser } from '@/auth/types'
import type { DeckSyncState } from '@/decks/deckRepository'

interface ContinentalAccountPanelProps {
  status: AuthStatus
  user: AuthUser | null
  errorMessage: string | null
  syncState: DeckSyncState
}

export function ContinentalAccountPanel({
  status,
  user,
  errorMessage,
  syncState,
}: ContinentalAccountPanelProps) {
  const accountUser = status === 'authenticated' ? user : null
  const isAuthenticated = accountUser !== null
  const isCloudSyncEnabled = syncState.mode === 'cloud'
  const isSyncPending = isCloudSyncEnabled && syncState.health === 'pending'
  const isUsingCloudCache = isCloudSyncEnabled && syncState.health === 'offline'
  const hasWarning = Boolean(errorMessage) || isUsingCloudCache || isSyncPending
  const containerClassName = hasWarning
    ? isUsingCloudCache || errorMessage
      ? 'border-rose-400/20 bg-rose-500/10'
      : 'border-amber-400/20 bg-amber-500/10'
    : isAuthenticated
      ? 'border-emerald-400/20 bg-emerald-500/10'
      : 'border-white/10 bg-ink-900/72'
  const badgeClassName = hasWarning
    ? isUsingCloudCache || errorMessage
      ? 'border-rose-400/25 bg-rose-500/12 text-rose-100'
      : 'border-amber-400/25 bg-amber-500/12 text-amber-100'
    : isAuthenticated
      ? 'border-emerald-400/25 bg-emerald-500/12 text-emerald-100'
      : 'border-white/10 bg-white/5 text-ink-200'
  const badgeIcon = isAuthenticated
    ? isUsingCloudCache
      ? CloudOff
      : ShieldCheck
    : hasWarning || status === 'loading'
      ? ShieldAlert
      : CloudOff
  const badgeLabel = isAuthenticated
    ? isUsingCloudCache
      ? 'Cached only'
      : isSyncPending
        ? 'Retrying sync'
        : isCloudSyncEnabled
          ? 'Synced'
          : 'Connected'
    : status === 'loading'
      ? 'Checking session'
      : 'Local only'
  const summaryMessage = status === 'loading'
    ? 'Checking whether this browser already has a Continental ID session.'
    : isAuthenticated
      ? isCloudSyncEnabled
        ? isUsingCloudCache
          ? 'Continental ID is connected. Grimoire is showing cached decks until sync recovers.'
          : isSyncPending
            ? `Continental ID is connected. ${syncState.pendingDeckCount} deck${syncState.pendingDeckCount === 1 ? '' : 's'} ${syncState.pendingDeckCount === 1 ? 'is' : 'are'} still waiting to sync.`
            : 'Continental ID is connected. Saved decks sync automatically across devices.'
        : 'Continental ID is connected for this browser session.'
      : 'Continental ID is optional. Use the sign-in control in the navigation to sync saved decks across devices.'
  const detailMessage = errorMessage ?? syncState.message
  const BadgeIcon = badgeIcon

  return (
    <section
      className={`rounded-[1.6rem] border px-4 py-3 shadow-panel backdrop-blur-xl sm:px-5 ${containerClassName}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badgeClassName}`}
        >
          <BadgeIcon className="h-3.5 w-3.5" />
          {badgeLabel}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6 text-ink-100">{summaryMessage}</p>
          {detailMessage ? (
            <p role="status" aria-live="polite" className="mt-1 text-sm leading-6 text-ink-300">
              {detailMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
