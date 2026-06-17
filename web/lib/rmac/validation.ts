import {
  RMAC_ACTION_AREAS,
  type RmacActionArea,
  type RmacVisibility,
} from "@/lib/rmac/constants";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 4;

function dateInNiue() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Niue",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function isCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export interface RmacSubmission {
  activityDate: string;
  actionArea: RmacActionArea;
  description: string;
  peopleCount: number | null;
  peopleNotes: string | null;
  spendNzd: number | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  locationAccuracyM: number | null;
  visibility: RmacVisibility;
  photoConsentConfirmed: boolean;
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function optionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function validateRmacSubmission(formData: FormData):
  | { value: RmacSubmission; files: File[] }
  | { error: string } {
  const activityDate = String(formData.get("activityDate") ?? "");
  const actionArea = String(formData.get("actionArea") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "committee");
  const peopleCount = optionalNumber(formData.get("peopleCount"));
  const spendNzd = optionalNumber(formData.get("spendNzd"));
  const latitude = optionalNumber(formData.get("latitude"));
  const longitude = optionalNumber(formData.get("longitude"));
  const locationAccuracyM = optionalNumber(formData.get("locationAccuracyM"));
  const peopleNotes = optionalText(formData.get("peopleNotes"));
  const locationName = optionalText(formData.get("locationName"));
  const photoConsentConfirmed = formData.get("photoConsentConfirmed") === "true";
  const files = formData
    .getAll("evidence")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(activityDate) || !isCalendarDate(activityDate)) {
    return { error: "Enter a valid activity date." };
  }
  if (activityDate > dateInNiue()) {
    return { error: "Activity date cannot be in the future." };
  }
  if (!RMAC_ACTION_AREAS.some((area) => area.id === actionArea)) {
    return { error: "Select an action area." };
  }
  if (description.length < 20 || description.length > 2000) {
    return { error: "Describe the activity in 20 to 2,000 characters." };
  }
  if (
    !Number.isNaN(peopleCount) &&
    peopleCount !== null &&
    (!Number.isInteger(peopleCount) || peopleCount < 0 || peopleCount > 10000)
  ) {
    return { error: "People involved must be a whole number between 0 and 10,000." };
  }
  if (peopleNotes && peopleNotes.length > 500) {
    return { error: "People notes must be 500 characters or fewer." };
  }
  if (
    !Number.isNaN(spendNzd) &&
    spendNzd !== null &&
    (spendNzd < 0 || spendNzd > 10000000)
  ) {
    return { error: "Spend must be between NZD 0 and NZD 10,000,000." };
  }
  if (
    (latitude !== null && (Number.isNaN(latitude) || latitude < -90 || latitude > 90)) ||
    (longitude !== null && (Number.isNaN(longitude) || longitude < -180 || longitude > 180))
  ) {
    return { error: "Location coordinates are invalid." };
  }
  if (
    locationAccuracyM !== null &&
    (Number.isNaN(locationAccuracyM) || locationAccuracyM < 0 || locationAccuracyM > 100000)
  ) {
    return { error: "Location accuracy is invalid." };
  }
  if (locationName && locationName.length > 200) {
    return { error: "Place name must be 200 characters or fewer." };
  }
  if (!["committee", "approved_reporting"].includes(visibility)) {
    return { error: "Select a valid visibility setting." };
  }
  if (files.length > MAX_FILES) {
    return { error: `Attach no more than ${MAX_FILES} evidence photos.` };
  }
  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return { error: "Evidence must be a JPG, PNG, or WebP image." };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { error: "Each evidence photo must be 10 MB or smaller." };
    }
  }
  if (files.length > 0 && !photoConsentConfirmed) {
    return { error: "Confirm consent before submitting identifiable photos." };
  }

  return {
    value: {
      activityDate,
      actionArea: actionArea as RmacActionArea,
      description,
      peopleCount,
      peopleNotes,
      spendNzd,
      latitude,
      longitude,
      locationName,
      locationAccuracyM,
      visibility: visibility as RmacVisibility,
      photoConsentConfirmed,
    },
    files,
  };
}
