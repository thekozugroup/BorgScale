import { Box, Skeleton } from '@mui/material'
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
    <Box sx={{ mt: 'auto', px: 2, pt: 1, pb: 1.5, borderTop: 1, borderColor: 'divider' }}>
      {/* Version chips */}
      {systemInfo ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
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
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          <Skeleton variant="rounded" width={118} height={16} sx={{ borderRadius: '4px' }} />
          <Skeleton variant="rounded" width={54} height={16} sx={{ borderRadius: '4px' }} />
          <Skeleton variant="rounded" width={70} height={16} sx={{ borderRadius: '4px' }} />
        </Box>
      )}
    </Box>
  )
}
