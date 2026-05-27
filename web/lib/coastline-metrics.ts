/**
 * Pure helpers for coastline metrics — mirrors the Python Otsu fallback
 * logic in web/api/analyse.py so both runtimes share the same rule.
 */

/**
 * Decide whether to fall back to `mndwi > 0` instead of the Otsu threshold.
 *
 * Per .planning/phases/05-sids-data-activation/05-RESEARCH.md Pitfall 2:
 * - histogramTotalCount < 100 (cloud-heavy / tiny AOI) → fall back
 * - threshold outside (-0.8, 0.8) → degenerate; fall back
 */
export function otsuFallback(
  threshold: number,
  histogramTotalCount: number
): boolean {
  if (histogramTotalCount < 100) return true;
  if (threshold < -0.8 || threshold > 0.8) return true;
  return false;
}
