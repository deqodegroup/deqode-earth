import { describe, expect, it } from "vitest";
import {
  DATA_OPERATIONS_AGENTS,
  DATA_OPERATIONS_TASK_ASSIGNMENTS,
  getDataOperationsTaskAssignment,
} from "./agent-assignments";

describe("data operations agent assignments", () => {
  it("assigns at least one agent to every data operations task", () => {
    for (const assignment of DATA_OPERATIONS_TASK_ASSIGNMENTS) {
      expect(assignment.agents.length).toBeGreaterThan(0);
    }
  });

  it("only references declared agents", () => {
    const agentIds = new Set(DATA_OPERATIONS_AGENTS.map((agent) => agent.id));

    for (const assignment of DATA_OPERATIONS_TASK_ASSIGNMENTS) {
      for (const agent of assignment.agents) {
        expect(agentIds.has(agent)).toBe(true);
      }
    }
  });

  it("keeps manual refresh owned by freshness and storage agents", () => {
    const assignment = getDataOperationsTaskAssignment("manual-source-refresh");

    expect(assignment?.agents).toContain("refresh-gatekeeper-agent");
    expect(assignment?.agents).toContain("source-health-agent");
    expect(assignment?.agents).toContain("storage-steward-agent");
  });

  it("keeps report generation request-scoped", () => {
    const assignment = getDataOperationsTaskAssignment("request-scoped-report-generation");

    expect(assignment?.trigger).toBe("POST /api/report");
    expect(assignment?.agents).toContain("report-request-agent");
    expect(assignment?.guardrail).toContain("No scheduled or automatic report generation");
  });

  it("keeps operational drift owned by change watch", () => {
    for (const assignment of DATA_OPERATIONS_TASK_ASSIGNMENTS) {
      expect(assignment.agents).toContain("change-watch-agent");
    }
  });
});
