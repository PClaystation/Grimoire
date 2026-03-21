import type { ReactNode } from 'react'

import {
  ArrowLeft,
  ExternalLink,
  LayoutPanelTop,
  Paintbrush,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { SiteNav } from '@/components/layout/SiteNav'
import { CONTINENTAL_DASHBOARD_URL } from '@/constants/continental'
import {
  DEFAULT_APP_SETTINGS,
  type DashboardLinkTarget,
  type DeckWorkspaceTab,
  type InterfaceBackdrop,
} from '@/settings/appSettings'
import { useAppSettings } from '@/settings/useAppSettings'

const accountDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatAccountDate(timestamp: string | null) {
  if (!timestamp) {
    return 'Unavailable'
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return 'Unavailable'
  }

  return accountDateFormatter.format(date)
}

function getDashboardLinkAttributes(target: DashboardLinkTarget) {
  return target === 'new-tab'
    ? { target: '_blank', rel: 'noreferrer noopener' as const }
    : {}
}

interface ChoiceButtonProps {
  isActive: boolean
  label: string
  description: string
  onClick: () => void
}

function ChoiceButton({ isActive, label, description, onClick }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`rounded-[1.1rem] border px-4 py-3 text-left transition ${
        isActive
          ? 'border-tide-300/40 bg-tide-500/14 text-ink-50 shadow-[0_18px_36px_-28px_rgba(58,180,193,0.9)]'
          : 'border-white/10 bg-white/[0.04] text-ink-200 hover:bg-white/[0.07]'
      }`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink-300">{description}</p>
    </button>
  )
}

interface ToggleRowProps {
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}

function ToggleRow({ label, description, enabled, onToggle }: ToggleRowProps) {
  return (
    <div className="sm:col-span-2 flex items-center justify-between gap-4 rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-50">{label}</p>
        <p className="mt-1 text-sm leading-6 text-ink-300">{description}</p>
      </div>

      <button
        type="button"
        aria-pressed={enabled}
        onClick={onToggle}
        className={`inline-flex h-8 w-14 shrink-0 items-center rounded-full border px-1 transition ${
          enabled
            ? 'justify-end border-tide-300/40 bg-tide-500/16'
            : 'justify-start border-white/10 bg-white/[0.04]'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full transition ${
            enabled ? 'bg-tide-200' : 'bg-ink-300'
          }`}
        />
      </button>
    </div>
  )
}

interface SettingCardProps {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}

function SettingCard({ icon: Icon, title, description, children }: SettingCardProps) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.94),rgba(10,22,29,0.98))] p-4 shadow-panel ring-1 ring-white/5 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-[1rem] border border-tide-400/20 bg-tide-500/12 p-3 text-tide-100">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-ink-50">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-300">{description}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">{children}</div>
    </article>
  )
}

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useAppSettings()
  const { status, user, isBusy, signIn, signOut } = useAuth()
  const accountUser = status === 'authenticated' ? user : null
  const dashboardLinkAttributes = getDashboardLinkAttributes(settings.dashboardLinkTarget)

  function updateDefaultDeckWorkspaceTab(nextValue: DeckWorkspaceTab) {
    updateSettings({
      defaultDeckWorkspaceTab: nextValue,
    })
  }

  function updateDashboardLinkTarget(nextValue: DashboardLinkTarget) {
    updateSettings({
      dashboardLinkTarget: nextValue,
    })
  }

  function updateInterfaceBackdrop(nextValue: InterfaceBackdrop) {
    updateSettings({
      interfaceBackdrop: nextValue,
    })
  }

  function updateReducedMotion(nextValue: boolean) {
    updateSettings({
      reducedMotion: nextValue,
    })
  }

  function toggleRememberLastDeckWorkspaceTab() {
    updateSettings({
      rememberLastDeckWorkspaceTab: !settings.rememberLastDeckWorkspaceTab,
    })
  }

  function toggleShowDeckbuilderHero() {
    updateSettings({
      showDeckbuilderHero: !settings.showDeckbuilderHero,
    })
  }

  function toggleShowAccountStatusPanel() {
    updateSettings({
      showAccountStatusPanel: !settings.showAccountStatusPanel,
    })
  }

  function toggleShowWorkspaceHelperText() {
    updateSettings({
      showWorkspaceHelperText: !settings.showWorkspaceHelperText,
    })
  }

  const hasCustomSettings =
    JSON.stringify(settings) !== JSON.stringify(DEFAULT_APP_SETTINGS)

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-6 text-ink-50 sm:px-6 lg:px-10 lg:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,150,167,0.08),transparent_18%),radial-gradient(circle_at_top_right,rgba(223,107,11,0.08),transparent_14%)]" />

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-col gap-6">
        <SiteNav />

        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,31,39,0.98),rgba(10,20,27,0.96)_58%,rgba(18,35,44,0.98))] px-5 py-6 shadow-panel ring-1 ring-white/5 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-tide-400/20 bg-tide-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-tide-100">
                <Sparkles className="h-3.5 w-3.5" />
                Grimoire settings
              </div>
              <h1 className="mt-4 font-display text-3xl leading-[1.06] tracking-tight text-ink-50 sm:text-4xl">
                Tune how this browser opens and behaves.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-300 sm:text-base">
                These settings stay local to this browser.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-ink-100 transition hover:bg-white/[0.08]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to deckbuilder
              </Link>
              <button
                type="button"
                onClick={resetSettings}
                disabled={!hasCustomSettings}
                className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-ink-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset defaults
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_24rem]">
          <section className="grid gap-4">
            <SettingCard
              icon={LayoutPanelTop}
              title="Startup"
              description="Pick the default deckbuilder view."
            >
              <ChoiceButton
                isActive={settings.defaultDeckWorkspaceTab === 'browser'}
                label="Search"
                description="Open search by default."
                onClick={() => updateDefaultDeckWorkspaceTab('browser')}
              />
              <ChoiceButton
                isActive={settings.defaultDeckWorkspaceTab === 'deck'}
                label="Gallery"
                description="Open the gallery by default."
                onClick={() => updateDefaultDeckWorkspaceTab('deck')}
              />
              <ToggleRow
                label="Remember last workspace"
                description="Use the last workspace you opened."
                enabled={settings.rememberLastDeckWorkspaceTab}
                onToggle={toggleRememberLastDeckWorkspaceTab}
              />
            </SettingCard>

            <SettingCard
              icon={Sparkles}
              title="Home layout"
              description="Show or hide extra home panels."
            >
              <ToggleRow
                label="Deckbuilder hero"
                description="Show the large header."
                enabled={settings.showDeckbuilderHero}
                onToggle={toggleShowDeckbuilderHero}
              />
              <ToggleRow
                label="Account status panel"
                description="Show the account panel."
                enabled={settings.showAccountStatusPanel}
                onToggle={toggleShowAccountStatusPanel}
              />
              <ToggleRow
                label="Workspace helper text"
                description="Show the helper line beside the tab switcher."
                enabled={settings.showWorkspaceHelperText}
                onToggle={toggleShowWorkspaceHelperText}
              />
            </SettingCard>

            <SettingCard
              icon={ExternalLink}
              title="Dashboard link behavior"
              description="Choose how the dashboard opens."
            >
              <ChoiceButton
                isActive={settings.dashboardLinkTarget === 'new-tab'}
                label="Open in new tab"
                description="Keep Grimoire open."
                onClick={() => updateDashboardLinkTarget('new-tab')}
              />
              <ChoiceButton
                isActive={settings.dashboardLinkTarget === 'same-tab'}
                label="Open in same tab"
                description="Switch straight to the dashboard."
                onClick={() => updateDashboardLinkTarget('same-tab')}
              />
            </SettingCard>

            <SettingCard
              icon={Paintbrush}
              title="Appearance"
              description="Adjust the look and motion."
            >
              <ChoiceButton
                isActive={settings.interfaceBackdrop === 'atmospheric'}
                label="Atmospheric"
                description="Use the layered background."
                onClick={() => updateInterfaceBackdrop('atmospheric')}
              />
              <ChoiceButton
                isActive={settings.interfaceBackdrop === 'minimal'}
                label="Minimal"
                description="Use a flatter background."
                onClick={() => updateInterfaceBackdrop('minimal')}
              />
              <ToggleRow
                label="Reduced motion"
                description="Reduce transitions and animation."
                enabled={settings.reducedMotion}
                onToggle={() => updateReducedMotion(!settings.reducedMotion)}
              />
            </SettingCard>
          </section>

          <aside className="grid gap-4">
            <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.95),rgba(10,22,29,0.99))] p-5 shadow-panel ring-1 ring-white/5">
              <div className="flex items-start gap-3">
                <div className="rounded-[1rem] border border-emerald-400/20 bg-emerald-500/12 p-3 text-emerald-100">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-ink-50">Continental ID</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-300">
                    Account details live in the dashboard.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-ink-300">Status</span>
                  <span className="font-semibold text-ink-50">
                    {accountUser ? 'Connected' : status === 'loading' ? 'Checking session' : 'Signed out'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-ink-300">Display name</span>
                  <span className="truncate font-semibold text-ink-50">
                    {accountUser?.displayName ?? 'Unavailable'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-ink-300">Continental ID</span>
                  <span className="truncate font-semibold text-ink-50">
                    {accountUser?.continentalId ?? 'Unavailable'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-ink-300">Email</span>
                  <span className="truncate font-semibold text-ink-50">
                    {accountUser?.email ?? 'Unavailable'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-ink-300">Verified</span>
                  <span className="font-semibold text-ink-50">
                    {accountUser ? (accountUser.isVerified ? 'Yes' : 'Pending') : 'Unavailable'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-ink-300">Last login</span>
                  <span className="font-semibold text-ink-50">
                    {formatAccountDate(accountUser?.lastLoginAt ?? null)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-ink-300">Account created</span>
                  <span className="font-semibold text-ink-50">
                    {formatAccountDate(accountUser?.createdAt ?? null)}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={CONTINENTAL_DASHBOARD_URL}
                  {...dashboardLinkAttributes}
                  className="inline-flex items-center gap-2 rounded-[1rem] bg-tide-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-tide-400"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open dashboard
                </a>
                {accountUser ? (
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    disabled={isBusy}
                    className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-ink-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Sign out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={signIn}
                    disabled={isBusy || status === 'loading'}
                    className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-ink-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {status === 'loading' ? 'Checking...' : 'Sign in'}
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.95),rgba(10,22,29,0.99))] p-5 shadow-panel ring-1 ring-white/5">
              <h2 className="text-base font-semibold text-ink-50">What lives where</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-ink-300">
                <p>These settings only affect this browser.</p>
                <p>Account changes still live in the Continental ID dashboard.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
