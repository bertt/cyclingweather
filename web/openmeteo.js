// Current weather for one point from Open-Meteo (https://open-meteo.com/, CC BY 4.0, free for non-commercial use, no API key).
// Returns the observation fields used by cycling.html: { time: Date, o: { ta, td, rh, ff, dd, gff, fx, qg, vv, n, ss, rg, pg, R1H, R6H, R24H, ww, pp } }
const API = "https://api.open-meteo.com/v1/forecast";
const GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";
const CACHE_MS = 10 * 60 * 1000;

const CURRENT = ["temperature_2m", "dew_point_2m", "relative_humidity_2m", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
  "shortwave_radiation", "visibility", "cloud_cover", "precipitation", "pressure_msl", "weather_code"];
const HOURLY = ["precipitation", "sunshine_duration"];

const sum = a => a.reduce((x, y) => x + (y ?? 0), 0);

export async function loadWeather(lat, lon) {
  const key = `om:${lat.toFixed(2)},${lon.toFixed(2)}`;
  try {
    const c = JSON.parse(sessionStorage.getItem(key));
    if (c && Date.now() - c.at < CACHE_MS) return { time: new Date(c.time), o: c.o };
  } catch {}
  const u = new URL(API);
  u.search = new URLSearchParams({
    latitude: lat.toFixed(4), longitude: lon.toFixed(4), current: CURRENT.join(), hourly: HOURLY.join(),
    past_hours: 24, forecast_hours: 1, wind_speed_unit: "ms", timeformat: "unixtime", timezone: "GMT",
  });
  const r = await fetch(u);
  if (!r.ok) throw new Error(`Open-Meteo: HTTP ${r.status}${r.status === 429 ? " (rate limit reached, try again later)" : ""}`);
  const j = await r.json();
  const c = j.current, h = j.hourly;
  if (!c) throw new Error("Open-Meteo returned no current weather");
  // Hourly values at or before the current time; precipitation of an hour is the total of the preceding hour
  const upto = h.time.map((t, i) => i).filter(i => h.time[i] <= c.time);
  const rain = upto.map(i => h.precipitation[i]);
  const sunshine = upto.map(i => h.sunshine_duration[i]);
  const o = {
    ta: c.temperature_2m, td: c.dew_point_2m, rh: c.relative_humidity_2m,
    ff: c.wind_speed_10m, dd: c.wind_direction_10m, gff: c.wind_gusts_10m, fx: null,
    qg: c.shortwave_radiation, vv: c.visibility, n: c.cloud_cover == null ? null : c.cloud_cover / 12.5, // % to octas
    ss: sunshine.length ? (sunshine.at(-1) ?? 0) / 3600 : null,
    rg: c.precipitation == null ? null : c.precipitation * 3600 / (c.interval || 900), // mm per interval to mm/h
    pg: null,
    R1H: rain.length ? rain.at(-1) : null, R6H: rain.length ? sum(rain.slice(-6)) : null, R24H: rain.length ? sum(rain.slice(-24)) : null,
    ww: c.weather_code, pp: c.pressure_msl,
  };
  const time = new Date(c.time * 1000);
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), time: time.toISOString(), o })); } catch {}
  return { time, o };
}

// Nearest place name for coordinates (BigDataCloud client-side reverse geocoding, no key); null when unavailable
export async function reverseGeocode(lat, lon) {
  try {
    const u = new URL("https://api-bdc.io/data/reverse-geocode-client");
    u.search = new URLSearchParams({ latitude: lat, longitude: lon, localityLanguage: "en" });
    const r = await fetch(u, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const j = await r.json();
    return j.city?.replace(/^Gemeente /, "") || j.locality || j.principalSubdivision || null;
  } catch { return null; }
}

// Place search (Open-Meteo geocoding): [{ name, lat, lon, detail }]
export async function searchPlaces(query) {
  const u = new URL(GEOCODING);
  u.search = new URLSearchParams({ name: query, count: 6, language: "en" });
  const r = await fetch(u);
  if (!r.ok) throw new Error(`Geocoding: HTTP ${r.status}`);
  const j = await r.json();
  return (j.results ?? []).map(p => ({ name: p.name, lat: p.latitude, lon: p.longitude, detail: [p.admin1, p.country].filter(Boolean).join(", ") }));
}
