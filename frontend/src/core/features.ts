export type Plan = 'community' | 'pro' | 'enterprise'

// Mirror of app/core/features.py — keep in sync when adding features.
//
// BorgScale is AGPL-3.0 and runs unrestricted: every feature is available on
// every instance. The `Plan` union and this map survive only because
// /api/system/info publishes them and announcement targeting deserializes them.
export const FEATURES = {
  borg_v2: 'community',
  multi_user: 'community',
  extra_users: 'community',
  rbac: 'community',
} as const satisfies Record<string, Plan>

export type Feature = keyof typeof FEATURES

export const PLAN_LABEL: Record<Plan, string> = {
  community: 'Community',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export function planIncludes(_current: Plan, _required: Plan): boolean {
  return true
}

export function canAccess(_plan: Plan, _feature: Feature): boolean {
  return true
}
