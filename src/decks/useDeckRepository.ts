import { useMemo } from 'react'

import { useAuth } from '@/auth/useAuth'
import { createLocalDeckRepository } from '@/decks/localDeckRepository'

export function useDeckRepository() {
  const { status, user } = useAuth()

  return useMemo(() => {
    const accountUser = status === 'authenticated' ? user : null
    const isAuthenticated = accountUser !== null
    const subtitle = isAuthenticated
      ? `Signed in as ${accountUser.displayName}. Continental ID is connected, but deck sync is not enabled yet, so saves still stay in this browser.`
      : 'Deck snapshots stay in this browser for now. Continental ID sign-in is ready, and cloud sync can plug into the same deck repository later.'
    const emptyStateDescription = isAuthenticated
      ? 'Use Save Deck to keep local snapshots on this browser while cloud sync is still being prepared.'
      : 'Use Save Deck to keep local snapshots on this browser. Signing in with Continental ID does not sync decks yet.'

    return createLocalDeckRepository({
      badgeLabel: 'Local only',
      subtitle,
      emptyStateDescription,
    })
  }, [status, user])
}
