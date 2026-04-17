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
  flagship?: boolean;
}

function getModules(loc: Location): Module[] {
  return [
    {
      id: "ocean",
      icon: "⬡",
      title: "Ocean Intelligence",
      subtitle: "Dark vessel detection across your EEZ",
      teaserText: `Automated monitoring for illegal, unreported, and unregulated fishing. Every vessel in your ${loc.eez} EEZ — named or dark.`,
      launchQuarter: "In Development",
      metrics: [
        { label: "Coverage",  value: loc.eez },
        { label: "Sensors",   value: "Sentinel-1 · AIS · VIIRS" },
        { label: "Latency",   value: "Daily" },
        { label: "Priority",  value: "Flagship" },
      ],
      accentColor: "sky",
      available: false,
      flagship: true,
    },
    {
      id: "land",
      icon: "▲",
      title: "Land Intelligence",
      subtitle: "Cyclone damage, deforestation & flood extent mapping",
      teaserText: "Post-cyclone damage corridors, flood extent, and land-use change — satellite-verified evidence for insurance, aid, and UNFCCC submissions.",
      launchQuarter: "2026",
      metrics: [
        { label: "Index", value: "NDVI / dNBR" },
        { label: "Sensor", value: "Sentinel-2 MSI" },
        { label: "Resolution", value: "10 m" },
      ],
      accentColor: "coral",
      available: false,
    },
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
  ];
}

const ACCENT: Record<string, string> = {
  teal:  "border-teal/30  bg-teal/5  text-teal",
  sky:   "border-sky/30   bg-sky/5   text-sky",
  gold:  "border-gold/30  bg-gold/5  text-gold",
  coral: "border-coral/30 bg-coral/5 text-coral",
};

const SOLID_BG: Record<string, string> = {
  teal:  "bg-teal",
  sky:   "bg-sky",
  gold:  "bg-gold",
  coral: "bg-coral",
};

export function ModuleGrid({ loc, isAuthenticated = false }: { loc: Location; isAuthenticated?: boolean }) {
  const modules = getModules(loc);
  const flagship = modules.find((m) => m.flagship);
  const rest     = modules.filter((m) => !m.flagship);

  return (
    <section className="max-w-[1440px] mx-auto px-16 py-12">
      <div className="font-mono text-[0.65rem] tracking-[0.25em] uppercase text-[var(--text-dim)] mb-6">
        Intelligence Modules
      </div>

      {flagship && (
        <div className="mb-5">
          <FlagshipCard mod={flagship} slug={loc.slug} isAuthenticated={isAuthenticated} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {rest.map((mod) => (
          <ModuleCard key={mod.id} mod={mod} slug={loc.slug} isAuthenticated={isAuthenticated} />
        ))}
      </div>
    </section>
  );
}

function FlagshipCard({ mod, slug, isAuthenticated }: { mod: Module; slug: string; isAuthenticated: boolean }) {
  const accent = ACCENT[mod.accentColor];
  const accentText   = accent.split(" ")[2];
  const accentBorder = accent.split(" ")[0];
  const accentBg     = accent.split(" ")[1];

  const inner = (
    <div className={`group relative rounded-lg border bg-surface overflow-hidden
                     ${accentBorder} ${mod.available && isAuthenticated ? "hover:bg-surface2 hover:-translate-y-0.5 cursor-pointer transition-all duration-200" : ""}`}>
      {/* subtle top-edge gradient glow to signal flagship status without a banned side-stripe */}
      <div className={`absolute inset-x-0 top-0 h-px ${accentBg}`} style={{ opacity: 0.6 }} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-0">
        {/* Left — identity + narrative */}
        <div className="px-10 py-8 lg:border-r border-[var(--border)]">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <span className={`font-mono text-3xl leading-none ${accentText}`}>{mod.icon}</span>
              <div>
                <div className="font-display text-2xl leading-tight tracking-tight text-[var(--text)]">
                  {mod.title}
                </div>
                <div className="font-sans text-sm text-[var(--text-mid)] mt-1 leading-relaxed">
                  {mod.subtitle}
                </div>
              </div>
            </div>

            {mod.available ? (
              <span className={`font-mono text-[0.65rem] tracking-[0.12em] uppercase border rounded-full px-2.5 py-1 whitespace-nowrap ${accent}`}>
                Active
              </span>
            ) : (
              <span className={`font-mono text-[0.65rem] tracking-[0.12em] uppercase border rounded-full px-2.5 py-1 whitespace-nowrap flex items-center gap-2
                                ${accentBorder} ${accentBg} ${accentText}`}>
                <span className="relative flex items-center justify-center w-2 h-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full ${SOLID_BG[mod.accentColor]} opacity-60`}
                        style={{ animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${SOLID_BG[mod.accentColor]}`} />
                </span>
                {mod.launchQuarter}
              </span>
            )}
          </div>

          {mod.teaserText && (
            <p className="font-sans text-sm text-[var(--text-mid)] leading-relaxed max-w-xl">
              {mod.teaserText}
            </p>
          )}
        </div>

        {/* Right — metrics + action */}
        <div className="px-10 py-8 flex flex-col justify-between gap-6 bg-surface2/30">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {mod.metrics.map((m) => (
              <div key={m.label}>
                <div className="font-mono text-[0.6rem] tracking-[0.14em] uppercase text-[var(--text-dim)] mb-1">
                  {m.label}
                </div>
                <div className="font-sans text-sm font-medium text-[var(--text)]">
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {mod.available && isAuthenticated ? (
            <div className="flex items-center justify-end">
              <span className={`font-mono text-xs tracking-[0.12em] uppercase ${accentText} group-hover:underline underline-offset-4`}>
                Run Analysis <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
              </span>
            </div>
          ) : mod.available && !isAuthenticated ? (
            <Link href="/login"
                  className={`font-mono text-xs tracking-[0.12em] uppercase px-4 py-2.5 rounded border text-center
                              ${accentBorder} ${accentBg} ${accentText} hover:opacity-80 transition-opacity`}>
              Request Access →
            </Link>
          ) : (
            <div className={`font-mono text-[0.65rem] tracking-[0.12em] uppercase ${accentText} opacity-80`}>
              Building now — partner early-access available
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (mod.available && isAuthenticated) {
    return <Link href={`/${slug}/${mod.id}`}>{inner}</Link>;
  }
  return inner;
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
