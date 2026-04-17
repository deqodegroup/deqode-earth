import Link from "next/link";
import { type Location } from "@/lib/locations";

interface Module {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  teaserText?: string;
  launchQuarter?: string;
  metrics: { label: string; value: string; unit?: string }[];
  accentColor: string;
  available: boolean;
}

function getModules(loc: Location): Module[] {
  return [
    {
      id: "coastline",
      icon: "◎",
      title: "Coastline Intelligence",
      subtitle: "Optical-derived erosion, accretion & shoreline change",
      metrics: [
        { label: "Analysis Period", value: loc.isLive ? "2019 – 2025" : "Coming soon" },
        { label: "Sensor", value: "Sentinel-2 MSI" },
        { label: "Resolution", value: "30 m" },
      ],
      accentColor: "teal",
      available: loc.isLive,
    },
    {
      id: "ocean",
      icon: "⬡",
      title: "Ocean Intelligence",
      subtitle: "Dark vessel detection across your EEZ",
      teaserText: `Automated monitoring for illegal, unreported, and unregulated fishing. Every vessel in your ${loc.eez} EEZ — named or dark.`,
      launchQuarter: "Q3 2026",
      metrics: [
        { label: "Coverage", value: loc.eez },
        { label: "Sensor", value: "AIS + Sentinel-2" },
        { label: "Update", value: "5-day repeat" },
      ],
      accentColor: "sky",
      available: false,
    },
    {
      id: "reef",
      icon: "✦",
      title: "Reef Intelligence",
      subtitle: "Coral health index & bleaching risk from optical data",
      teaserText: "Bleaching risk scores from Sentinel-2 multispectral data. Continuous coral health monitoring without deploying a dive team.",
      launchQuarter: "Q4 2026",
      metrics: [
        { label: "Bands", value: "B2–B8A" },
        { label: "Sensor", value: "Sentinel-2 MSI" },
        { label: "Resolution", value: "10–20 m" },
      ],
      accentColor: "gold",
      available: false,
    },
    {
      id: "land",
      icon: "▲",
      title: "Land Intelligence",
      subtitle: "Cyclone damage, deforestation & flood extent mapping",
      teaserText: "Post-cyclone damage corridors, flood extent, and land-use change — satellite-verified evidence for insurance, aid, and UNFCCC submissions.",
      launchQuarter: "2027",
      metrics: [
        { label: "Index", value: "NDVI / dNBR" },
        { label: "Sensor", value: "Sentinel-2 MSI" },
        { label: "Resolution", value: "10 m" },
      ],
      accentColor: "coral",
      available: false,
    },
  ];
}

const ACCENT: Record<string, string> = {
  teal:  "border-teal/30  bg-teal/5  text-teal",
  sky:   "border-sky/30   bg-sky/5   text-sky",
  gold:  "border-gold/30  bg-gold/5  text-gold",
  coral: "border-coral/30 bg-coral/5 text-coral",
};

export function ModuleGrid({ loc, isAuthenticated = false }: { loc: Location; isAuthenticated?: boolean }) {
  const modules = getModules(loc);
  return (
    <section className="max-w-[1440px] mx-auto px-16 py-12">
      <div className="font-mono text-[0.65rem] tracking-[0.25em] uppercase text-[var(--text-dim)] mb-6">
        Intelligence Modules
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {modules.map((mod) => (
          <ModuleCard key={mod.id} mod={mod} slug={loc.slug} isAuthenticated={isAuthenticated} />
        ))}
      </div>
    </section>
  );
}

function ModuleCard({ mod, slug, isAuthenticated }: { mod: Module; slug: string; isAuthenticated: boolean }) {
  const accent = ACCENT[mod.accentColor];
  const accentText = accent.split(" ")[2];
  const accentBorder = accent.split(" ")[0];
  const accentBg = accent.split(" ")[1];

  if (mod.available && isAuthenticated) {
    return (
      <Link href={`/${slug}/${mod.id}`}>
        <div className={`group relative flex flex-col gap-6 rounded-lg border bg-surface p-8
                         transition-all duration-200 ${accentBorder} hover:bg-surface2 hover:-translate-y-0.5 cursor-pointer`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`font-mono text-xl leading-none ${accentText}`}>{mod.icon}</span>
              <div>
                <div className="font-display text-lg leading-tight text-[var(--text)]">{mod.title}</div>
                <div className="font-sans text-xs text-[var(--text-mid)] mt-0.5 leading-relaxed">{mod.subtitle}</div>
              </div>
            </div>
            <span className={`font-mono text-[0.65rem] tracking-[0.12em] uppercase border rounded-full px-2 py-0.5 ${accent}`}>Active</span>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4">
            {mod.metrics.map((m) => (
              <div key={m.label}>
                <div className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">{m.label}</div>
                <div className="font-sans text-xs font-medium text-[var(--text-mid)]">{m.value}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end">
            <span className={`font-mono text-[0.65rem] tracking-[0.1em] uppercase ${accentText} group-hover:underline underline-offset-2`}>
              Run Analysis <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
            </span>
          </div>
        </div>
      </Link>
    );
  }

  if (mod.available && !isAuthenticated) {
    return (
      <div className={`relative flex flex-col gap-6 rounded-lg border bg-surface p-8 ${accentBorder}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`font-mono text-xl leading-none ${accentText} opacity-50`}>{mod.icon}</span>
            <div>
              <div className="font-display text-lg leading-tight text-[var(--text)]">{mod.title}</div>
              <div className="font-sans text-xs text-[var(--text-mid)] mt-0.5 leading-relaxed">{mod.subtitle}</div>
            </div>
          </div>
          <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase border border-[var(--border)] rounded-full px-2 py-0.5 text-[var(--text-dim)]">
            Restricted
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4 opacity-40">
          {mod.metrics.map((m) => (
            <div key={m.label}>
              <div className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">{m.label}</div>
              <div className="font-sans text-xs font-medium text-[var(--text-mid)]">{m.value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <span className="font-sans text-xs text-[var(--text-dim)]">Partner access required</span>
          <Link
            href="/login"
            className={`font-mono text-[0.65rem] tracking-[0.1em] uppercase px-3 py-1.5 rounded border ${accentBorder} ${accentBg} ${accentText} hover:opacity-80 transition-opacity`}
          >
            Request Access →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-6 rounded-lg border border-[var(--border)] bg-surface p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xl leading-none text-[var(--text-dim)]">{mod.icon}</span>
          <div>
            <div className="font-display text-lg leading-tight text-[var(--text)]">{mod.title}</div>
            <div className="font-sans text-xs text-[var(--text-mid)] mt-0.5 leading-relaxed">{mod.subtitle}</div>
          </div>
        </div>
        <span className={`font-mono text-[0.65rem] tracking-[0.12em] uppercase border rounded-full px-2 py-0.5 whitespace-nowrap
                          ${accentBorder} ${accentBg} ${accentText} opacity-70 badge-shimmer`}>
          {mod.launchQuarter}
        </span>
      </div>
      {mod.teaserText && (
        <p className="font-sans text-xs text-[var(--text-dim)] leading-relaxed border-t border-[var(--border)] pt-4">
          {mod.teaserText}
        </p>
      )}
      <div className={`font-mono text-[0.65rem] tracking-[0.1em] uppercase ${accentText} opacity-60`}>
        Coming {mod.launchQuarter} — notify me
      </div>
    </div>
  );
}
