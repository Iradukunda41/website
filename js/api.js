/**
 * api.js — Data layer
 * All network calls go here. Transforms raw API responses into
 * clean objects the rest of the app can consume.
 */

const GEO_BASE     = 'https://geocoding-api.open-meteo.com/v1';
const WEATHER_BASE = 'https://api.open-meteo.com/v1';

/* ── Weather code → human-readable condition ────────────────── */
const WMO_CODES = {
  0:  { label: 'Clear sky',         icon: '☀️' },
  1:  { label: 'Mainly clear',      icon: '🌤️' },
  2:  { label: 'Partly cloudy',     icon: '⛅' },
  3:  { label: 'Overcast',          icon: '☁️' },
  45: { label: 'Fog',               icon: '🌫️' },
  48: { label: 'Icy fog',           icon: '🌫️' },
  51: { label: 'Light drizzle',     icon: '🌦️' },
  53: { label: 'Drizzle',           icon: '🌦️' },
  55: { label: 'Heavy drizzle',     icon: '🌧️' },
  61: { label: 'Slight rain',       icon: '🌧️' },
  63: { label: 'Moderate rain',     icon: '🌧️' },
  65: { label: 'Heavy rain',        icon: '🌧️' },
  71: { label: 'Slight snow',       icon: '🌨️' },
  73: { label: 'Moderate snow',     icon: '❄️' },
  75: { label: 'Heavy snow',        icon: '❄️' },
  77: { label: 'Snow grains',       icon: '🌨️' },
  80: { label: 'Slight showers',    icon: '🌦️' },
  81: { label: 'Moderate showers',  icon: '🌧️' },
  82: { label: 'Violent showers',   icon: '⛈️' },
  85: { label: 'Snow showers',      icon: '🌨️' },
  86: { label: 'Heavy snow shower', icon: '❄️' },
  95: { label: 'Thunderstorm',      icon: '⛈️' },
  96: { label: 'Thunderstorm+hail', icon: '⛈️' },
  99: { label: 'Heavy thunderstorm',icon: '⛈️' },
};

export function decodeWeather(code) {
  return WMO_CODES[code] ?? { label: 'Unknown', icon: '🌡️' };
}

/* ── Generic safe fetch helper ──────────────────────────────── */
async function safeFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${res.statusText} (${url})`);
  }
  return res.json();
}

/* ── Geocoding: city name → { lat, lon, country, timezone } ── */
export async function geocodeCity(name) {
  const url = `${GEO_BASE}/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const data = await safeFetch(url);

  const result = data.results?.[0];
  if (!result) throw new Error(`City not found: "${name}"`);

  return {
    name:      result.name,
    country:   result.country ?? '',
    lat:       result.latitude,
    lon:       result.longitude,
    timezone:  result.timezone ?? 'auto',
  };
}

/* ── Current + hourly + daily weather for one location ──────── */
export async function fetchWeather({ lat, lon, timezone }) {
  const params = new URLSearchParams({
    latitude:              lat,
    longitude:             lon,
    timezone:              timezone,
    current:               [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'wind_speed_10m',
      'wind_direction_10m',
      'weather_code',
      'is_day',
      'precipitation',
      'surface_pressure',
      'visibility',
    ].join(','),
    hourly:                'temperature_2m,weather_code',
    daily:                 'weather_code,temperature_2m_max,temperature_2m_min',
    forecast_days:         7,
    wind_speed_unit:       'kmh',
    temperature_unit:      'celsius',
  });

  const url = `${WEATHER_BASE}/forecast?${params}`;
  return safeFetch(url);
}

/* ── Transform raw API response into a clean WeatherData object  */
export function parseWeather(raw, geo) {
  const c = raw.current ?? {};
  const condition = decodeWeather(c.weather_code);

  // Hourly: take next 12 hours from current time
  const allHours  = raw.hourly?.time         ?? [];
  const allHourTemps = raw.hourly?.temperature_2m ?? [];
  const allHourCodes = raw.hourly?.weather_code   ?? [];
  const nowISO    = c.time ?? '';
  const nowIdx    = allHours.findIndex(t => t >= nowISO);
  const startIdx  = nowIdx >= 0 ? nowIdx : 0;
  const hourly    = allHours.slice(startIdx, startIdx + 12).map((time, i) => ({
    time,
    temp:    allHourTemps[startIdx + i] ?? null,
    weather: decodeWeather(allHourCodes[startIdx + i] ?? 0),
  }));

  // Daily
  const daily = (raw.daily?.time ?? []).map((date, i) => ({
    date,
    weather: decodeWeather(raw.daily.weather_code?.[i] ?? 0),
    hi:      raw.daily.temperature_2m_max?.[i] ?? null,
    lo:      raw.daily.temperature_2m_min?.[i] ?? null,
  }));

  return {
    city:       geo.name,
    country:    geo.country,
    lat:        geo.lat,
    lon:        geo.lon,
    timezone:   geo.timezone,
    current: {
      temp:        c.temperature_2m          ?? null,
      feelsLike:   c.apparent_temperature    ?? null,
      humidity:    c.relative_humidity_2m    ?? null,
      windSpeed:   c.wind_speed_10m          ?? null,
      windDir:     c.wind_direction_10m      ?? null,
      pressure:    c.surface_pressure        ?? null,
      visibility:  c.visibility              ?? null,
      precipitation: c.precipitation         ?? null,
      isDay:       c.is_day                  ?? 1,
      condition,
    },
    hourly,
    daily,
  };
}

/* ── Fetch multiple cities in parallel (Promise.all) ────────── */
export async function fetchManyCities(cityNames) {
  // Geocode all at once, then fetch weather for all in parallel
  const geoResults  = await Promise.all(cityNames.map(geocodeCity));
  const weatherRaws = await Promise.all(geoResults.map(fetchWeather));
  return weatherRaws.map((raw, i) => parseWeather(raw, geoResults[i]));
}

/* ── Fetch one city detail (geocode + weather in parallel) ───── */
export async function fetchCityDetail(name) {
  const geo = await geocodeCity(name);
  const raw = await fetchWeather(geo);
  return parseWeather(raw, geo);
}