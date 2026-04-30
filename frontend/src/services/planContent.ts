import type { PlanContentFeature, PlanContentManifest } from '../types/planContent'
import planContentManifestData from '../data/plan-content.json'

const MAX_SUPPORTED_VERSION = 1

export const DEFAULT_PLAN_CONTENT_MANIFEST = planContentManifestData as PlanContentManifest

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isLocalizedStringMap(value: unknown): value is Record<string, string> | undefined {
  return (
    value === undefined ||
    (typeof value === 'object' && value !== null && Object.values(value).every(isNonEmptyString))
  )
}

function isValidPlanContentFeature(feature: unknown): feature is PlanContentFeature {
  if (!feature || typeof feature !== 'object') return false

  const candidate = feature as Partial<PlanContentFeature>
  const hasVersionTarget = isNonEmptyString(candidate.available_in)
  const hasAvailability = candidate.availability !== undefined

  return (
    isNonEmptyString(candidate.id) &&
    (candidate.plan === 'community' ||
      candidate.plan === 'pro' ||
      candidate.plan === 'enterprise') &&
    isNonEmptyString(candidate.label) &&
    isLocalizedStringMap(candidate.label_localized) &&
    isNonEmptyString(candidate.description) &&
    isLocalizedStringMap(candidate.description_localized) &&
    (!hasAvailability ||
      candidate.availability === 'included' ||
      candidate.availability === 'coming_soon') &&
    (!hasVersionTarget || !hasAvailability) &&
    (!hasVersionTarget || candidate.availability !== 'included') &&
    (candidate.available_in === undefined || hasVersionTarget)
  )
}

export async function fetchPlanContentManifest(): Promise<PlanContentManifest> {
  const data = planContentManifestData as Partial<PlanContentManifest>
  const version =
    typeof data.version === 'number' ? data.version : DEFAULT_PLAN_CONTENT_MANIFEST.version
  if (version > MAX_SUPPORTED_VERSION) {
    return DEFAULT_PLAN_CONTENT_MANIFEST
  }
  return {
    version,
    generated_at: data.generated_at,
    features: Array.isArray(data.features)
      ? data.features.filter(isValidPlanContentFeature)
      : DEFAULT_PLAN_CONTENT_MANIFEST.features,
  }
}
