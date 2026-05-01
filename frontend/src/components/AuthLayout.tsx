import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Boxes } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Animated background nodes ──────────────────────────────────────────────

interface NodeProps {
  x: string
  y: string
  delay: string
  duration: string
  size: number
  opacity: number
}

const ArchiveNode = ({ x, y, delay, duration, size, opacity }: NodeProps) => {
  const opacityCls =
    opacity >= 0.65 ? 'bg-foreground/[0.03] border-foreground/[0.18]' :
    opacity >= 0.55 ? 'bg-foreground/[0.02] border-foreground/[0.14]' :
    opacity >= 0.45 ? 'bg-foreground/[0.02] border-foreground/[0.12]' :
    'bg-foreground/[0.01] border-foreground/[0.10]'
  return (
    <div
      aria-hidden="true"
      className={cn('absolute rounded-full border pointer-events-none', opacityCls)}
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        animationName: 'borgPulse',
        animationDuration: duration,
        animationTimingFunction: 'ease-in-out',
        animationDelay: delay,
        animationIterationCount: 'infinite',
      }}
    />
  )
}

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
    className="absolute rounded-full bg-foreground/20 pointer-events-none size-[3px]"
    style={{
      left: x,
      top: y,
      animationName: 'borgFloat',
      animationDuration: duration,
      animationTimingFunction: 'ease-in-out',
      animationDelay: delay,
      animationIterationCount: 'infinite',
    }}
  />
)

// ─── Layout component ───────────────────────────────────────────────────────

/**
 * Shared layout for Login and post-login setup pages.
 * Left panel: brand + animated background. Right panel: card with children.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen bg-background min-h-screen overflow-hidden">
      {/* ── LEFT: Brand panel ──────────────────────────────────────────────── */}
      <div className="relative flex lg:w-[52%] xl:w-[55%] flex-col items-center justify-center overflow-hidden bg-muted p-6 lg:p-8">

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
        <div className="relative z-10 flex flex-col items-center text-center animate-fade-in-up">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-3 mb-5 mt-2">
            <Boxes className="h-10 w-10" />
            <span className="text-foreground text-4xl font-bold tracking-[0.1em] uppercase leading-tight">
              BorgScale
            </span>
          </div>

          {/* Tagline — desktop only */}
          <p className="hidden lg:block text-muted-foreground text-base max-w-[340px] leading-relaxed mb-10">
            {t('login.tagline')}
          </p>
        </div>

        {/* Bottom decoration — desktop only */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-mono tracking-[0.08em] whitespace-nowrap text-muted-foreground/35"
        >
          Encrypted · Deduplicated · Open source
        </div>
      </div>

      {/* ── RIGHT: Form panel ──────────────────────────────────────────────── */}
      <div className="relative flex flex-1 min-w-0 flex-col items-center justify-start lg:justify-center px-5 lg:px-12 xl:px-16 pb-6 pt-3 lg:pt-6">
        <div className="w-full max-w-[400px] animate-fade-in-up [animation-delay:0.1s]">
          {/* Card */}
          <div className="bg-card/30 border border-foreground/[0.08] backdrop-blur rounded-2xl px-7 py-9">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
