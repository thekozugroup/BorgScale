/**
 * Returns true when the given cron expression matches one of the visual
 * preset shapes that {@link CronBuilder} can edit without falling back to
 * the "Custom" tab. Used to decide whether to force the Advanced
 * (raw cron) disclosure open inside CronExpressionInput.
 */
export const cronMatchesPreset = (value: string): boolean => {
  if (!value || !value.trim()) return true
  const parts = value.trim().split(/\s+/)
  if (parts.length !== 5) return false
  const [minute, hour, day, month, dayOfWeek] = parts
  if (month !== '*') return false
  // Every N minutes: */N * * * *
  if (
    minute.startsWith('*/') &&
    hour === '*' &&
    day === '*' &&
    dayOfWeek === '*'
  )
    return true
  // Every N hours: M */N * * *
  if (
    /^\d+$/.test(minute) &&
    hour.startsWith('*/') &&
    day === '*' &&
    dayOfWeek === '*'
  )
    return true
  // Daily: M H * * *
  if (
    /^\d+$/.test(minute) &&
    /^\d+$/.test(hour) &&
    day === '*' &&
    dayOfWeek === '*'
  )
    return true
  // Weekly: M H * * D[,D...]
  if (
    /^\d+$/.test(minute) &&
    /^\d+$/.test(hour) &&
    day === '*' &&
    /^[\d,]+$/.test(dayOfWeek)
  )
    return true
  // Monthly: M H D * *
  if (
    /^\d+$/.test(minute) &&
    /^\d+$/.test(hour) &&
    /^\d+$/.test(day) &&
    dayOfWeek === '*'
  )
    return true
  return false
}
