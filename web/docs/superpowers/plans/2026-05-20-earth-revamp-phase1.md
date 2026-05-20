# DEQODE EARTH Revamp — Phase 1: Design System + Command Center Shell

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage hero + card grid with a full-screen three-panel command center, and swap DM Sans for Source Sans 3 + add Syne for data labels.

**Architecture:** Full-viewport layout — CommandBar (48px top) + three-panel body (RegionTree 240px | MapCanvas flex-1 | IntelligencePanel 360px slides in) + StatusStrip (32px bottom). MapCanvas uses raw Leaflet via dynamic `import("leaflet")` inside a `"use client"` component, same pattern as existing `CoastlineMap.tsx`. Server components handle auth; client leaf components handle interactive state.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Leaflet 1.9, Vitest, TypeScript

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `web/app/layout.tsx` | Swap DM Sans → Source Sans 3, add Syne |
| Modify | `web/app/globals.css` | Add OKLCH tokens, migration/retreat colors, new CSS vars, panel animation |
| Modify | `web/tailwind.config.ts` | Register new font vars (if present — Tailwind v4 uses globals.css @theme) |
| Replace | `web/app/page.tsx` | Command Center layout (3-panel shell) |
| Create | `web/components/command/CommandBar.tsx` | 48px top bar — logo, search placeholder, auth |
| Create | `web/components/command/StatusStrip.tsx` | 32px bottom bar — satellite status, region count, data freshness |
| Create | `web/components/map/MapCanvas.tsx` | Full-viewport Leaflet map, Asia-Pacific default view, flyTo API |
| Create | `web/components/map/MapCanvas.test.ts` | Unit tests for flyTo config |
| Create | `web/lib/map-config.ts` | Map constants — default center/zoom, tile URLs |
| Create | `web/lib/map-config.test.ts` | Tests for map config values |

---

## Task 1.1 — Font Swap + New CSS Tokens

**Files:**
- Modify: `web/app/layout.tsx`
- Modify: `web/app/globals.css`

- [ ] **Step 1: Write the failing test**

Create `web/lib/map-config.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ASIA_PACIFIC_DEFAULT, TILE_URLS } from "./map-config";

describe("map-config", () => {
  it("default center is Asia-Pacific", () => {
    expect(ASIA_PACIFIC_DEFAULT.center).toEqual([10, 145]);
    expect(ASIA_PACIFIC_DEFAULT.zoom).toBe(4);
  });

  it("has satellite tile URL", () => {
    expect(TILE_URLS.satellite).toContain("arcgisonline.com");
  });

  it("has dark terrain tile URL", () => {
    expect(TILE_URLS.darkTerrain).toContain("arcgisonline.com");
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd web && npx vitest run lib/map-config.test.ts
```

Expected: `Cannot find module './map-config'`

- [ ] **Step 3: Create `web/lib/map-config.ts`**

```typescript
export const ASIA_PACIFIC_DEFAULT = {
  center: [10, 145] as [number, number],
  zoom: 4,
  minZoom: 3,
  maxZoom: 18,
};

export const TILE_URLS = {
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  labels:
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  darkTerrain:
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
};

export const FLY_TO_OPTIONS = {
  duration: 1.2,
  easeLinearity: 0.25,
};
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd web && npx vitest run lib/map-config.test.ts
```

Expected: 3 passing

- [ ] **Step 5: Update `web/app/layout.tsx` — swap fonts**

```typescript
import type { Metadata } from "next";
import {
  Playfair_Display_SC,
  Playfair_Display,
  Syne,
  Source_Sans_3,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const playfairSC = Playfair_Display_SC({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-playfair-sc",
});
const playfair = Playfair_Display({
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-playfair",
});
const syne = Syne({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-syne",
});
const sourceSans = Source_Sans_3({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-source-sans",
});
const jetbrains = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "DEQODE EARTH — Asia-Pacific Climate Displacement Intelligence",
  description:
    "Sovereign satellite intelligence for climate relocation and retreat planning across the Asia-Pacific.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfairSC.variable} ${playfair.variable} ${syne.variable} ${sourceSans.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ocean text-[var(--text)] font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Update `web/app/globals.css` — add new tokens**

Add after the existing `:root` block (keep existing hex vars, add below):

```css
:root {
  /* === existing vars kept === */
  --ocean:    #0D1B2A;
  --surface:  #152236;
  --surface2: #1C2E45;
  --teal:     #4CB9C0;
  --gold:     #D4A55A;
  --coral:    #E05B4B;
  --sky:      #3B7DD8;
  --text:     #E8EDF2;
  --text-mid: #8BA5BC;
  --text-dim: #4A6680;
  --border:   rgba(76,185,192,0.10);
  --grid:     rgba(76,185,192,0.04);

  /* === new displacement narrative colors === */
  --migration: oklch(68% 0.14 295);
  --retreat:   oklch(70% 0.11 45);

  /* === panel animation timing === */
  --ease-decelerate: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-standard:   cubic-bezier(0.23, 1, 0.32, 1);

  /* === layout dimensions === */
  --bar-height:    48px;
  --strip-height:  32px;
  --tree-width:    240px;
  --panel-width:   360px;
}

@theme inline {
  --color-ocean:     var(--ocean);
  --color-surface:   var(--surface);
  --color-surface2:  var(--surface2);
  --color-teal:      var(--teal);
  --color-gold:      var(--gold);
  --color-coral:     var(--coral);
  --color-sky:       var(--sky);
  --color-migration: var(--migration);
  --color-retreat:   var(--retreat);
  --font-display:    var(--font-playfair-sc), serif;
  --font-heading:    var(--font-playfair), serif;
  --font-syne:       var(--font-syne), sans-serif;
  --font-sans:       var(--font-source-sans), sans-serif;
  --font-mono:       var(--font-jetbrains), monospace;
}
```

Add new keyframes at the bottom of globals.css:

```css
/* === Intelligence Panel slide-in === */
@keyframes panel-slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

@keyframes panel-slide-out {
  from { transform: translateX(0);    opacity: 1; }
  to   { transform: translateX(100%); opacity: 0; }
}

.panel-enter {
  animation: panel-slide-in 300ms var(--ease-decelerate) forwards;
}

/* === Displacement flow line === */
@keyframes dash-flow {
  to { stroke-dashoffset: -20; }
}

/* === Counter roll-up === */
@keyframes count-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 7: Commit**

```bash
cd web && git add app/layout.tsx app/globals.css lib/map-config.ts lib/map-config.test.ts
git commit -m "feat: add Syne + Source Sans 3 fonts, OKLCH migration/retreat tokens, map config"
```

---

## Task 1.2 — CommandBar Component

**Files:**
- Create: `web/components/command/CommandBar.tsx`

- [ ] **Step 1: Create `web/components/command/CommandBar.tsx`**

This is a Server Component — reads auth state server-side. The pulsing satellite dot is extracted to a client leaf.

```tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SatelliteStatus } from "@/components/command/SatelliteStatus";

export async function CommandBar() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                 px-6 bg-ocean/95 backdrop-blur-sm border-b border-[var(--border)]"
      style={{ height: "var(--bar-height)" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
        <div
          className="w-7 h-7 rounded bg-teal flex items-center justify-center
                        group-hover:bg-teal/80 transition-colors"
        >
          <div className="w-4 h-4 rounded-full border-2 border-ocean relative">
            <div
              className="absolute inset-0"
              style={{ animation: "earth-orbit 5s linear infinite" }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal/80" />
            </div>
          </div>
        </div>
        <div>
          <div className="font-mono text-[0.55rem] tracking-[0.25em] uppercase text-[var(--text-dim)] leading-none">
            DEQODE GROUP
          </div>
          <div className="font-display text-base leading-none text-[var(--text)]">
            EARTH<span className="text-teal">.</span>
          </div>
        </div>
      </Link>

      {/* Centre — tagline */}
      <div className="hidden lg:block absolute left-1/2 -translate-x-1/2">
        <span className="font-syne text-[0.6rem] tracking-[0.2em] uppercase text-[var(--text-dim)]">
          Asia-Pacific Climate Displacement Intelligence
        </span>
      </div>

      {/* Right — satellite + auth */}
      <div className="flex items-center gap-6">
        <SatelliteStatus />

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="font-mono text-[0.6rem] tracking-[0.14em] uppercase px-3 py-1.5
                         rounded border border-teal/40 bg-teal/5 text-teal
                         hover:bg-teal/10 transition-colors"
            >
              Dashboard →
            </Link>
            <SignOutButton />
          </div>
        ) : (
          <Link
            href="/login"
            className="font-mono text-[0.6rem] tracking-[0.14em] uppercase px-3 py-1.5
                       rounded border border-[var(--border)] text-[var(--text-dim)]
                       hover:border-teal hover:text-teal transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create `web/components/command/SatelliteStatus.tsx`**

Client leaf — isolated animation, keeps CommandBar as a Server Component.

```tsx
"use client";

export function SatelliteStatus() {
  return (
    <div className="hidden sm:flex items-center gap-2">
      <span className="relative flex items-center justify-center w-2.5 h-2.5">
        <span className="absolute w-2.5 h-2.5 rounded-full bg-teal/25 animate-ping" />
        <span className="w-1.5 h-1.5 rounded-full bg-teal" />
      </span>
      <span className="font-mono text-[0.6rem] tracking-[0.14em] uppercase text-teal">
        S2 Active
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd web && git add components/command/CommandBar.tsx components/command/SatelliteStatus.tsx
git commit -m "feat: CommandBar with Syne tagline and satellite status leaf"
```

---

## Task 1.3 — StatusStrip Component

**Files:**
- Create: `web/components/command/StatusStrip.tsx`

- [ ] **Step 1: Create `web/components/command/StatusStrip.tsx`**

Client component — shows live data freshness. In demo mode shows COPRRRA badge.

```tsx
"use client";

import { LOCATIONS_LIST } from "@/lib/locations";

export function StatusStrip({ demoMode = false }: { demoMode?: boolean }) {
  const liveCount = LOCATIONS_LIST.filter((l) => l.isLive).length;

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between
                 px-6 bg-ocean/95 backdrop-blur-sm border-t border-[var(--border)]"
      style={{ height: "var(--strip-height)" }}
    >
      <div className="flex items-center gap-6">
        <StatusPill color="teal" label="S2 Active" />
        <StatusPill color="dim" label={`${liveCount} Regions`} />
        <StatusPill color="dim" label="Updated 14 min ago" />
      </div>

      {demoMode && (
        <div className="flex items-center gap-2 rounded border border-teal/30 bg-teal/5 px-3 py-0.5">
          <span className="w-1 h-1 rounded-full bg-teal animate-pulse" />
          <span className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-teal">
            COPRRRA Demo Mode
          </span>
        </div>
      )}

      <div className="hidden md:block">
        <span className="font-mono text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text-dim)]">
          DEQODE GROUP · TOFI · Classification: SOVEREIGN
        </span>
      </div>
    </footer>
  );
}

function StatusPill({
  color,
  label,
}: {
  color: "teal" | "gold" | "coral" | "dim";
  label: string;
}) {
  const colorClass =
    color === "teal"
      ? "text-teal"
      : color === "gold"
        ? "text-gold"
        : color === "coral"
          ? "text-coral"
          : "text-[var(--text-dim)]";

  return (
    <span className={`font-mono text-[0.55rem] tracking-[0.12em] uppercase ${colorClass}`}>
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd web && git add components/command/StatusStrip.tsx
git commit -m "feat: StatusStrip with COPRRRA demo mode indicator"
```

---

## Task 1.4 — MapCanvas Component

**Files:**
- Create: `web/components/map/MapCanvas.tsx`

- [ ] **Step 1: Create `web/components/map/MapCanvas.tsx`**

```tsx
"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { ASIA_PACIFIC_DEFAULT, TILE_URLS, FLY_TO_OPTIONS } from "@/lib/map-config";

export interface MapCanvasHandle {
  flyTo: (center: [number, number], zoom: number) => void;
}

interface MapCanvasProps {
  className?: string;
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas({ className = "" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      flyTo(center: [number, number], zoom: number) {
        mapRef.current?.flyTo(center, zoom, FLY_TO_OPTIONS);
      },
    }));

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      import("leaflet").then((mod) => {
        const L = mod.default;
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          center: ASIA_PACIFIC_DEFAULT.center,
          zoom: ASIA_PACIFIC_DEFAULT.zoom,
          minZoom: ASIA_PACIFIC_DEFAULT.minZoom,
          maxZoom: ASIA_PACIFIC_DEFAULT.maxZoom,
          scrollWheelZoom: true,
          zoomControl: false,
          attributionControl: false,
        });

        // Dark terrain base
        L.tileLayer(TILE_URLS.darkTerrain, { maxZoom: 18 }).addTo(map);

        // Labels overlay
        L.tileLayer(TILE_URLS.labels, {
          maxZoom: 18,
          opacity: 0.7,
        }).addTo(map);

        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.control
          .attribution({ position: "bottomright", prefix: false })
          .addAttribution(
            "Imagery © <a href='https://www.esri.com' style='color:#4CB9C0'>Esri</a>"
          )
          .addTo(map);

        mapRef.current = map;
      });

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div
        ref={containerRef}
        className={`w-full h-full ${className}`}
        aria-label="Asia-Pacific intelligence map"
      />
    );
  }
);
```

- [ ] **Step 2: Commit**

```bash
cd web && git add components/map/MapCanvas.tsx
git commit -m "feat: MapCanvas full-viewport Leaflet with flyTo imperative handle"
```

---

## Task 1.5 — Command Center Homepage

**Files:**
- Replace: `web/app/page.tsx`

- [ ] **Step 1: Replace `web/app/page.tsx`**

```tsx
import dynamic from "next/dynamic";
import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";

// MapCanvas requires window — no SSR
const MapCanvas = dynamic(
  () => import("@/components/map/MapCanvas").then((m) => m.MapCanvas),
  { ssr: false }
);

export default function CommandCenter() {
  return (
    <div
      className="flex flex-col bg-ocean"
      style={{ minHeight: "100dvh" }}
    >
      <CommandBar />

      {/* Body — region tree + map + intel panel */}
      <main
        className="flex flex-1 overflow-hidden"
        style={{
          paddingTop: "var(--bar-height)",
          paddingBottom: "var(--strip-height)",
        }}
      >
        {/* Left: Region Tree placeholder — filled in Phase 2 */}
        <aside
          className="flex-shrink-0 border-r border-[var(--border)] bg-surface/60 overflow-y-auto"
          style={{ width: "var(--tree-width)" }}
          aria-label="Region selector"
        >
          <div className="px-4 pt-5 pb-3">
            <div className="font-mono text-[0.55rem] tracking-[0.25em] uppercase text-[var(--text-dim)]">
              Asia-Pacific
            </div>
          </div>
          {/* RegionTree rendered in Phase 2 */}
        </aside>

        {/* Centre: Full map */}
        <div className="flex-1 relative overflow-hidden">
          <MapCanvas className="absolute inset-0" />
        </div>

        {/* Right: Intelligence Panel placeholder — filled in Phase 2 */}
        {/* IntelligencePanel rendered in Phase 2 */}
      </main>

      <StatusStrip demoMode={false} />
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and verify layout**

```bash
cd web && npm run dev
```

Open http://localhost:3000. Verify:
- CommandBar visible at top (48px)
- Full-screen dark Leaflet map centered on Asia-Pacific
- Left sidebar (240px, empty)
- StatusStrip at bottom (32px)
- No horizontal scroll
- Fonts: "EARTH." uses Playfair Display SC, tagline uses Syne

- [ ] **Step 3: Commit**

```bash
cd web && git add app/page.tsx
git commit -m "feat: Command Center homepage — three-panel shell with MapCanvas"
```

---

## Phase 1 Complete

Verify before moving to Phase 2:
- [ ] `npx vitest run` — all tests passing
- [ ] `npm run build` — no TypeScript errors
- [ ] http://localhost:3000 shows command center shell
- [ ] Syne font visible in CommandBar tagline
- [ ] Source Sans 3 replaces DM Sans in body text
- [ ] Map shows Asia-Pacific default view (centered ~10°N, 145°E, zoom 4)
