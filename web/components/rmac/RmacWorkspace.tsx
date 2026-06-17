"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  RMAC_ACTION_AREAS,
  type RmacActionArea,
  type RmacStatus,
} from "@/lib/rmac/constants";
import styles from "./RmacWorkspace.module.css";

type Tab = "log" | "history" | "review";

interface Evidence {
  id: string;
  originalName: string;
  url: string | null;
}

interface Activity {
  id: string;
  reference_code: string;
  created_by: string;
  activity_date: string;
  action_area: RmacActionArea;
  description: string;
  people_count: number | null;
  people_notes: string | null;
  spend_nzd: number | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  location_accuracy_m: number | null;
  visibility: "committee" | "approved_reporting";
  status: RmacStatus;
  review_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  rmac_activity_evidence: Evidence[];
  can_resubmit?: boolean;
}

interface Draft {
  activityDate: string;
  actionArea: RmacActionArea | "";
  description: string;
  peopleCount: string;
  peopleNotes: string;
  spendNzd: string;
  latitude: string;
  longitude: string;
  locationName: string;
  locationAccuracyM: string;
  visibility: "committee" | "approved_reporting";
  photoConsentConfirmed: boolean;
}

const DRAFT_KEY = "deqode-earth:rmac:alofi-south:draft";

const PREVIEW_ACTIVITIES: Activity[] = [
  {
    id: "preview-approved",
    reference_code: "AS-20260612-REEF01",
    created_by: "preview",
    activity_date: "2026-06-12",
    action_area: "marine",
    description:
      "Completed a reef health walk and recorded coral stress, shoreline debris and access conditions.",
    people_count: 9,
    people_notes: "RMAC members and youth monitors",
    spend_nzd: 185,
    latitude: -19.059,
    longitude: -169.918,
    location_name: "Alofi South reef access",
    location_accuracy_m: 12,
    visibility: "approved_reporting",
    status: "approved",
    review_notes: "Evidence checked and approved for committee reporting.",
    submitted_at: "2026-06-12T20:00:00Z",
    reviewed_at: "2026-06-13T01:00:00Z",
    rmac_activity_evidence: [],
  },
  {
    id: "preview-pending",
    reference_code: "AS-20260614-COAST2",
    created_by: "preview",
    activity_date: "2026-06-14",
    action_area: "pollution",
    description:
      "Removed shoreline waste from the southern access track and documented material requiring collection.",
    people_count: 6,
    people_notes: "Community clean-up team",
    spend_nzd: 72.5,
    latitude: null,
    longitude: null,
    location_name: "Southern coastal track",
    location_accuracy_m: null,
    visibility: "committee",
    status: "pending",
    review_notes: null,
    submitted_at: "2026-06-14T21:30:00Z",
    reviewed_at: null,
    rmac_activity_evidence: [],
  },
];

function todayInNiue() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Niue",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

const EMPTY_DRAFT: Draft = {
  activityDate: todayInNiue(),
  actionArea: "",
  description: "",
  peopleCount: "",
  peopleNotes: "",
  spendNzd: "",
  latitude: "",
  longitude: "",
  locationName: "",
  locationAccuracyM: "",
  visibility: "committee",
  photoConsentConfirmed: false,
};

function areaLabel(id: RmacActionArea) {
  return RMAC_ACTION_AREAS.find((area) => area.id === id)?.label ?? id;
}

function statusLabel(status: RmacStatus) {
  if (status === "approved") return "Approved";
  if (status === "returned") return "Returned";
  return "Pending review";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Pacific/Niue",
  }).format(new Date(`${value}T12:00:00-11:00`));
}

export function RmacWorkspace({
  userEmail,
  canReview,
  previewMode = false,
}: {
  userEmail: string;
  canReview: boolean;
  previewMode?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("log");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [activities, setActivities] = useState<Activity[]>(
    previewMode ? PREVIEW_ACTIVITIES : []
  );
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  const loadActivities = useCallback(async () => {
    if (previewMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/rmac/activities", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Activities could not be loaded.");
      } else {
        setActivities(payload.activities ?? []);
      }
    } catch {
      setError("Activity history is unavailable. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [previewMode]);

  useEffect(() => {
    if (previewMode) {
      setLoading(false);
      return;
    }
    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        setDraft({ ...EMPTY_DRAFT, ...JSON.parse(saved) });
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }
    void loadActivities();
  }, [loadActivities, previewMode]);

  useEffect(() => {
    if (previewMode) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, previewMode]);

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  const pendingCount = useMemo(
    () => activities.filter((activity) => activity.status === "pending").length,
    [activities]
  );
  const approvedCount = useMemo(
    () => activities.filter((activity) => activity.status === "approved").length,
    [activities]
  );

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function chooseFiles(nextFiles: File[]) {
    previews.forEach((url) => URL.revokeObjectURL(url));
    const selected = nextFiles.slice(0, 4);
    setFiles(selected);
    setPreviews(selected.map((file) => URL.createObjectURL(file)));
  }

  function correctActivity(activity: Activity) {
    setEditingActivityId(activity.id);
    setDraft({
      activityDate: activity.activity_date,
      actionArea: activity.action_area,
      description: activity.description,
      peopleCount: activity.people_count?.toString() ?? "",
      peopleNotes: activity.people_notes ?? "",
      spendNzd: activity.spend_nzd?.toString() ?? "",
      latitude: activity.latitude?.toString() ?? "",
      longitude: activity.longitude?.toString() ?? "",
      locationName: activity.location_name ?? "",
      locationAccuracyM: activity.location_accuracy_m?.toString() ?? "",
      visibility: activity.visibility,
      photoConsentConfirmed: false,
    });
    chooseFiles([]);
    setMessage(`Correcting ${activity.reference_code}. Existing evidence will be kept.`);
    setError(null);
    setTab("log");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelCorrection() {
    setEditingActivityId(null);
    setDraft({ ...EMPTY_DRAFT, activityDate: todayInNiue() });
    setMessage(null);
  }

  function locate() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Location is not available on this device. Add a place name instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateDraft("latitude", position.coords.latitude.toFixed(6));
        updateDraft("longitude", position.coords.longitude.toFixed(6));
        updateDraft("locationAccuracyM", position.coords.accuracy.toFixed(1));
        setLocating(false);
      },
      () => {
        setError("We could not pin your location. Add a place name or try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  async function submitActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (previewMode) {
      setError(null);
      setMessage("Preview only. Sign in to submit this activity.");
      return;
    }
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const formData = new FormData();
    Object.entries(draft).forEach(([key, value]) => {
      formData.set(key, String(value));
    });
    files.forEach((file) => formData.append("evidence", file));
    if (editingActivityId) formData.set("activityId", editingActivityId);

    try {
      const response = await fetch("/api/rmac/activities", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "The activity could not be submitted.");
        return;
      }

      setMessage(`${payload.referenceCode} was submitted for committee review.`);
      setEditingActivityId(null);
      setDraft({ ...EMPTY_DRAFT, activityDate: todayInNiue() });
      setFiles([]);
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
      window.localStorage.removeItem(DRAFT_KEY);
      await loadActivities();
      setTab("history");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("The connection dropped. Your written draft is still saved on this device.");
    } finally {
      setSubmitting(false);
    }
  }

  async function review(activity: Activity, status: "approved" | "returned") {
    if (previewMode) {
      setError(null);
      setMessage(`Preview only. ${activity.reference_code} was not changed.`);
      return;
    }
    setError(null);
    setReviewingId(activity.id);
    try {
      const response = await fetch(`/api/rmac/activities/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewNotes: reviewNotes[activity.id] ?? "",
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "The review could not be saved.");
        return;
      }
      setMessage(`${activity.reference_code} is now ${status}.`);
      await loadActivities();
    } catch {
      setError("The review could not be saved. Check the connection and try again.");
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.identity}>
        <div>
          <p className={styles.kicker}>Alofi South / Niue</p>
          <h1>RMAC activity log</h1>
          <p className={styles.intro}>
            A field notebook for the work already happening across reef, fisheries,
            culture and community.
          </p>
        </div>
        <div className={styles.identityStats}>
          <div>
            <strong>{activities.length}</strong>
            <span>Activities recorded</span>
          </div>
          <div>
            <strong>{approvedCount}</strong>
            <span>Approved evidence</span>
          </div>
        </div>
        <div className={styles.sovereignty}>
          <span>Village-owned evidence</span>
          <p>Committee review is required before any record enters approved reporting.</p>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.mobileBrand}>Alofi South RMAC</span>
            <p>{userEmail}</p>
          </div>
          <Link
            href={
              previewMode
                ? "/showcase/alofi-south/insights"
                : "/rmac/alofi-south/insights"
            }
            className={styles.clientView}
          >
            Client view
          </Link>
          {previewMode ? (
            <Link href="/login?next=/rmac/alofi-south" className={styles.signOut}>
              Sign in
            </Link>
          ) : (
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className={styles.signOut}>
                Sign out
              </button>
            </form>
          )}
        </header>

        <nav className={styles.tabs} aria-label="RMAC workspace">
          <button
            type="button"
            className={tab === "log" ? styles.activeTab : ""}
            onClick={() => setTab("log")}
          >
            Log activity
          </button>
          <button
            type="button"
            className={tab === "history" ? styles.activeTab : ""}
            onClick={() => setTab("history")}
          >
            History <span>{activities.length}</span>
          </button>
          {canReview && (
            <button
              type="button"
              className={tab === "review" ? styles.activeTab : ""}
              onClick={() => setTab("review")}
            >
              Review <span>{pendingCount}</span>
            </button>
          )}
        </nav>

        {(message || error) && (
          <div className={error ? styles.errorBanner : styles.successBanner} role="status">
            {error ?? message}
          </div>
        )}

        {previewMode && !message && !error && (
          <div className={styles.previewBanner} role="status">
            Showcase preview. Sample records only; nothing entered here is saved.
          </div>
        )}

        {tab === "log" && (
          <form className={styles.form} onSubmit={submitActivity}>
            <div className={styles.sectionHeading}>
              <p>{editingActivityId ? "Correct returned record" : "New evidence record"}</p>
              <div className={styles.headingRow}>
                <h2>{editingActivityId ? "Update the evidence" : "What happened?"}</h2>
                {editingActivityId && (
                  <button type="button" onClick={cancelCorrection}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <fieldset className={styles.fieldset}>
              <legend>Action area</legend>
              <p>Choose the closest part of the management plan.</p>
              <div className={styles.chips}>
                {RMAC_ACTION_AREAS.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    className={draft.actionArea === area.id ? styles.selectedChip : ""}
                    onClick={() => updateDraft("actionArea", area.id)}
                    aria-pressed={draft.actionArea === area.id}
                  >
                    <span>{area.group}</span>
                    {area.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className={styles.field}>
              <span>Activity date</span>
              <input
                type="date"
                value={draft.activityDate}
                max={todayInNiue()}
                onChange={(event) => updateDraft("activityDate", event.target.value)}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Description</span>
              <small>What did the RMAC do, who was involved, and what was the result?</small>
              <textarea
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                minLength={20}
                maxLength={2000}
                rows={5}
                placeholder="Example: Completed a reef health walk from Utuko sea track with eight community monitors..."
                required
              />
              <em>{draft.description.length}/2000</em>
            </label>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>People involved</span>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  inputMode="numeric"
                  value={draft.peopleCount}
                  onChange={(event) => updateDraft("peopleCount", event.target.value)}
                  placeholder="8"
                />
              </label>
              <label className={styles.field}>
                <span>Spend, NZD</span>
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  step="0.01"
                  inputMode="decimal"
                  value={draft.spendNzd}
                  onChange={(event) => updateDraft("spendNzd", event.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>People or partner notes</span>
              <input
                value={draft.peopleNotes}
                onChange={(event) => updateDraft("peopleNotes", event.target.value)}
                maxLength={500}
                placeholder="Optional names, groups, or organisations"
              />
            </label>

            <div className={styles.locationBlock}>
              <div>
                <span className={styles.fieldLabel}>Location</span>
                <p>
                  {draft.latitude
                    ? `${Number(draft.latitude).toFixed(5)}, ${Number(draft.longitude).toFixed(5)} · ±${Math.round(Number(draft.locationAccuracyM))}m`
                    : "No GPS location pinned"}
                </p>
              </div>
              <button type="button" onClick={locate} disabled={locating}>
                {locating ? "Locating..." : draft.latitude ? "Update GPS" : "Pin GPS"}
              </button>
            </div>

            <label className={styles.field}>
              <span>Place name</span>
              <input
                value={draft.locationName}
                onChange={(event) => updateDraft("locationName", event.target.value)}
                maxLength={200}
                placeholder="Example: Utuko sea track"
              />
            </label>

            <div className={styles.uploadBlock}>
              <div>
                <span className={styles.fieldLabel}>Evidence photos</span>
                <p>Up to four JPG, PNG, or WebP images. Maximum 10 MB each.</p>
              </div>
              <button type="button" onClick={() => fileInput.current?.click()}>
                Add photos
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                multiple
                hidden
                onChange={(event) => chooseFiles(Array.from(event.target.files ?? []))}
              />
            </div>

            {previews.length > 0 && (
              <div className={styles.previews}>
                {previews.map((url, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt={`Selected evidence ${index + 1}`} />
                ))}
              </div>
            )}

            {files.length > 0 && (
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={draft.photoConsentConfirmed}
                  onChange={(event) =>
                    updateDraft("photoConsentConfirmed", event.target.checked)
                  }
                />
                <span>
                  I confirm consent was obtained for identifiable people shown in these
                  photos.
                </span>
              </label>
            )}

            <fieldset className={styles.visibility}>
              <legend>Visibility after approval</legend>
              <label>
                <input
                  type="radio"
                  name="visibility"
                  checked={draft.visibility === "committee"}
                  onChange={() => updateDraft("visibility", "committee")}
                />
                <span>
                  <strong>Committee only</strong>
                  Kept within the Alofi South RMAC workspace.
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="visibility"
                  checked={draft.visibility === "approved_reporting"}
                  onChange={() => updateDraft("visibility", "approved_reporting")}
                />
                <span>
                  <strong>Approved reporting</strong>
                  May be included in agreed NOW Trust reporting after review.
                </span>
              </label>
            </fieldset>

            <div className={styles.submitRow}>
              <p>Your written draft is saved on this device until submission succeeds.</p>
              <button
                type="submit"
                disabled={submitting || !draft.actionArea || draft.description.length < 20}
              >
                {submitting ? "Submitting..." : "Submit for review"}
              </button>
            </div>
          </form>
        )}

        {tab === "history" && (
          <ActivityList
            activities={activities}
            loading={loading}
            emptyText="No activities have been submitted yet."
            onCorrect={correctActivity}
          />
        )}

        {tab === "review" && canReview && (
          <div className={styles.reviewList}>
            <div className={styles.sectionHeading}>
              <p>Committee review</p>
              <h2>{pendingCount} activities waiting</h2>
            </div>
            {activities
              .filter((activity) => activity.status === "pending")
              .map((activity) => (
                <article key={activity.id} className={styles.reviewItem}>
                  <ActivityDetails activity={activity} showSpend />
                  <label className={styles.field}>
                    <span>Review note</span>
                    <textarea
                      rows={3}
                      value={reviewNotes[activity.id] ?? ""}
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [activity.id]: event.target.value,
                        }))
                      }
                      placeholder="Required when returning an activity"
                    />
                  </label>
                  <div className={styles.reviewActions}>
                    <button
                      type="button"
                      className={styles.returnButton}
                      disabled={reviewingId === activity.id}
                      onClick={() => review(activity, "returned")}
                    >
                      {reviewingId === activity.id ? "Saving..." : "Return for correction"}
                    </button>
                    <button
                      type="button"
                      className={styles.approveButton}
                      disabled={reviewingId === activity.id}
                      onClick={() => review(activity, "approved")}
                    >
                      {reviewingId === activity.id ? "Saving..." : "Approve evidence"}
                    </button>
                  </div>
                </article>
              ))}
            {!loading && pendingCount === 0 && (
              <div className={styles.empty}>Nothing is waiting for review.</div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function ActivityList({
  activities,
  loading,
  emptyText,
  onCorrect,
}: {
  activities: Activity[];
  loading: boolean;
  emptyText: string;
  onCorrect: (activity: Activity) => void;
}) {
  if (loading) return <div className={styles.empty}>Loading activity history...</div>;
  if (activities.length === 0) return <div className={styles.empty}>{emptyText}</div>;

  return (
    <div className={styles.activityList}>
      <div className={styles.sectionHeading}>
        <p>Village evidence</p>
        <h2>Activity history</h2>
      </div>
      {activities.map((activity) => (
        <article key={activity.id} className={styles.activityItem}>
          <ActivityDetails activity={activity} showSpend={activity.spend_nzd !== null} />
          {activity.can_resubmit && (
            <button
              type="button"
              className={styles.correctButton}
              onClick={() => onCorrect(activity)}
            >
              Correct and resubmit
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

function ActivityDetails({
  activity,
  showSpend,
}: {
  activity: Activity;
  showSpend: boolean;
}) {
  return (
    <>
      <div className={styles.activityMeta}>
        <span className={`${styles.status} ${styles[activity.status]}`}>
          {statusLabel(activity.status)}
        </span>
        <span>{activity.reference_code}</span>
      </div>
      <h3>{areaLabel(activity.action_area)}</h3>
      <p className={styles.activityDescription}>{activity.description}</p>
      <dl className={styles.details}>
        <div>
          <dt>Date</dt>
          <dd>{formatDate(activity.activity_date)}</dd>
        </div>
        <div>
          <dt>People</dt>
          <dd>{activity.people_count ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt>Place</dt>
          <dd>{activity.location_name ?? "Not recorded"}</dd>
        </div>
        {showSpend && (
          <div>
            <dt>Spend</dt>
            <dd>
              {activity.spend_nzd === null
                ? "Not recorded"
                : `NZD ${Number(activity.spend_nzd).toLocaleString("en-NZ", {
                    minimumFractionDigits: 2,
                  })}`}
            </dd>
          </div>
        )}
      </dl>
      {activity.rmac_activity_evidence.length > 0 && (
        <div className={styles.evidenceStrip}>
          {activity.rmac_activity_evidence.map((evidence) =>
            evidence.url ? (
              <a
                href={evidence.url}
                target="_blank"
                rel="noreferrer"
                key={evidence.id}
                aria-label={`Open ${evidence.originalName}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={evidence.url} alt="" />
              </a>
            ) : null
          )}
        </div>
      )}
      {activity.review_notes && (
        <div className={styles.reviewNote}>
          <strong>Review note</strong>
          <p>{activity.review_notes}</p>
        </div>
      )}
    </>
  );
}
