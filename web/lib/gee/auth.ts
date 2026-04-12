import ee from "@google/earthengine";

let initialised = false;

/**
 * Initialise Google Earth Engine using a base64-encoded service account key
 * stored in GEE_B64_KEY. Safe to call multiple times — only runs once.
 */
export async function initGEE(): Promise<void> {
  if (initialised) return;

  const b64 = process.env.GEE_B64_KEY;
  if (!b64) throw new Error("GEE_B64_KEY environment variable is not set");

  const key = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));

  await new Promise<void>((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      key,
      () => {
        ee.initialize(
          null, null,
          () => { initialised = true; resolve(); },
          (err: string) => reject(new Error(`GEE init failed: ${err}`)),
        );
      },
      (err: string) => reject(new Error(`GEE auth failed: ${err}`)),
    );
  });
}
