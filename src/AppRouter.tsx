import { Suspense, lazy } from 'react'
import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { PlayProvider } from '@/play/PlayProvider'

const App = lazy(() => import('@/App'))
const DeckComparePage = lazy(() =>
  import('@/pages/decks/DeckComparePage').then((module) => ({ default: module.DeckComparePage })),
)
const DeckPublicPage = lazy(() =>
  import('@/pages/decks/DeckPublicPage').then((module) => ({ default: module.DeckPublicPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)
const PlayHomePage = lazy(() =>
  import('@/pages/play/PlayHomePage').then((module) => ({ default: module.PlayHomePage })),
)
const PlayCreatePage = lazy(() =>
  import('@/pages/play/PlayCreatePage').then((module) => ({ default: module.PlayCreatePage })),
)
const PlayJoinPage = lazy(() =>
  import('@/pages/play/PlayJoinPage').then((module) => ({ default: module.PlayJoinPage })),
)
const PlayLabPage = lazy(() =>
  import('@/pages/play/PlayLabPage').then((module) => ({ default: module.PlayLabPage })),
)
const PlayRoomPage = lazy(() =>
  import('@/pages/play/PlayRoomPage').then((module) => ({ default: module.PlayRoomPage })),
)
const PlayGamePage = lazy(() =>
  import('@/pages/play/PlayGamePage').then((module) => ({ default: module.PlayGamePage })),
)

export default function AppRouter() {
  const Router = import.meta.env.VITE_ROUTER_MODE === 'hash' ? HashRouter : BrowserRouter

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<RouteLoadingFallback />}>
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
      </Suspense>
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

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6 text-center text-sm font-semibold text-ink-200">
      Loading Grimoire...
    </div>
  )
}
