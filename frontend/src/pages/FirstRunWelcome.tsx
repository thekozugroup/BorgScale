import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HardDrive, Search, Server } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '../hooks/usePageTitle'

interface Tile {
  icon: typeof HardDrive
  titleKey: string
  descKey: string
  ctaKey: string
  to: string
  testId: string
}

const TILES: Tile[] = [
  {
    icon: HardDrive,
    titleKey: 'firstRun.tile.new.title',
    descKey: 'firstRun.tile.new.desc',
    ctaKey: 'firstRun.tile.new.cta',
    to: '/guided-setup',
    testId: 'firstrun-tile-new',
  },
  {
    icon: Search,
    titleKey: 'firstRun.tile.discoverLocal.title',
    descKey: 'firstRun.tile.discoverLocal.desc',
    ctaKey: 'firstRun.tile.discoverLocal.cta',
    to: '/repositories?wizard=discover-local',
    testId: 'firstrun-tile-discover-local',
  },
  {
    icon: Server,
    titleKey: 'firstRun.tile.discoverRemote.title',
    descKey: 'firstRun.tile.discoverRemote.desc',
    ctaKey: 'firstRun.tile.discoverRemote.cta',
    to: '/repositories?wizard=discover-remote',
    testId: 'firstrun-tile-discover-remote',
  },
]

export default function FirstRunWelcome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  usePageTitle(t('firstRun.title'))

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">{t('firstRun.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('firstRun.subtitle')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {TILES.map((tile) => {
            const Icon = tile.icon
            return (
              <Card
                key={tile.to}
                role="button"
                tabIndex={0}
                onClick={() => navigate(tile.to)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(tile.to)
                  }
                }}
                className="cursor-pointer transition hover:ring-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid={tile.testId}
              >
                <CardHeader className="pb-2">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{t(tile.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{t(tile.descKey)}</p>
                  <Button variant="secondary" size="sm" className="w-full">
                    {t(tile.ctaKey)}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">{t('firstRun.helpLink')}</p>
      </div>
    </div>
  )
}
