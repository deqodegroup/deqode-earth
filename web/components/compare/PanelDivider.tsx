/**
 * Panel divider between the SIDS (left) and AUS (right) ComparePanel columns.
 * 1px wide vertical gradient: teal/30 (top 33%) → border (mid 34%) → gold/30 (bottom 33%).
 * Server component — no interactivity, no client state.
 * Reference: .planning/phases/04-compare-view/04-UI-SPEC.md "Panel Divider Contract"
 */

export function PanelDivider() {
  return (
    <div
      className="w-px flex-shrink-0 self-stretch hidden md:block"
      role="separator"
      aria-orientation="vertical"
      style={{
        background:
          "linear-gradient(to bottom, rgba(76,185,192,0.30) 0%, rgba(76,185,192,0.30) 33%, rgba(76,185,192,0.10) 50%, rgba(212,165,90,0.30) 67%, rgba(212,165,90,0.30) 100%)",
      }}
    />
  );
}
