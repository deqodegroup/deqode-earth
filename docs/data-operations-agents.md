# Data Operations Agents

This registry assigns ownership for the on-demand-only data policy. DEQODE Earth must not pull external data or generate reports in the background unless an explicit user or operator request starts that work.

| Agent | Responsibility |
|---|---|
| Refresh Gatekeeper Agent | Keeps production data refreshes manual-only through `workflow_dispatch` and rejects cron-style background pulls. |
| Source Health Agent | Owns source freshness, last-success visibility, failed refresh surfacing, and stale-data fallback posture. |
| Storage Steward Agent | Prevents duplicate rows, unnecessary historical pulls, and storage growth that does not support an active request. |
| Report Request Agent | Ensures report generation starts from an explicit user request, selected region, selected format, and supplied metrics. |
| Analyst Review Agent | Keeps client-facing views tied to latest verified values, source dates, and uncertainty instead of implied real-time data. |
| Change Watch Agent | Owns tests and policy checks that catch schedule reintroduction, route drift, or unassigned operational tasks. |

| Task | Trigger | Assigned agents |
|---|---|---|
| Manual source refresh | GitHub Actions `workflow_dispatch` on `On-Demand Data Ingestion` | Refresh Gatekeeper Agent, Source Health Agent, Storage Steward Agent, Change Watch Agent |
| Source freshness display | Page load reads `/api/data-health` | Source Health Agent, Analyst Review Agent, Change Watch Agent |
| Request-scoped report generation | `POST /api/report` | Report Request Agent, Analyst Review Agent, Change Watch Agent |
| Historical data retention | Manual retention workflow or explicit research/report request | Storage Steward Agent, Source Health Agent, Change Watch Agent |
| Workflow failure follow-up | `workflow_run` completed for `On-Demand Data Ingestion` | Source Health Agent, Change Watch Agent |

Source of truth: `web/lib/data-operations/agent-assignments.ts`.

Policy checks: `web/lib/data-operations/agent-assignments.test.ts`.
