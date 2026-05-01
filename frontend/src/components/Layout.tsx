import React, { useState, useEffect } from 'react'
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
  const { announcement, acknowledgeAnnouncement, snoozeAnnouncement, trackAnnouncementCtaClick } =
    useAnnouncementSurface()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false)

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
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader onToggleMobileMenu={() => setMobileOpen(!mobileOpen)} />

        <main className="flex-1 px-4 py-6 pt-20 sm:px-6 sm:py-8 sm:pt-20 md:px-8 bg-background">
          <div className="mx-auto max-w-screen-xl">
            {children}
          </div>
          <Footer />
        </main>
      </div>

      <AnnouncementModal
        announcement={announcement}
        open={activeSurface === 'announcement'}
        onAcknowledge={acknowledgeAnnouncement}
        onSnooze={snoozeAnnouncement}
        onCtaClick={trackAnnouncementCtaClick}
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
