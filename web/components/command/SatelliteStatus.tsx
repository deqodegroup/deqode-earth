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
