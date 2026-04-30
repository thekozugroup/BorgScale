import { Skeleton } from '@/components/ui/skeleton'
import VersionChip from './VersionChip'

interface SystemInfo {
  app_version: string
  borg_version: string | null
  borg2_version: string | null
}

interface SidebarVersionInfoProps {
  systemInfo: SystemInfo | null
}

export default function SidebarVersionInfo({ systemInfo }: SidebarVersionInfoProps) {
  return (
    <div className="mt-auto border-t border-border px-3 pt-2 pb-3">
      {systemInfo ? (
        <div className="flex flex-wrap gap-1">
          <VersionChip label="UI" version={systemInfo.app_version} />
          {systemInfo.borg_version && (
            <VersionChip label="B1" version={systemInfo.borg_version.replace(/^borg\s*/i, '')} />
          )}
          {systemInfo.borg2_version && (
            <VersionChip
              label="B2"
              version={systemInfo.borg2_version.replace(/^borg2\s*/i, '')}
              accent
            />
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-4 w-[118px] rounded" />
          <Skeleton className="h-4 w-[54px] rounded" />
          <Skeleton className="h-4 w-[70px] rounded" />
        </div>
      )}
    </div>
  )
}
