export type DataOperationsAgentId =
  | "refresh-gatekeeper-agent"
  | "source-health-agent"
  | "storage-steward-agent"
  | "report-request-agent"
  | "analyst-review-agent"
  | "change-watch-agent";

export type DataOperationsTaskId =
  | "manual-source-refresh"
  | "source-freshness-display"
  | "request-scoped-report-generation"
  | "historical-data-retention"
  | "workflow-failure-follow-up";

export interface DataOperationsAgent {
  id: DataOperationsAgentId;
  label: string;
  responsibility: string;
}

export interface DataOperationsTaskAssignment {
  id: DataOperationsTaskId;
  task: string;
  trigger: string;
  surfaces: string[];
  agents: DataOperationsAgentId[];
  guardrail: string;
}

export const DATA_OPERATIONS_AGENTS: DataOperationsAgent[] = [
  {
    id: "refresh-gatekeeper-agent",
    label: "Refresh Gatekeeper Agent",
    responsibility:
      "Keeps production data refreshes manual-only through workflow_dispatch and rejects cron-style background pulls.",
  },
  {
    id: "source-health-agent",
    label: "Source Health Agent",
    responsibility:
      "Owns source freshness, last-success visibility, failed refresh surfacing, and stale-data fallback posture.",
  },
  {
    id: "storage-steward-agent",
    label: "Storage Steward Agent",
    responsibility:
      "Prevents duplicate rows, unnecessary historical pulls, and storage growth that does not support an active request.",
  },
  {
    id: "report-request-agent",
    label: "Report Request Agent",
    responsibility:
      "Ensures report generation starts from an explicit user request, selected region, selected format, and supplied metrics.",
  },
  {
    id: "analyst-review-agent",
    label: "Analyst Review Agent",
    responsibility:
      "Keeps client-facing views tied to latest verified values, source dates, and uncertainty instead of implied real-time data.",
  },
  {
    id: "change-watch-agent",
    label: "Change Watch Agent",
    responsibility:
      "Owns tests and policy checks that catch schedule reintroduction, route drift, or unassigned operational tasks.",
  },
];

export const DATA_OPERATIONS_TASK_ASSIGNMENTS: DataOperationsTaskAssignment[] = [
  {
    id: "manual-source-refresh",
    task: "Refresh external datasets only when manually requested.",
    trigger: "GitHub Actions workflow_dispatch on On-Demand Data Ingestion",
    surfaces: [".github/workflows/on-demand-ingest.yml"],
    agents: [
      "refresh-gatekeeper-agent",
      "source-health-agent",
      "storage-steward-agent",
      "change-watch-agent",
    ],
    guardrail: "No schedule block is allowed on ingestion workflows.",
  },
  {
    id: "source-freshness-display",
    task: "Show source health without silently refreshing data.",
    trigger: "Page load reads /api/data-health",
    surfaces: ["web/app/api/data-health/route.ts", "web/components/command/StatusStrip.tsx"],
    agents: ["source-health-agent", "analyst-review-agent", "change-watch-agent"],
    guardrail: "Views show latest verified stored values plus freshness, not background pulls.",
  },
  {
    id: "request-scoped-report-generation",
    task: "Generate reports only after an explicit request.",
    trigger: "POST /api/report",
    surfaces: ["web/app/api/report/route.ts"],
    agents: ["report-request-agent", "analyst-review-agent", "change-watch-agent"],
    guardrail: "No scheduled or automatic report generation is assigned.",
  },
  {
    id: "historical-data-retention",
    task: "Keep historical data for audit, research, evidence, comparison, and requested reports.",
    trigger: "Manual retention workflow or explicit research/report request",
    surfaces: ["scripts/ingest/apply_retention.py", ".github/workflows/on-demand-ingest.yml"],
    agents: ["storage-steward-agent", "source-health-agent", "change-watch-agent"],
    guardrail: "Historical data is not pulled into default client views unless requested.",
  },
  {
    id: "workflow-failure-follow-up",
    task: "Open a human-visible reliability incident when a manual refresh fails.",
    trigger: "workflow_run completed for On-Demand Data Ingestion",
    surfaces: [".github/workflows/reliability-watchdog.yml"],
    agents: ["source-health-agent", "change-watch-agent"],
    guardrail: "Failed refreshes are surfaced before retry, cleanup, or source replacement.",
  },
];

export function getDataOperationsTaskAssignment(id: DataOperationsTaskId) {
  return DATA_OPERATIONS_TASK_ASSIGNMENTS.find((assignment) => assignment.id === id) ?? null;
}
