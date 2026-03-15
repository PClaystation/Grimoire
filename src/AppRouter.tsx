import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'

import App from '@/App'
import { PlayProvider } from '@/play/PlayProvider'
import { PlayCreatePage } from '@/pages/play/PlayCreatePage'
import { PlayGamePage } from '@/pages/play/PlayGamePage'
import { PlayHomePage } from '@/pages/play/PlayHomePage'
import { PlayJoinPage } from '@/pages/play/PlayJoinPage'
import { PlayRoomPage } from '@/pages/play/PlayRoomPage'

export default function AppRouter() {
  const Router = import.meta.env.VITE_ROUTER_MODE === 'hash' ? HashRouter : BrowserRouter

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <PlayProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/play" element={<PlayHomePage />} />
          <Route path="/play/create" element={<PlayCreatePage />} />
          <Route path="/play/join" element={<PlayJoinPage />} />
          <Route path="/play/room/:roomId" element={<PlayRoomPage />} />
          <Route path="/play/game/:gameId" element={<PlayGamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PlayProvider>
    </Router>
  )
}
