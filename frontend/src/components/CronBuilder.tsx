import React, { useState, useEffect } from 'react'
import { Clock, Calendar, CalendarDays, CalendarRange, Code, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CronBuilderProps {
  value: string
  onChange: (cronExpression: string) => void
  label?: string
  helperText?: string
}

type Frequency = 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

interface CronState {
  frequency: Frequency
  minuteInterval: number
  hourInterval: number
  startingMinute: number
  hour: number
  minute: number
  selectedDays: boolean[]
  dayOfMonth: number
  customCron: string
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 0]

const parseCron = (cronExpression: string): CronState => {
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 5) {
    return {
      frequency: 'daily', minuteInterval: 5, hourInterval: 6, startingMinute: 0,
      hour: 2, minute: 0, selectedDays: [true, false, false, false, false, false, false],
      dayOfMonth: 1, customCron: cronExpression,
    }
  }
  const [minute, hour, day, , dayOfWeek] = parts

  if (minute.startsWith('*/') && hour === '*' && day === '*' && dayOfWeek === '*') {
    return { frequency: 'minute', minuteInterval: parseInt(minute.replace('*/', '')) || 5, hourInterval: 6, startingMinute: 0, hour: 2, minute: 0, selectedDays: [true, false, false, false, false, false, false], dayOfMonth: 1, customCron: cronExpression }
  }
  if (/^\d+$/.test(minute) && hour.startsWith('*/') && day === '*' && dayOfWeek === '*') {
    return { frequency: 'hourly', minuteInterval: 5, hourInterval: parseInt(hour.replace('*/', '')) || 6, startingMinute: parseInt(minute), hour: 2, minute: 0, selectedDays: [true, false, false, false, false, false, false], dayOfMonth: 1, customCron: cronExpression }
  }
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && day === '*' && dayOfWeek === '*') {
    return { frequency: 'daily', minuteInterval: 5, hourInterval: 6, startingMinute: 0, hour: parseInt(hour), minute: parseInt(minute), selectedDays: [true, false, false, false, false, false, false], dayOfMonth: 1, customCron: cronExpression }
  }
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && day === '*' && /^[\d,]+$/.test(dayOfWeek)) {
    const selectedDayNums = dayOfWeek.split(',').map((d) => parseInt(d))
    return { frequency: 'weekly', minuteInterval: 5, hourInterval: 6, startingMinute: 0, hour: parseInt(hour), minute: parseInt(minute), selectedDays: DAY_NUMBERS.map((dayNum) => selectedDayNums.includes(dayNum)), dayOfMonth: 1, customCron: cronExpression }
  }
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && /^\d+$/.test(day) && dayOfWeek === '*') {
    return { frequency: 'monthly', minuteInterval: 5, hourInterval: 6, startingMinute: 0, hour: parseInt(hour), minute: parseInt(minute), selectedDays: [true, false, false, false, false, false, false], dayOfMonth: parseInt(day), customCron: cronExpression }
  }
  return { frequency: 'custom', minuteInterval: 5, hourInterval: 6, startingMinute: 0, hour: 2, minute: 0, selectedDays: [true, false, false, false, false, false, false], dayOfMonth: 1, customCron: cronExpression }
}

const buildCron = (state: CronState): string => {
  switch (state.frequency) {
    case 'minute': return `*/${state.minuteInterval} * * * *`
    case 'hourly': return `${state.startingMinute} */${state.hourInterval} * * *`
    case 'daily': return `${state.minute} ${state.hour} * * *`
    case 'weekly': {
      const nums = state.selectedDays.map((s, i) => (s ? DAY_NUMBERS[i] : null)).filter((d) => d !== null)
      if (nums.length === 0) return `${state.minute} ${state.hour} * * 1`
      return `${state.minute} ${state.hour} * * ${nums.join(',')}`
    }
    case 'monthly': return `${state.minute} ${state.hour} ${state.dayOfMonth} * *`
    case 'custom': return state.customCron
    default: return '0 2 * * *'
  }
}

const generatePreview = (state: CronState, t: (key: string, opts?: Record<string, unknown>) => string): string => {
  switch (state.frequency) {
    case 'minute': return t('cronBuilder.everyMinutes', { count: state.minuteInterval })
    case 'hourly': return t('cronBuilder.everyHours', { count: state.hourInterval })
    case 'daily': {
      const hour12 = state.hour === 0 ? 12 : state.hour > 12 ? state.hour - 12 : state.hour
      const ampm = state.hour >= 12 ? t('cronBuilder.pm') : t('cronBuilder.am')
      return t('cronBuilder.dailyAt', { time: `${hour12}:${state.minute.toString().padStart(2, '0')} ${ampm}` })
    }
    case 'weekly': {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const selectedDayNames = dayNames.filter((_, i) => state.selectedDays[i])
      if (selectedDayNames.length === 0) return t('cronBuilder.noDaysSelected')
      const hour12 = state.hour === 0 ? 12 : state.hour > 12 ? state.hour - 12 : state.hour
      const ampm = state.hour >= 12 ? t('cronBuilder.pm') : t('cronBuilder.am')
      const daysStr = selectedDayNames.length === 7 ? t('cronBuilder.daily') : selectedDayNames.join(', ')
      return t('cronBuilder.weeklyAt', { days: daysStr, time: `${hour12}:${state.minute.toString().padStart(2, '0')} ${ampm}` })
    }
    case 'monthly': {
      const hour12 = state.hour === 0 ? 12 : state.hour > 12 ? state.hour - 12 : state.hour
      const ampm = state.hour >= 12 ? t('cronBuilder.pm') : t('cronBuilder.am')
      const suffix = state.dayOfMonth === 1 ? 'st' : state.dayOfMonth === 2 ? 'nd' : state.dayOfMonth === 3 ? 'rd' : 'th'
      return t('cronBuilder.monthlyOn', { day: `${state.dayOfMonth}${suffix}`, time: `${hour12}:${state.minute.toString().padStart(2, '0')} ${ampm}` })
    }
    case 'custom': return t('cronBuilder.customSchedule', { cron: state.customCron })
    default: return ''
  }
}

const TABS: { value: Frequency; icon: React.ReactNode; key: string }[] = [
  { value: 'minute', icon: <Timer size={13} />, key: 'cronBuilder.tabs.minutes' },
  { value: 'hourly', icon: <Clock size={13} />, key: 'cronBuilder.tabs.hourly' },
  { value: 'daily', icon: <Calendar size={13} />, key: 'cronBuilder.tabs.daily' },
  { value: 'weekly', icon: <CalendarDays size={13} />, key: 'cronBuilder.tabs.weekly' },
  { value: 'monthly', icon: <CalendarRange size={13} />, key: 'cronBuilder.tabs.monthly' },
  { value: 'custom', icon: <Code size={13} />, key: 'cronBuilder.tabs.custom' },
]

export default function CronBuilder({ value, onChange, label, helperText }: CronBuilderProps) {
  const { t } = useTranslation()
  const [state, setState] = useState<CronState>(parseCron(value))

  useEffect(() => { setState(parseCron(value)) }, [value])

  const handleStateChange = (newState: Partial<CronState>) => {
    const updated = { ...state, ...newState }
    setState(updated)
    onChange(buildCron(updated))
  }

  const hour12 = state.hour === 0 ? 12 : state.hour > 12 ? state.hour - 12 : state.hour
  const ampm = state.hour >= 12 ? 'PM' : 'AM'

  const handleTimeChange = (h12: number, min: number, ap: 'AM' | 'PM') => {
    let hour24 = h12
    if (ap === 'AM' && h12 === 12) hour24 = 0
    else if (ap === 'PM' && h12 !== 12) hour24 = h12 + 12
    handleStateChange({ hour: hour24, minute: min })
  }

  const TimeInput = () => (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={hour12}
        onChange={(e) => handleTimeChange(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)), state.minute, ampm as 'AM' | 'PM')}
        min={1} max={12}
        className="w-12 text-center text-sm px-1.5 py-1 h-8"
      />
      <span className="text-sm text-muted-foreground font-medium">:</span>
      <Input
        type="number"
        value={state.minute.toString().padStart(2, '0')}
        onChange={(e) => handleTimeChange(hour12, Math.max(0, Math.min(59, parseInt(e.target.value) || 0)), ampm as 'AM' | 'PM')}
        min={0} max={59}
        className="w-12 text-center text-sm px-1.5 py-1 h-8"
      />
      <Select value={ampm} onValueChange={(v) => handleTimeChange(hour12, state.minute, v as 'AM' | 'PM')}>
        <SelectTrigger className="w-16 h-8 text-sm px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">{t('cronBuilder.am')}</SelectItem>
          <SelectItem value="PM">{t('cronBuilder.pm')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="flex flex-col gap-1.5">
      {label && <p className="text-xs text-muted-foreground ml-1">{label}</p>}

      <div className="rounded-lg border border-border overflow-hidden">
        {/* Frequency tabs */}
        <div className="border-b border-border bg-muted/30 p-1">
          <div className="flex w-full gap-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleStateChange({ frequency: tab.value })}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 h-7 px-1 rounded text-xs font-semibold transition-colors',
                  state.frequency === tab.value
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{t(tab.key)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration area — fixed height */}
        <div className="px-4 flex items-center justify-center" style={{ height: 85 }}>
          {state.frequency === 'minute' && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{t('cronBuilderComponent.runEvery')}</span>
              <Input
                type="number"
                value={state.minuteInterval}
                onChange={(e) => handleStateChange({ minuteInterval: Math.max(1, parseInt(e.target.value) || 1) })}
                min={1} max={59}
                className="w-16 text-center text-sm h-8"
              />
              <span className="text-sm">{t('cronBuilderComponent.minutesSuffix')}</span>
            </div>
          )}

          {state.frequency === 'hourly' && (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-sm">{t('cronBuilderComponent.runEvery')}</span>
              <Input
                type="number"
                value={state.hourInterval}
                onChange={(e) => handleStateChange({ hourInterval: Math.max(1, parseInt(e.target.value) || 1) })}
                min={1} max={23}
                className="w-16 text-center text-sm h-8"
              />
              <span className="text-sm">{t('cronBuilderComponent.hoursAtMinute')}</span>
              <Input
                type="number"
                value={state.startingMinute}
                onChange={(e) => handleStateChange({ startingMinute: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                min={0} max={59}
                className="w-16 text-center text-sm h-8"
              />
              <span className="text-sm">{t('cronBuilderComponent.pastTheHour')}</span>
            </div>
          )}

          {state.frequency === 'daily' && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{t('cronBuilderComponent.runDailyAt')}</span>
              <TimeInput />
            </div>
          )}

          {state.frequency === 'weekly' && (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex items-center gap-2">
                <span className="text-sm">{t('cronBuilderComponent.runOn')}</span>
                <div className="flex gap-0.5">
                  {DAYS.map((d, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            const newSelected = [...state.selectedDays]
                            newSelected[i] = !newSelected[i]
                            handleStateChange({ selectedDays: newSelected })
                          }}
                          className={cn(
                            'w-6 h-6 rounded-full text-xs font-semibold transition-colors border',
                            state.selectedDays[i]
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                          )}
                        >
                          {d}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{DAY_NAMES[i]}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{t('cronBuilderComponent.at')}</span>
                <TimeInput />
              </div>
            </div>
          )}

          {state.frequency === 'monthly' && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{t('cronBuilderComponent.runOnDay')}</span>
              <Select
                value={String(state.dayOfMonth)}
                onValueChange={(v) => handleStateChange({ dayOfMonth: parseInt(v) })}
              >
                <SelectTrigger className="w-16 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)} className="text-sm">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm">{t('cronBuilderComponent.at')}</span>
              <TimeInput />
            </div>
          )}

          {state.frequency === 'custom' && (
            <div className="relative w-full">
              <Code size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={state.customCron}
                onChange={(e) => handleStateChange({ customCron: e.target.value })}
                placeholder="* * * * *"
                className="pl-8 font-mono text-sm"
              />
            </div>
          )}
        </div>

        {/* Preview footer */}
        <div className="border-t border-border px-4 py-2 bg-primary/5 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-primary">{generatePreview(state, t)}</span>
          <span className="font-mono text-xs bg-background px-2 py-1 rounded border border-border">
            {buildCron(state)}
          </span>
        </div>
      </div>

      {helperText && <p className="text-xs text-muted-foreground ml-1">{helperText}</p>}
    </div>
  )
}
