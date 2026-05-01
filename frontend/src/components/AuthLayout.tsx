import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Boxes } from 'lucide-react'

// ─── Animated background nodes ──────────────────────────────────────────────

interface NodeProps {
  x: string
  y: string
  delay: string
  duration: string
  size: number
  opacity: number
}

const ArchiveNode = ({ x, y, delay, duration, size, opacity }: NodeProps) => (
  <div
    aria-hidden="true"
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: '50%',
      border: `1px solid hsl(var(--foreground) / ${opacity * 0.25})`,
      backgroundColor: `hsl(var(--foreground) / ${opacity * 0.04})`,
      animation: `borgPulse ${duration} ease-in-out ${delay} infinite`,
      pointerEvents: 'none',
    }}
  />
)

const FloatingDot = ({
  x,
  y,
  delay,
  duration,
}: {
  x: string
  y: string
  delay: string
  duration: string
}) => (
  <div
    aria-hidden="true"
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 3,
      height: 3,
      borderRadius: '50%',
      backgroundColor: 'hsl(var(--foreground) / 0.2)',
      animation: `borgFloat ${duration} ease-in-out ${delay} infinite`,
      pointerEvents: 'none',
    }}
  />
)

// ─── Shared auth styles (keyframes + input classes) ─────────────────────────

export const AUTH_STYLES = `
  @keyframes borgPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.18); opacity: 0.4; }
  }
  @keyframes borgFloat {
    0%, 100% { transform: translateY(0px); opacity: 0.5; }
    50% { transform: translateY(-12px); opacity: 1; }
  }
  @keyframes borgFadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes borgScan {
    0% { background-position: 0 0; }
    100% { background-position: 0 40px; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    @keyframes borgPulse { 0%, 100% { opacity: 1; } }
    @keyframes borgFloat { 0%, 100% { opacity: 0.5; } }
    @keyframes borgFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes borgScan { 0%, 100% {} }
  }
`

// ─── Layout component ───────────────────────────────────────────────────────

/**
 * Shared layout for Login and post-login setup pages.
 * Left panel: brand + animated background. Right panel: card with children.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <>
      <div
        className="flex-col lg:flex-row lg:h-screen bg-background"
        style={{
          minHeight: '100vh',
          display: 'flex',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          overflow: 'hidden',
        }}
      >
        {/* ── LEFT: Brand panel ──────────────────────────────────────────────── */}
        <div
          className="flex lg:w-[52%] xl:w-[55%] bg-muted"
          style={{
            position: 'relative',
            overflow: 'hidden',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 32px',
          }}
        >

          {/* Floating archive nodes */}
          <ArchiveNode x="8%" y="12%" delay="0s" duration="4.2s" size={48} opacity={0.7} />
          <ArchiveNode x="78%" y="8%" delay="1.1s" duration="5.5s" size={32} opacity={0.5} />
          <ArchiveNode x="85%" y="72%" delay="0.5s" duration="3.8s" size={56} opacity={0.6} />
          <ArchiveNode x="6%" y="78%" delay="2s" duration="6s" size={40} opacity={0.4} />
          <ArchiveNode x="55%" y="88%" delay="0.8s" duration="4.7s" size={28} opacity={0.5} />
          <ArchiveNode x="22%" y="45%" delay="1.5s" duration="5s" size={20} opacity={0.3} />
          <FloatingDot x="35%" y="18%" delay="0s" duration="3.5s" />
          <FloatingDot x="65%" y="30%" delay="0.8s" duration="4.2s" />
          <FloatingDot x="15%" y="60%" delay="1.4s" duration="3.8s" />
          <FloatingDot x="80%" y="45%" delay="0.3s" duration="5s" />
          <FloatingDot x="45%" y="72%" delay="1.8s" duration="4.6s" />

          {/* Center brand content */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              animation: 'borgFadeIn 0.6s ease-out both',
            }}
          >
            {/* Logo + wordmark */}
            <div className="flex items-center gap-3" style={{ marginBottom: 20, marginTop: 8 }}>
              <Boxes className="h-10 w-10" />
              <span
                className="text-foreground"
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                }}
              >
                BorgScale
              </span>
            </div>

            {/* Tagline — desktop only */}
            <p
              className="hidden lg:block text-muted-foreground"
              style={{
                fontSize: '1.05rem',
                maxWidth: 340,
                lineHeight: 1.6,
                margin: '0 0 40px',
              }}
            >
              {t('login.tagline')}
            </p>
          </div>

          {/* Bottom decoration — desktop only */}
          <div
            aria-hidden="true"
            className="hidden lg:block text-muted-foreground/35"
            style={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            Encrypted · Deduplicated · Open source
          </div>
        </div>

        {/* ── RIGHT: Form panel ──────────────────────────────────────────────── */}
        <div
          className="px-5 lg:px-12 xl:px-16 justify-start lg:justify-center pt-3 lg:pt-6"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingBottom: 24,
            position: 'relative',
          }}
        >

          <div
            style={{
              width: '100%',
              maxWidth: 400,
              animation: 'borgFadeIn 0.5s ease-out 0.1s both',
            }}
          >
            {/* Card */}
            <div className="bg-card/30 border border-foreground/[0.08] backdrop-blur rounded-2xl px-7 py-9">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
