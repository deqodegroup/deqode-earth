import { RMAC_ACTION_AREAS, type RmacActionArea } from "@/lib/rmac/constants";

export interface RmacInsightActivity {
  id: string;
  referenceCode: string;
  activityDate: string;
  actionArea: RmacActionArea;
  description: string;
  peopleCount: number | null;
  spendNzd: number | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  reviewedAt: string | null;
  evidence: Array<{
    id: string;
    originalName: string;
    url: string | null;
  }>;
}

export interface RmacInsights {
  activities: RmacInsightActivity[];
  totals: {
    activities: number;
    people: number;
    spendNzd: number;
    evidence: number;
    actionAreasActive: number;
  };
  actionAreas: Array<{
    id: RmacActionArea;
    label: string;
    category: string;
    count: number;
    people: number;
    spendNzd: number;
  }>;
  reporting: {
    lastApprovedAt: string | null;
    latestActivityDate: string | null;
    periodStart: string | null;
    periodEnd: string | null;
  };
}

export function buildRmacInsights(
  activities: RmacInsightActivity[]
): RmacInsights {
  const actionAreas = RMAC_ACTION_AREAS.map((area) => {
    const matching = activities.filter((activity) => activity.actionArea === area.id);
    return {
      id: area.id,
      label: area.label,
      category: area.group,
      count: matching.length,
      people: matching.reduce((sum, activity) => sum + (activity.peopleCount ?? 0), 0),
      spendNzd: matching.reduce((sum, activity) => sum + (activity.spendNzd ?? 0), 0),
    };
  });
  const activityDates = activities.map((activity) => activity.activityDate).sort();
  const reviewDates = activities
    .map((activity) => activity.reviewedAt)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    activities,
    totals: {
      activities: activities.length,
      people: activities.reduce(
        (sum, activity) => sum + (activity.peopleCount ?? 0),
        0
      ),
      spendNzd: activities.reduce(
        (sum, activity) => sum + (activity.spendNzd ?? 0),
        0
      ),
      evidence: activities.reduce(
        (sum, activity) => sum + activity.evidence.length,
        0
      ),
      actionAreasActive: actionAreas.filter((area) => area.count > 0).length,
    },
    actionAreas,
    reporting: {
      lastApprovedAt: reviewDates.at(-1) ?? null,
      latestActivityDate: activityDates.at(-1) ?? null,
      periodStart: activityDates[0] ?? null,
      periodEnd: activityDates.at(-1) ?? null,
    },
  };
}
