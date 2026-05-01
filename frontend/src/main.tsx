import './i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { BASE_PATH } from './utils/basePath'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth.tsx'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import App from './App.tsx'
import './index.css'

// recharts stores element refs in its Redux/immer state. immer's autoFreeze
// recursively deep-freezes the produced state, and because recharts stores
// references to DOM elements and React fiber objects, the freeze propagates
// through __reactFiber$* properties and fiber fields into the entire fiber tree.
// Frozen fibers cause "Cannot assign to read only property 'lanes'" errors
// that silently drop all subsequent setState calls — including dialog close
// handlers (e.g. PasskeyEnrollmentPrompt snooze).
//
// Fix: intercept Object.isFrozen to report React fiber objects as "already
// frozen" so immer's autoFreeze skips them (immer calls isFrozen as its first
// guard: `if (isFrozen(e)) return`). DOM nodes are similarly guarded.
// Neither type is actually frozen, so React's scheduler can still mutate
// fiber.lanes / fiber.childLanes as needed.
function _isReactFiber(obj: object): boolean {
  const o = obj as Record<string, unknown>
  return (
    typeof o['tag'] === 'number' &&
    'stateNode' in o &&
    'elementType' in o &&
    ('child' in o || o['child'] === null) &&
    'pendingProps' in o
  )
}
const _origIsFrozen = Object.isFrozen
;(Object.isFrozen as (obj: object) => boolean) = function isFrozen(obj: object): boolean {
  if (obj == null || typeof obj !== 'object') return _origIsFrozen(obj)
  if (obj instanceof Node) return true
  if (_isReactFiber(obj)) return true
  return _origIsFrozen(obj)
}


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // SWR caching strategy: data stays fresh for 30s, cached for 5min
      staleTime: 30 * 1000, // 30 seconds - data considered fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - data kept in cache (formerly cacheTime)
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={BASE_PATH || '/'}>
          <AuthProvider>
            <AppProvider>
              <App />
              <Toaster position="top-right" />
            </AppProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
)
