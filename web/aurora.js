// Aurora probability (%) at a point from the NOAA SWPC OVATION model (public domain, no API key, CORS enabled).
// The file is large (~900 kB), so the caller should only ask when the sky is dark and clear at high latitude.
const URL_OVATION = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";
const CACHE_MS = 10 * 60 * 1000;

// Returns the probability 0-100 for the 1° grid cell, or null when unavailable
export async function loadAurora(lat, lon) {
  const cell = [((Math.round(lon) % 360) + 360) % 360, Math.round(lat)];
  const key = `aurora:${cell}`;
  try {
    const c = JSON.parse(sessionStorage.getItem(key));
    if (c && Date.now() - c.at < CACHE_MS) return c.p;
  } catch {}
  try {
    const r = await fetch(URL_OVATION, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const hit = (await r.json()).coordinates.find(c => c[0] === cell[0] && c[1] === cell[1]);
    if (!hit) return null;
    try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), p: hit[2] })); } catch {}
    return hit[2];
  } catch { return null; }
}
