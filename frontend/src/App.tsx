import { lazy, Suspense } from 'react'
import { ShieldAlert, AlertTriangle } from 'lucide-react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.tsx'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import { useFirstRun } from './hooks/useFirstRun'
import AuthLayout from './components/AuthLayout'
import NotFound from './pages/NotFound'
import PageLoader from './components/PageLoader'
import { Footer } from './components/Footer'

// Route-level code splitting. Login stays eager because it is the first paint
// for a signed-out visitor; every other page arrives as its own chunk so the
// initial download is a fraction of the app.
const Dashboard = lazy(() => import('./pages/DashboardV3'))
const FirstRunWelcome = lazy(() => import('./pages/FirstRunWelcome'))
const GuidedSetup = lazy(() => import('./pages/GuidedSetup'))
const Backup = lazy(() => import('./pages/Backup'))
const Archives = lazy(() => import('./pages/Archives'))
const Schedule = lazy(() => import('./pages/Schedule'))
const Repositories = lazy(() => import('./pages/Repositories'))
const SSHConnectionsSingleKey = lazy(() => import('./pages/SSHConnectionsSingleKey'))
const Activity = lazy(() => import('./pages/Activity'))
const Settings = lazy(() => import('./pages/Settings'))

function AppSpinner() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div
        aria-hidden="true"
        className="h-32 w-32 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin"
      />
    </div>
  )
}

function DashboardOrWelcome() {
  const { showWelcome } = useFirstRun()
  if (showWelcome) {
    return <Navigate to="/welcome" replace />
  }
  return <Dashboard />
}

function App() {
  const {
    isAuthenticated,
    isLoading,
    mustChangePassword,
    proxyAuthEnabled,
    insecureNoAuthEnabled,
    proxyAuthHeader,
    proxyAuthWarnings,
    authError,
  } = useAuth()

  const shouldUseAuthShell = !insecureNoAuthEnabled && (!isAuthenticated || mustChangePassword)

  const authShell = (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AppSpinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    // If proxy auth is enabled, never send users to the local login page.
    if (proxyAuthEnabled) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
          {authError ? (
            <div className="max-w-lg rounded-2xl border border-border bg-background p-8 shadow-sm">
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={22} className="shrink-0 text-muted-foreground" />
                <h1 className="text-2xl font-semibold text-foreground">
                  Proxy authentication required
                </h1>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{authError}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Ensure BorgScale is only reachable through your authenticated reverse proxy and that
                it forwards the expected user header{proxyAuthHeader ? ` (${proxyAuthHeader})` : ''}
                .
              </p>
              {proxyAuthWarnings.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Proxy auth configuration warnings
                    </h2>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {proxyAuthWarnings.map((warning) => (
                      <li key={warning.code}>{warning.message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <AppSpinner />
          )}
          <div className="w-full max-w-lg">
            <Footer />
          </div>
        </div>
      )
    }

    if (insecureNoAuthEnabled) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
          {authError ? (
            <div className="max-w-lg rounded-2xl border border-border bg-background p-8 shadow-sm">
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={22} className="shrink-0 text-muted-foreground" />
                <h1 className="text-2xl font-semibold text-foreground">
                  Anonymous access unavailable
                </h1>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{authError}</p>
            </div>
          ) : (
            <AppSpinner />
          )}
          <div className="w-full max-w-lg">
            <Footer />
          </div>
        </div>
      )
    }
  }

  if (shouldUseAuthShell) {
    return authShell
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {insecureNoAuthEnabled ? (
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          ) : null}
          <Route path="/dashboard" element={<DashboardOrWelcome />} />
          <Route path="/welcome" element={<FirstRunWelcome />} />
          <Route path="/guided-setup" element={<GuidedSetup />} />
          <Route
            path="/backup"
            element={
              <ProtectedRoute requiredTab="backups">
                <Backup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/archives"
            element={
              <ProtectedRoute requiredTab="archives">
                <Archives />
              </ProtectedRoute>
            }
          />
          <Route path="/restore" element={<Navigate to="/archives" replace />} />
          <Route
            path="/schedule/*"
            element={
              <ProtectedRoute requiredTab="schedule">
                <Schedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repositories"
            element={
              <ProtectedRoute requiredTab="repositories">
                <Repositories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ssh-connections"
            element={
              <ProtectedRoute requiredTab="connections">
                <SSHConnectionsSingleKey />
              </ProtectedRoute>
            }
          />
          <Route path="/ssh-keys" element={<Navigate to="/ssh-connections" replace />} />
          <Route path="/connections" element={<Navigate to="/ssh-connections" replace />} />
          <Route path="/scripts" element={<Navigate to="/settings/scripts" replace />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
          <Route path="/settings/:tab" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
