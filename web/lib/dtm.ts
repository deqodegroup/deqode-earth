/**
 * IOM DTM (Displacement Tracking Matrix) v3.0 fetcher.
 *
 * v3.0 (released August 2025) requires a subscription key passed via
 * `Ocp-Apim-Subscription-Key` header. Pacific SIDS coverage is partial —
 * Fiji has a DTM country page; Tuvalu/Kiribati/Marshall Islands are
 * unconfirmed in the v3 database. This fetcher returns null on ANY failure
 * (missing key, non-200, network error, empty result) so callers can fall
 * back to the IDMC data already in Supabase displacement_records.
 *
 * See: .planning/phases/04-compare-view/04-RESEARCH.md (Pattern 4).
 */

export interface DtmResult {
  country: string;          // ISO3
  total_displaced: number;
  source: "dtm";
  as_of?: string;
}

/**
 * Slug → ISO3 mapping for Pacific SIDS (used when calling fetchDtmDisplacement
 * from server components that have access only to a region slug).
 */
export const SLUG_TO_ISO3: Record<string, string> = {
  tuvalu: "TUV",
  fiji: "FJI",
  kiribati: "KIR",
  vanuatu: "VUT",
  "solomon-islands": "SLB",
  palau: "PLW",
  "marshall-islands": "MHL",
  niue: "NIU",
  brisbane: "AUS",
  grantham: "AUS",
};

export async function fetchDtmDisplacement(
  countryISO3: string
): Promise<DtmResult | null> {
  const apiKey = process.env.DTM_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://dtm.iom.int/api/displacement?countryCode=${encodeURIComponent(countryISO3)}`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          Accept: "application/json",
        },
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) return null;

    const json = (await res.json()) as { totalDisplaced?: number; asOf?: string };
    const total = json.totalDisplaced ?? 0;
    if (total <= 0) return null; // empty result → fall through to IDMC

    return {
      country: countryISO3,
      total_displaced: total,
      source: "dtm",
      as_of: json.asOf,
    };
  } catch {
    return null;
  }
}
