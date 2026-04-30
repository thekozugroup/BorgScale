import React, { useEffect, useState } from 'react'

interface WizardStep {
  key: string
  label: string
  icon: React.ReactNode
}

interface WizardStepIndicatorProps {
  steps: WizardStep[]
  currentStep: number
  onStepClick?: (stepIndex: number) => void
}

// Use a hook that reads window width for responsive behaviour
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}

export default function WizardStepIndicator({
  steps,
  currentStep,
  onStepClick,
}: WizardStepIndicatorProps) {
  const isMobile = useIsMobile()

  // ── Mobile: compact icon-circles row + current step label ──
  if (isMobile) {
    const activeStep = steps[currentStep]

    return (
      <div className="border-b border-border bg-muted/40 -mx-6 -mt-4 mb-4">
        {/* Label row: "Step X / N"  ···  "Active Step Name" */}
        <div className="flex justify-between items-center px-4 pt-3 pb-1">
          <span className="text-xs text-muted-foreground font-medium">
            {`Step ${currentStep + 1} / ${steps.length}`}
          </span>
          <span className="text-xs font-semibold text-foreground">
            {activeStep?.label}
          </span>
        </div>

        {/* Icon circles row — labels hidden, circles only */}
        <div className="flex px-4 pb-4 gap-3 justify-center">
          {steps.map((step, index) => {
            const isActive = currentStep === index

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => onStepClick?.(index)}
                data-testid={`step-circle-${step.key}`}
                aria-label={`Go to step ${index + 1}: ${step.label}`}
                className={[
                  'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground scale-110 shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                ].join(' ')}
              >
                {step.icon}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Desktop: full tab row with icon + label ──
  return (
    <div className="flex border-b border-border bg-muted/40 -mx-6 -mt-4 mb-4 overflow-hidden">
      {steps.map((step, index) => {
        const isActive = currentStep === index

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepClick?.(index)}
            className={[
              'relative flex-1 flex items-center justify-center gap-2 py-3 px-2 cursor-pointer transition-all duration-200',
              isActive
                ? 'bg-muted/80 text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:content-[""]'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            ].join(' ')}
          >
            {/* Step icon circle */}
            <span
              className={[
                'flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground scale-105 shadow-sm'
                  : 'bg-muted text-muted-foreground',
              ].join(' ')}
            >
              {step.icon}
            </span>

            {/* Label */}
            <span className="text-sm whitespace-nowrap">
              <span className={['opacity-60 mr-0.5 font-normal', isActive ? '' : ''].join(' ')}>
                {index + 1}.
              </span>
              <span className={isActive ? 'font-semibold' : 'font-medium opacity-80'}>
                {step.label}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
