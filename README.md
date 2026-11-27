# Cycling weather

🚴 **Live: <https://bertt.github.io/cyclingweather/cycling.html>**

A static web page (`web/cycling.html`) that turns the current weather from [Open-Meteo](https://open-meteo.com/) (fetched in the browser, no API key, no backend) into cycling advice for your location, or for a place you search for:

- **Ride score** (0-100): one score that combines comfort and training (the average of both). Sun and dry is good; rain, extreme cold or heat, storm-force wind and poor visibility are bad; moderate wind and cold count as a small plus for training. The rules are listed in the calculation details.
- **What to wear**: based on the temperature *on the bike* (air temperature about 2 °C lower, extra for rain, damp air via the dew point and wind chill), e.g. short/short above 15 °C, gloves and skullcap below 10 °C, windjacket below 12 °C, windjacket + base layer below 0 °C. Extras for rain, darkness, sun and ice.
- **Feels-like temperature**: a 🧊 pill shows a standard formula next to the temperature on the bike: wind chill `13.12 + 0.6215·T − 11.37·v^0.16 + 0.3965·T·v^0.16` (T ≤ 10 °C, wind > 4.8 km/h, v = 10 m wind in km/h) or the heat index (T ≥ 27 °C, uses relative humidity). It is hidden when neither formula applies (e.g. calm wind, or 10–27 °C). It ignores riding speed, darkness and wind direction, so it is usually milder than the temperature on the bike.
- **Thick wind ("dikke wind")**: a 🪨 pill flags cold, high-pressure air, which is denser and gives more air resistance ([background](https://www.allesoverwielrennen.nl/dikke-wind/)). The air density is computed from temperature, pressure and humidity and compared with standard air (1.225 kg/m³): +3.5% or more is "thick wind", +7% or more "very thick wind", −3.5% or less "thin wind"; in between nothing is shown. At 1013 hPa and dry air that is roughly ≤ 5 °C for thick and ≤ −5 °C for very thick; higher pressure shifts this a few degrees warmer. The density uses the virtual temperature, which accounts for humidity: `ρ = (pp·100)/(287.05·T_v)` in kg/m³, with `T_v = T/(1 − (e/pp)·(1 − 0.622))`, `T = ta + 273.15` (K), `e = es(td)` (vapour pressure from the dew point, hPa; from `rh` if the dew point is missing) and `es(x) = 6.1078·10^(7.5·x/(x+237.3))` (Magnus formula). The relative difference is `(ρ / 1.225 − 1)·100`. The thresholds are hard-coded in `web/cycling.html`, not in the rules file.
- **Temperature and humidity**: all temperature data are shown together (air temperature, feels-like on the bike, wind chill/heat index, dew point and dew point depression ΔT = air temperature − dew point). Rules from the `humidity` section of the rules file give:
  - **Fog/mist**: strong fog warning at RH ≥ 98% or ΔT ≤ 1 °C; high fog risk at RH ≥ 95% and ΔT ≤ 2 °C; "misty / reduced visibility" at RH ≥ 90% and visibility < 3000 m (the first match is shown).
  - **Clothing**: T ≥ 22 °C and RH ≥ 70% → light, breathable clothing and extra drinking.
  - **Bike care** (also part of the bike cleaning score, in the `cleaning` section): RH ≥ 85% and > 0.5 mm rain in 6 h → +1 point, rinse and lube the chain; RH ≥ 90% / ≥ 95% → +1 / +2 points (damp air), at ≥ 95% also a corrosion warning to dry and lube; RH ≤ 50% and no recent rain → −1 point, a light wipe is enough.
  - **Tips**: RH ≥ 85% after rain → roads stay slippery; RH ≤ 40% → watch hydration.
- **Bike cleaning**: estimate from rain now, the last 1/6/24 hours and salt risk.

## Photogenic weather moments

The page shows 📷 warnings for photogenic moments (rules in `web/cycling-rules.json`, inputs in `web/cycling.html`). `elev` is the sun elevation at the location and `n` the cloud cover in octas. They are heuristics from model data, not forecasts.

| Input | Condition |
|---|---|
| `redSky` | Red sky (sunrise/sunset, from a few hours before until the sun has set): `n` 1–6, no rain, `elev` −4 to 12°. Rayleigh scattering: cirrus clouds scatter the shorter blue/violet wavelengths away, allowing the longer red/orange wavelengths to dominate. Cirrus is not available as a separate value, so partial cloud cover is the proxy. |
| `mistLight` | Mist in the low sun: wind ≤ 2 m/s, ΔT ≤ 2 °C, no rain, `elev` 0–15°. |
| `rime` | Rime/hoar frost: −8 to 0 °C, RH ≥ 90%, wind ≤ 3 m/s, `elev` −6 to 15°. |
| `rainbow` | Rainbow: shower (`ww` 80–86) or rain without thunder, `n` ≤ 6, `elev` 2–42°. |
| `goldenHour` | Golden hour: `n` ≤ 2, `elev` 0–6°. |
| `blueHour` | Blue hour: `n` ≤ 2, `elev` −8 to −4°. |
| `crepuscular` | Crepuscular rays: `n` 4–6, no rain, `elev` 0–10°. |
| `stormLight` | Dramatic storm light: thunderstorm (`ww` 95, 96 or 99) with `elev` 0–15° (stay indoors, lightning is dangerous). |
| `snowSun` | Snow in sunlight: snow (`ww` snow code, ≤ 2 °C), `n` ≤ 5, `elev` > 5°. |
| `fullMoon` | Full moon: illumination ≥ 95%, `n` ≤ 6, moon up now or within 3 h. |
| `starryNight` | Starry night: moon illumination ≤ 10%, `n` ≤ 1, `elev` < −18°, RH ≤ 85%. |

## Rules and URL parameters

All rules and thresholds live in [`web/cycling-rules.json`](web/cycling-rules.json), so they can be tuned without touching the code. Rules are `bands` (`upTo` value, `points`, `note`; `upTo: null` = everything above), clothing bands/extras, and cleaning rules/levels. The page has these URL parameters:

| Parameter | Example | Meaning |
|---|---|---|
| `lat`, `lon`, `name` | `cycling.html?lat=52.09&lon=5.12&name=Utrecht` | Show the weather for these coordinates (`name` is optional) instead of your current location. The "Other place" button searches a place (Open-Meteo geocoding) and sets these parameters, so you can share a link. Without them the browser location is used; if that is unavailable a place search is shown. |
| `rules` | `cycling.html?rules=<url-to-json>` | Load your own rules file instead of `cycling-rules.json`. |

Parameters can be combined, e.g. `cycling.html?lat=51.92&lon=4.48&rules=my-rules.json`. The page has a "How were these scores calculated?" section showing every rule's contribution. The advice is indicative only.

## Data

Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), free for non-commercial use. The values are model data (best match), not station measurements. `web/openmeteo.js` fetches the current weather and the last 24 hourly values (10-minute `sessionStorage` cache). The weather code is the WMO subset Open-Meteo returns, so thunder is 95/96/99 and hail 96/99. Place names for your location come from [BigDataCloud](https://www.bigdatacloud.com/) reverse geocoding.

Cycling quotes come from [The Rules](https://www.velominati.com/the-rules/) by Velominati.

## Deployment

GitHub Pages serves the `web/` folder through the workflow in `.github/workflows/pages.yml` on every push to `main` and manually. GitHub Pages must be set to the source *GitHub Actions* (Settings → Pages). Locally: `uv run python -m http.server --directory web`.
