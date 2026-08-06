import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'

/**
 * Result of a path validation call. We expose the fields documented
 * for the future GuidedSetup (Wave 14) hook (`is_dir`, `is_empty`,
 * `writable`) while also surfacing the fields the current backend
 * endpoint returns (`is_directory`, `is_borg_repo`). `is_dir` mirrors
 * `is_directory` so callers can rely on either name.
 */
export interface PathValidation {
  exists: boolean
  is_dir?: boolean
  is_directory?: boolean
  is_empty?: boolean
  writable?: boolean
  is_borg_repo?: boolean
  path?: string
  error?: string
}

interface ValidatePathArgs {
  path: string
  connection_type?: 'local' | 'ssh'
  ssh_key_id?: number
  host?: string
  username?: string
  port?: number
}

/**
 * Validate a filesystem path before submission. Used by GuidedSetup
 * (Wave 14) to give users immediate "path looks good / cannot use this"
 * feedback when they pick a repository location.
 *
 * The current backend endpoint (`POST /api/filesystem/validate-path`)
 * receives parameters as query string and returns
 * `{exists, is_directory, is_borg_repo, path}`. We mirror
 * `is_directory` onto `is_dir` so future callers expecting the
 * Wave 14 shape keep working when the backend gains
 * `is_empty` / `writable` fields.
 */
export function useValidatePath() {
  return useMutation({
    mutationFn: async (input: string | ValidatePathArgs): Promise<PathValidation> => {
      const args: ValidatePathArgs = typeof input === 'string' ? { path: input } : input
      try {
        const params: Record<string, string | number> = {
          path: args.path,
          connection_type: args.connection_type ?? 'local',
        }
        if (args.ssh_key_id != null) params.ssh_key_id = args.ssh_key_id
        if (args.host) params.host = args.host
        if (args.username) params.username = args.username
        if (args.port != null) params.port = args.port

        const resp = await api.post('/filesystem/validate-path', null, {
          params,
        })
        const data = (resp.data ?? {}) as PathValidation
        return {
          ...data,
          is_dir: data.is_dir ?? data.is_directory,
        }
      } catch (err) {
        const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
          ?.detail
        const message =
          typeof detail === 'string'
            ? detail
            : detail && typeof detail === 'object' && 'key' in detail
              ? String((detail as { key: string }).key)
              : 'invalid'
        return { exists: false, error: message }
      }
    },
  })
}
