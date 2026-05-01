import { useTranslation } from 'react-i18next'
import SettingsCard from './SettingsCard'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useAnalytics } from '../hooks/useAnalytics'
import { useTheme } from '../context/ThemeContext'
import { availableThemes } from '../theme'
import { cn } from '@/lib/utils'

export default function AppearanceTab() {
  const { t } = useTranslation()
  const { trackSettings, EventAction } = useAnalytics()
  const { mode, effectiveMode, setTheme } = useTheme()

  const appearanceAccent =
    effectiveMode === 'dark' ? '#60a5fa' : mode === 'auto' ? '#0891b2' : '#2563eb'

  return (
    <div>
      <div>
        <p className="text-lg font-semibold mb-1">{t('settings.appearance.title')}</p>
        <p className="text-sm text-muted-foreground mb-6">{t('settings.appearance.subtitle')}</p>
      </div>
      <SettingsCard className="max-w-2xl">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${appearanceAccent}24`, color: appearanceAccent }}
            >
              {mode === 'auto' ? (
                <Monitor size={22} />
              ) : effectiveMode === 'dark' ? (
                <Moon size={22} />
              ) : (
                <Sun size={22} />
              )}
            </div>
            <div>
              <p className="text-sm font-bold">{t('settings.appearance.theme')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.appearance.chooseTheme')}</p>
            </div>
          </div>

          <span
            className="self-start px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              background: `${appearanceAccent}1f`,
              color: appearanceAccent,
              border: `1px solid ${appearanceAccent}3d`,
            }}
          >
            {mode === 'auto'
              ? t('settings.appearance.autoStatus', {
                  theme: t(`settings.appearance.themeOptions.${effectiveMode}`),
                })
              : t('settings.appearance.activeTheme', {
                  theme: t(`settings.appearance.themeOptions.${mode}`),
                })}
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {availableThemes.map((themeOption) => {
              const isSelected = mode === themeOption.id
              const Icon =
                themeOption.icon === 'Sun' ? Sun : themeOption.icon === 'Moon' ? Moon : Monitor
              const previewIsDark =
                themeOption.id === 'dark' || (themeOption.id === 'auto' && effectiveMode === 'dark')

              return (
                <button
                  key={themeOption.id}
                  type="button"
                  role="button"
                  aria-label={`${t('settings.appearance.themeAriaLabel')}: ${t(themeOption.labelKey)}`}
                  onClick={() => {
                    const theme = themeOption.id as typeof mode
                    setTheme(theme)
                    trackSettings(EventAction.EDIT, { section: 'appearance', setting: 'theme', theme })
                  }}
                  className={cn(
                    'p-3 rounded-2xl border text-left cursor-pointer transition-all duration-150',
                    'focus-visible:outline-2 focus-visible:outline-offset-2',
                    isSelected ? 'shadow-lg' : 'hover:-translate-y-0.5'
                  )}
                  style={{
                    borderColor: isSelected ? appearanceAccent : undefined,
                    background: isSelected ? `${appearanceAccent}14` : undefined,
                    boxShadow: isSelected ? `0 10px 24px ${appearanceAccent}29` : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{
                        background: previewIsDark ? '#0f172a' : `${appearanceAccent}1f`,
                        color: previewIsDark ? '#cbd5e1' : appearanceAccent,
                        border: `1px solid ${previewIsDark ? '#334155' : `${appearanceAccent}2e`}`,
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold">{t(themeOption.labelKey)}</p>
                      <p className="text-[0.68rem] text-muted-foreground">
                        {t(`settings.appearance.themeDescriptions.${themeOption.id}`)}
                      </p>
                    </div>
                  </div>

                  {/* Mini UI preview */}
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      background: previewIsDark ? '#0f172a' : '#f8fafc',
                      border: `1px solid ${previewIsDark ? '#1e293b' : '#e2e8f0'}`,
                    }}
                  >
                    <div className="flex gap-1.5 mb-2">
                      {/* Sidebar mock */}
                      <div
                        className="flex flex-col items-center gap-1 py-1.5 rounded-xl"
                        style={{
                          width: 24,
                          height: 54,
                          background: previewIsDark ? '#111827' : '#ffffff',
                          border: `1px solid ${previewIsDark ? '#1f2937' : '#e2e8f0'}`,
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: previewIsDark ? `rgba(96,165,250,0.75)` : `${appearanceAccent}bf` }} />
                        <div className="w-2 h-2 rounded" style={{ background: previewIsDark ? '#334155' : '#dbe4ee' }} />
                        <div className="w-2 h-2 rounded" style={{ background: previewIsDark ? '#334155' : '#dbe4ee' }} />
                      </div>
                      {/* Content mock */}
                      <div className="flex-1 min-w-0">
                        <div className="h-3 rounded-full mb-1.5" style={{ width: '46%', background: previewIsDark ? '#334155' : '#cbd5e1' }} />
                        <div className="flex gap-1.5 mb-1.5">
                          <div className="h-6 rounded-xl flex-1" style={{ background: previewIsDark ? '#111827' : '#ffffff', border: `1px solid ${previewIsDark ? '#1f2937' : '#dbe4ee'}`, boxShadow: previewIsDark ? 'none' : '0 1px 2px rgba(15,23,42,0.06)' }} />
                          <div className="w-5 h-6 rounded-xl" style={{ background: previewIsDark ? `rgba(96,165,250,0.18)` : `${appearanceAccent}24`, border: `1px solid ${previewIsDark ? `rgba(96,165,250,0.16)` : `${appearanceAccent}1f`}` }} />
                        </div>
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="flex-1 rounded-lg" style={{ height: i === 1 ? 16 : 14, background: previewIsDark ? '#172033' : '#ffffff', border: `1px solid ${previewIsDark ? '#1f2937' : '#dbe4ee'}` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Bottom bar mock */}
                    <div className="h-4.5 rounded-xl flex items-center px-2 gap-1" style={{ height: 18, background: previewIsDark ? '#111827' : '#ffffff', border: `1px solid ${previewIsDark ? '#1f2937' : '#dbe4ee'}` }}>
                      <div className="w-4 h-4 rounded-full" style={{ background: previewIsDark ? `rgba(96,165,250,0.22)` : `${appearanceAccent}2e` }} />
                      <div className="h-1.5 rounded-full" style={{ width: '42%', background: previewIsDark ? '#334155' : '#cbd5e1' }} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}
