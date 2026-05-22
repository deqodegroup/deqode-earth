---
status: partial
phase: 03-brisbane-data-pipeline
source: [03-VERIFICATION.md]
started: 2026-05-22T00:00:00Z
updated: 2026-05-22T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. GitHub Actions first run
expected: Trigger workflow_dispatch on nightly-ingest.yml — all 9 jobs complete with no Python traceback. Each script logs "OK:" confirmation lines to stdout.
result: [pending]

### 2. IntelligencePanel live data
expected: After first ingest run populates Supabase, clicking a Brisbane region shows real displacement count and flood depth values (not hardcoded fallback values). SIDS regions show coastal_depth_m from Deltares.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
