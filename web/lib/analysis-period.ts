export const BASELINE_YEAR = 2019;

export function getLatestCompleteDrySeasonYear(now = new Date()): number {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  return month >= 10 ? year : year - 1;
}

export function getAnalysisPeriod(now = new Date()) {
  const currentYear = getLatestCompleteDrySeasonYear(now);

  return {
    baselineYear: BASELINE_YEAR,
    currentYear,
    baselineStart: `${BASELINE_YEAR}-01-01`,
    baselineEnd: `${BASELINE_YEAR}-12-31`,
    currentStart: `${currentYear}-01-01`,
    currentEnd: `${currentYear}-12-31`,
  };
}
