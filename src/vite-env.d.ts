/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string
  readonly VITE_PLAY_SERVER_URL?: string
  readonly VITE_ROUTER_MODE?: 'browser' | 'hash'
  readonly VITE_CONTINENTAL_AUTH_BASE_URL?: string
  readonly VITE_CONTINENTAL_LOGIN_POPUP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  __API_BASE_URL__?: string
  __LOGIN_POPUP_URL__?: string
}
