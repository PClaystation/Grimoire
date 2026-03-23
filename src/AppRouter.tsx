import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import App from '@/App'
import { DeckComparePage } from '@/pages/decks/DeckComparePage'
import { DeckPublicPage } from '@/pages/decks/DeckPublicPage'
import { PlayProvider } from '@/play/PlayProvider'
import { PlayCreatePage } from '@/pages/play/PlayCreatePage'
import { PlayGamePage } from '@/pages/play/PlayGamePage'
import { PlayLabPage } from '@/pages/play/PlayLabPage'
import { PlayHomePage } from '@/pages/play/PlayHomePage'
import { PlayJoinPage } from '@/pages/play/PlayJoinPage'
import { PlayRoomPage } from '@/pages/play/PlayRoomPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

export default function AppRouter() {
  const Router = import.meta.env.VITE_ROUTER_MODE === 'hash' ? HashRouter : BrowserRouter

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/decks/view" element={<DeckPublicPage />} />
        <Route path="/decks/compare" element={<DeckComparePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route element={<PlayRouteShell />}>
          <Route path="/play" element={<PlayHomePage />} />
          <Route path="/play/create" element={<PlayCreatePage />} />
          <Route path="/play/join" element={<PlayJoinPage />} />
          <Route path="/play/lab" element={<PlayLabPage />} />
          <Route path="/play/room/:roomId" element={<PlayRoomPage />} />
          <Route path="/play/game/:gameId" element={<PlayGamePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

function PlayRouteShell() {
  return (
    <PlayProvider>
      <Outlet />
    </PlayProvider>
  )
}
