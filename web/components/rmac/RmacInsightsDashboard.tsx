"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildRmacInsights,
  type RmacInsightActivity,
  type RmacInsights,
} from "@/lib/rmac/insights";
import { RmacInsightsMap } from "./RmacInsightsMap";
import styles from "./RmacInsightsDashboard.module.css";

type Period = "all" | "30" | "90" | "year";

export const PREVIEW_INSIGHT_ACTIVITIES: RmacInsightActivity[] = [
  {
    id: "preview-1",
    referenceCode: "AS-20260612-REEF01",
    activityDate: "2026-06-12",
    actionArea: "marine",
    description:
      "Reef health walk recorded coral condition, debris and access changes with community monitors.",
    peopleCount: 9,
    spendNzd: 185,
    latitude: -19.0568,
    longitude: -169.9185,
    locationName: "Alofi South reef access",
    reviewedAt: "2026-06-13T01:00:00Z",
    evidence: [
      {
        id: "evidence-1",
        originalName: "reef-health-walk.jpg",
        url: "/alofi-south-reef.png",
      },
    ],
  },
  {
    id: "preview-2",
    referenceCode: "AS-20260610-FISH02",
    activityDate: "2026-06-10",
    actionArea: "fish",
    description:
      "Fishers shared catch observations and agreed monitoring points for the next seasonal review.",
    peopleCount: 14,
    spendNzd: 240,
    latitude: -19.0612,
    longitude: -169.9147,
    locationName: "Southern fishing access",
    reviewedAt: "2026-06-11T02:30:00Z",
    evidence: [],
  },
  {
    id: "preview-3",
    referenceCode: "AS-20260528-WASTE3",
    activityDate: "2026-05-28",
    actionArea: "pollution",
    description:
      "Community clean-up removed shoreline waste and documented material requiring council collection.",
    peopleCount: 18,
    spendNzd: 320,
    latitude: -19.0529,
    longitude: -169.923,
    locationName: "Southern coastal track",
    reviewedAt: "2026-05-30T00:15:00Z",
    evidence: [],
  },
  {
    id: "preview-4",
    referenceCode: "AS-20260516-CULT04",
    activityDate: "2026-05-16",
    actionArea: "culture",
    description:
      "Recorded local place knowledge and cultural practice relevant to coastal management decisions.",
    peopleCount: 11,
    spendNzd: 150,
    latitude: -19.0581,
    longitude: -169.925,
    locationName: "Alofi South meeting area",
    reviewedAt: "2026-05-18T04:00:00Z",
    evidence: [],
  },
  {
    id: "preview-5",
    referenceCode: "AS-20260422-CLIM05",
    activityDate: "2026-04-22",
    actionArea: "climate",
    description:
      "Mapped erosion observations and identified two locations for repeat seasonal photography.",
    peopleCount: 7,
    spendNzd: 95,
    latitude: -19.064,
    longitude: -169.921,
    locationName: "South-west shoreline",
    reviewedAt: "2026-04-24T01:45:00Z",
    evidence: [],
  },
];

function formatDate(value: string | null) {
  if (!value) return "No approved records";
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Pacific/Niue",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00-11:00` : value));
}

function filterByPeriod(activities: RmacInsightActivity[], period: Period) {
  if (period === "all") return activities;
  const now = new Date();
  const threshold = new Date(now);
  if (period === "year") threshold.setMonth(0, 1);
  else threshold.setDate(threshold.getDate() - Number(period));
  return activities.filter(
    (activity) => new Date(`${activity.activityDate}T12:00:00-11:00`) >= threshold
  );
}

export function RmacInsightsDashboard({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const [period, setPeriod] = useState<Period>("all");
  const [sourceActivities, setSourceActivities] = useState<RmacInsightActivity[]>(
    previewMode ? PREVIEW_INSIGHT_ACTIVITIES : []
  );
  const [loading, setLoading] = useState(!previewMode);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    if (previewMode) return;
    setLoading(true);
    try {
      const response = await fetch("/api/rmac/insights", { cache: "no-store" });
      const payload = (await response.json()) as RmacInsights & { error?: string };
      if (!response.ok) throw new Error(payload.error);
      setSourceActivities(payload.activities ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error && loadError.message
          ? loadError.message
          : "Approved reporting is unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, [previewMode]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const insights = useMemo(
    () => buildRmacInsights(filterByPeriod(sourceActivities, period)),
    [period, sourceActivities]
  );
  const activeAreas = insights.actionAreas.filter((area) => area.count > 0);
  const maxAreaCount = Math.max(1, ...activeAreas.map((area) => area.count));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>DEQODE EARTH / ALOFI SOUTH</p>
          <h1>RMAC intelligence</h1>
          <p>Approved village evidence translated into client-ready reporting.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={previewMode ? "/showcase/alofi-south" : "/rmac/alofi-south"}>
            Collection workspace
          </Link>
          {!previewMode && <span>Approved records only</span>}
        </div>
      </header>

      {previewMode && (
        <div className={styles.preview}>
          Showcase preview using sample records. No production village data is shown.
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.controls} aria-label="Reporting filters">
        <div>
          <span>Reporting period</span>
          <div className={styles.segmented}>
            {(
              [
                ["all", "All"],
                ["30", "30 days"],
                ["90", "90 days"],
                ["year", "2026"],
              ] as Array<[Period, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={period === value ? styles.active : ""}
                onClick={() => setPeriod(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p>
          Last committee approval{" "}
          <strong>{formatDate(insights.reporting.lastApprovedAt)}</strong>
        </p>
      </section>

      <section className={styles.metrics} aria-label="Approved activity metrics">
        <Metric value={insights.totals.activities} label="Approved activities" />
        <Metric value={insights.totals.people} label="People participating" />
        <Metric
          value={`$${insights.totals.spendNzd.toLocaleString("en-NZ")}`}
          label="Recorded spend NZD"
        />
        <Metric
          value={`${insights.totals.actionAreasActive}/9`}
          label="Plan areas active"
        />
      </section>

      <section className={styles.mapBand}>
        <div className={styles.mapCopy}>
          <p className={styles.eyebrow}>PLACE-BASED EVIDENCE</p>
          <h2>Approved activity map</h2>
          <p>
            Each point is an approved village record with its source reference and
            committee review history preserved.
          </p>
          <dl>
            <div>
              <dt>Latest activity</dt>
              <dd>{formatDate(insights.reporting.latestActivityDate)}</dd>
            </div>
            <div>
              <dt>Evidence files</dt>
              <dd>{insights.totals.evidence}</dd>
            </div>
          </dl>
        </div>
        <div className={styles.map}>
          <RmacInsightsMap activities={insights.activities} />
        </div>
      </section>

      <section className={styles.lowerGrid}>
        <div className={styles.progress}>
          <div className={styles.sectionTitle}>
            <p className={styles.eyebrow}>MANAGEMENT PLAN</p>
            <h2>Action-area progress</h2>
          </div>
          {activeAreas.length === 0 && !loading ? (
            <p className={styles.empty}>No approved activities in this period.</p>
          ) : (
            activeAreas.map((area) => (
              <div className={styles.progressRow} key={area.id}>
                <div>
                  <strong>{area.label}</strong>
                  <span>{area.people} people</span>
                </div>
                <div className={styles.track}>
                  <span style={{ width: `${(area.count / maxAreaCount) * 100}%` }} />
                </div>
                <b>{area.count}</b>
              </div>
            ))
          )}
        </div>

        <div className={styles.timeline}>
          <div className={styles.sectionTitle}>
            <p className={styles.eyebrow}>APPROVED EVIDENCE</p>
            <h2>Activity timeline</h2>
          </div>
          {loading ? (
            <p className={styles.empty}>Loading approved records...</p>
          ) : (
            insights.activities.slice(0, 6).map((activity) => (
              <article key={activity.id}>
                <time>{formatDate(activity.activityDate)}</time>
                <div>
                  <strong>{activity.locationName ?? activity.referenceCode}</strong>
                  <p>{activity.description}</p>
                  <span>{activity.referenceCode}</span>
                </div>
                {activity.evidence[0]?.url && (
                  <a
                    href={activity.evidence[0].url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Evidence
                  </a>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
