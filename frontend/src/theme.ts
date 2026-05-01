// Theme configuration for BorgScale — Tailwind + shadcn/ui based theming.
// MUI has been removed; these exports are kept for consumer compatibility.

export type ResolvedThemeMode = 'light' | 'dark'
export type ThemeMode = ResolvedThemeMode | 'auto'

export const availableThemes = [
  { id: 'auto', labelKey: 'settings.appearance.themeOptions.auto', icon: 'Monitor' },
  { id: 'light', labelKey: 'settings.appearance.themeOptions.light', icon: 'Sun' },
  { id: 'dark', labelKey: 'settings.appearance.themeOptions.dark', icon: 'Moon' },
]

export const getTheme = (_mode: ResolvedThemeMode) => ({ palette: { mode: _mode } })
