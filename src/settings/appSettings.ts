export type DeckWorkspaceTab = 'browser' | 'deck'
export type DashboardLinkTarget = 'same-tab' | 'new-tab'
export type InterfaceBackdrop = 'atmospheric' | 'minimal'

export interface AppSettings {
  defaultDeckWorkspaceTab: DeckWorkspaceTab
  rememberLastDeckWorkspaceTab: boolean
  dashboardLinkTarget: DashboardLinkTarget
  interfaceBackdrop: InterfaceBackdrop
  reducedMotion: boolean
  showDeckbuilderHero: boolean
  showAccountStatusPanel: boolean
  showWorkspaceHelperText: boolean
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultDeckWorkspaceTab: 'browser',
  rememberLastDeckWorkspaceTab: false,
  dashboardLinkTarget: 'new-tab',
  interfaceBackdrop: 'atmospheric',
  reducedMotion: false,
  showDeckbuilderHero: false,
  showAccountStatusPanel: true,
  showWorkspaceHelperText: false,
}

const STORAGE_KEY = 'grimoire.app-settings'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDeckWorkspaceTab(value: unknown): value is DeckWorkspaceTab {
  return value === 'browser' || value === 'deck'
}

function isDashboardLinkTarget(value: unknown): value is DashboardLinkTarget {
  return value === 'same-tab' || value === 'new-tab'
}

function isInterfaceBackdrop(value: unknown): value is InterfaceBackdrop {
  return value === 'atmospheric' || value === 'minimal'
}

function normalizeSettings(payload: unknown): AppSettings {
  const candidate = isRecord(payload) ? payload : {}

  return {
    defaultDeckWorkspaceTab: isDeckWorkspaceTab(candidate.defaultDeckWorkspaceTab)
      ? candidate.defaultDeckWorkspaceTab
      : DEFAULT_APP_SETTINGS.defaultDeckWorkspaceTab,
    rememberLastDeckWorkspaceTab:
      typeof candidate.rememberLastDeckWorkspaceTab === 'boolean'
        ? candidate.rememberLastDeckWorkspaceTab
        : DEFAULT_APP_SETTINGS.rememberLastDeckWorkspaceTab,
    dashboardLinkTarget: isDashboardLinkTarget(candidate.dashboardLinkTarget)
      ? candidate.dashboardLinkTarget
      : DEFAULT_APP_SETTINGS.dashboardLinkTarget,
    interfaceBackdrop: isInterfaceBackdrop(candidate.interfaceBackdrop)
      ? candidate.interfaceBackdrop
      : DEFAULT_APP_SETTINGS.interfaceBackdrop,
    reducedMotion:
      typeof candidate.reducedMotion === 'boolean'
        ? candidate.reducedMotion
        : DEFAULT_APP_SETTINGS.reducedMotion,
    showDeckbuilderHero:
      typeof candidate.showDeckbuilderHero === 'boolean'
        ? candidate.showDeckbuilderHero
        : DEFAULT_APP_SETTINGS.showDeckbuilderHero,
    showAccountStatusPanel:
      typeof candidate.showAccountStatusPanel === 'boolean'
        ? candidate.showAccountStatusPanel
        : DEFAULT_APP_SETTINGS.showAccountStatusPanel,
    showWorkspaceHelperText:
      typeof candidate.showWorkspaceHelperText === 'boolean'
        ? candidate.showWorkspaceHelperText
        : DEFAULT_APP_SETTINGS.showWorkspaceHelperText,
  }
}

export function loadInitialSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_APP_SETTINGS
  }

  try {
    return normalizeSettings(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return DEFAULT_APP_SETTINGS
  }
}

export function persistSettings(settings: AppSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage failures and keep the in-memory settings active.
  }
}

export function applySettingsToDocument(settings: AppSettings) {
  document.documentElement.dataset.grimoireReducedMotion = settings.reducedMotion
    ? 'true'
    : 'false'
  document.body.dataset.grimoireBackdrop = settings.interfaceBackdrop
}
