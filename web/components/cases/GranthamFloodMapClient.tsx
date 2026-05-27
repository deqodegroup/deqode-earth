"use client";

import dynamic from "next/dynamic";

// next/dynamic with ssr:false must live in a Client Component
const GranthamFloodMapDynamic = dynamic(
  () =>
    import("@/components/cases/GranthamFloodMap").then(
      (m) => m.GranthamFloodMap
    ),
  { ssr: false }
);

export function GranthamFloodMapClient() {
  return <GranthamFloodMapDynamic />;
}
