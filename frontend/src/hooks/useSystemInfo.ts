import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export interface SystemInfo {
  app_version: string
  borg_version: string | null
  borg2_version: string | null
}

async function fetchSystemInfo(): Promise<SystemInfo> {
  const res = await api.get<SystemInfo>('/system/info')
  return res.data
}

export function useSystemInfo() {
  return useQuery<SystemInfo>({
    queryKey: ['system-info'],
    queryFn: fetchSystemInfo,
    staleTime: 5 * 60 * 1000,
  })
}
