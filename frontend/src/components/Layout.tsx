import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AnnouncementModal from './AnnouncementModal'
import AppHeader from './AppHeader'
import AppSidebar from './AppSidebar'
import { Footer } from './Footer'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useAuth } from '../hooks/useAuth'
import { useAnnouncementSurface } from '../hooks/useAnnouncementSurface'
import PasskeyEnrollmentPrompt from './PasskeyEnrollmentPrompt'
import {
  clearPasskeyPromptIgnore,
  clearPasskeyPromptSnooze,
  clearRecentPasswordLogin,
  hasRecentPasswordLogin,
  ignorePasskeyPrompt,
  isPasskeyPromptIgnored,
  isPasskeyPromptSnoozed,
  snoozePasskeyPrompt,
} from '../utils/passkeyPrompt'

type ActivePostLoginSurface = 'passkey' | 'announcement' | null

export default function Layout({ children }: { children: React.ReactNode }) {
  const {
    user,
    proxyAuthEnabled,
    refreshUser,
    canEnrollPasskeyFromRecentLogin,
    clearRecentPasskeyEnrollmentState,
  } = useAuth()
  const { announcement, acknowledgeAnnouncement, snoozeAnnouncement } = useAnnouncementSurface()
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false)
  const { pathname } = useLocation()

  // Defensive cleanup: if Radix Dialog leaves body pointer-events:none (e.g. due
  // to unmount-during-transition), reset it on every route change so the UI
  // never gets permanently locked after navigation.
  useEffect(() => {
    if (document.body.style.pointerEvents === 'none') {
      document.body.style.pointerEvents = ''
    }
  }, [pathname])

  useEffect(() => {
    if (!user?.username) {
      setShowPasskeyPrompt(false)
      return
    }

    const shouldPrompt =
      !proxyAuthEnabled &&
      (user.passkey_count ?? 0) === 0 &&
      hasRecentPasswordLogin() &&
      canEnrollPasskeyFromRecentLogin &&
      !isPasskeyPromptIgnored(user.username) &&
      !isPasskeyPromptSnoozed(user.username)

    setShowPasskeyPrompt(shouldPrompt)
  }, [canEnrollPasskeyFromRecentLogin, proxyAuthEnabled, user?.passkey_count, user?.username])

  const handlePasskeyPromptSnooze = () => {
    if (user?.username) {
      snoozePasskeyPrompt(user.username)
    }
    clearRecentPasswordLogin()
    clearRecentPasskeyEnrollmentState()
    setShowPasskeyPrompt(false)
  }

  const handlePasskeyPromptIgnore = () => {
    if (user?.username) {
      ignorePasskeyPrompt(user.username)
    }
    clearRecentPasswordLogin()
    clearRecentPasskeyEnrollmentState()
    setShowPasskeyPrompt(false)
  }

  const handlePasskeyPromptSuccess = async () => {
    if (user?.username) {
      clearPasskeyPromptIgnore(user.username)
      clearPasskeyPromptSnooze(user.username)
    }
    clearRecentPasswordLogin()
    clearRecentPasskeyEnrollmentState()
    await refreshUser()
    setShowPasskeyPrompt(false)
  }

  const activeSurface: ActivePostLoginSurface = showPasskeyPrompt
    ? 'passkey'
    : announcement
      ? 'announcement'
      : null

  return (
    <SidebarProvider defaultOpen>
      {/* WCAG 2.4.1: first focusable element, lets keyboard users bypass the sidebar */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:text-foreground focus:shadow-md"
      >
        {t('navigation.skipToContent', 'Skip to main content')}
      </a>
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader onToggleMobileMenu={() => setMobileOpen(!mobileOpen)} />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 pt-20 sm:px-6 sm:py-8 sm:pt-20 md:px-8 bg-background outline-none"
        >
          <div className="mx-auto max-w-screen-xl">{children}</div>
          <Footer />
        </main>
      </div>

      <AnnouncementModal
        announcement={announcement}
        open={activeSurface === 'announcement'}
        onAcknowledge={acknowledgeAnnouncement}
        onSnooze={snoozeAnnouncement}
      />
      <PasskeyEnrollmentPrompt
        open={activeSurface === 'passkey'}
        onSnooze={handlePasskeyPromptSnooze}
        onIgnore={handlePasskeyPromptIgnore}
        onSuccess={handlePasskeyPromptSuccess}
      />
    </SidebarProvider>
  )
}
