import Link from "next/link";
import { type Location } from "@/lib/locations";

interface Module {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
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
      subtitle: "SAR-derived erosion, accretion & shoreline change",
      metrics: [
        { label: "Analysis Period", value: loc.isLive ? "2019 – 2025" : "Coming soon" },
        { label: "Sensor", value: "Sentinel-1 SAR" },
        { label: "Resolution", value: "10 m" },
      ],
      accentColor: "teal",
      available: loc.isLive,
    },
    {
      id: "ocean",
      icon: "⬡",
      title: "Ocean Intelligence",
      subtitle: "Dark vessel detection & IUU fishing activity in EEZ",
      metrics: [
        { label: "Coverage", value: loc.eez },
        { label: "Sensor", value: "Sentinel-1 SAR" },
        { label: "Update", value: "12-day repeat" },
      ],
      accentColor: "sky",
      available: false,
    },
    {
      id: "reef",
      icon: "✦",
      title: "Reef Intelligence",
      subtitle: "Coral health index & bleaching risk from optical data",
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
      subtitle: "Forest cover, storm damage & land-use change detection",
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

export function ModuleGrid({ loc }: { loc: Location }) {
  const modules = getModules(loc);

  return (
    <section className="max-w-6xl mx-auto px-12 py-12">
      <div className="font-mono text-[0.48rem] tracking-[0.25em] uppercase text-[var(--text-dim)] mb-6">
        Intelligence Modules
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {modules.map((mod) => (
          <ModuleCard key={mod.id} mod={mod} slug={loc.slug} />
        ))}
      </div>
    </section>
  );
}

function ModuleCard({ mod, slug }: { mod: Module; slug: string }) {
  const accent = ACCENT[mod.accentColor];

  const inner = (
    <div className={`group relative flex flex-col gap-5 rounded-lg border bg-surface p-6
                     transition-all duration-200
                     ${mod.available
                       ? `${accent.split(" ")[0]} hover:bg-surface2 hover:-translate-y-0.5 cursor-pointer`
                       : "border-[var(--border)] opacity-60 cursor-default"
                     }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xl leading-none ${mod.available ? accent.split(" ")[2] : "text-[var(--text-dim)]"}`}>
            {mod.icon}
          </span>
          <div>
            <div className="font-display text-lg leading-tight text-[var(--text)]">
              {mod.title}
            </div>
            <div className="font-sans text-xs text-[var(--text-mid)] mt-0.5 leading-relaxed">
              {mod.subtitle}
            </div>
          </div>
        </div>
        {mod.available
          ? <span className={`font-mono text-[0.45rem] tracking-[0.12em] uppercase border rounded-full px-2 py-0.5 ${accent}`}>
              Active
            </span>
          : <span className="font-mono text-[0.45rem] tracking-[0.12em] uppercase border border-[var(--border)] rounded-full px-2 py-0.5 text-[var(--text-dim)]">
              Pending
            </span>
        }
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4">
        {mod.metrics.map((m) => (
          <div key={m.label}>
            <div className="font-mono text-[0.42rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">
              {m.label}
            </div>
            <div className="font-sans text-xs font-medium text-[var(--text-mid)]">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {mod.available && (
        <div className="flex items-center justify-end">
          <span className={`font-mono text-[0.48rem] tracking-[0.1em] uppercase ${accent.split(" ")[2]}
                            group-hover:underline underline-offset-2`}>
            Run Analysis →
          </span>
        </div>
      )}
    </div>
  );

  return mod.available
    ? <Link href={`/${slug}/${mod.id}`}>{inner}</Link>
    : <div>{inner}</div>;
}
