import type { Role } from "@/lib/supabase/types";

export const RMAC_ORG_SLUG = "alofi-south-rmac";
export const RMAC_VILLAGE_SLUG = "alofi-south";
export const RMAC_EVIDENCE_BUCKET = "rmac-evidence";
export const RMAC_REVIEW_ROLES: Role[] = ["analyst", "admin", "deqode_admin"];

export const RMAC_ACTION_AREAS = [
  { id: "marine", label: "Marine biodiversity", group: "Conservation" },
  { id: "fish", label: "Sustainable fisheries", group: "Fisheries" },
  { id: "culture", label: "Taoga & cultural practice", group: "Culture" },
  { id: "pollution", label: "Pollution & waste", group: "Environment" },
  { id: "tourism", label: "Responsible tourism", group: "Tourism" },
  { id: "legal", label: "Legal framework", group: "Governance" },
  { id: "climate", label: "Climate resilience", group: "Climate" },
  { id: "capacity", label: "Capacity building", group: "Community" },
  { id: "other", label: "Other / general", group: "General" },
] as const;

export type RmacActionArea = (typeof RMAC_ACTION_AREAS)[number]["id"];
export type RmacStatus = "pending" | "approved" | "returned";
export type RmacVisibility = "committee" | "approved_reporting";

