const BASE_URL = "https://restcountries.com/v3.1";

/* ─────────────────────────────────────────────
   SAFE FETCH (error handling required by capstone)
──────────────────────────────────────────── */
async function safeFetch(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/* ─────────────────────────────────────────────
   DATA TRANSFORMATION (IMPORTANT REQUIREMENT)
   Clean raw API → UI-friendly objects
──────────────────────────────────────────── */
function shapeCountry(raw) {
  return {
    code: raw.cca3,

    name: raw.name?.common ?? "Unknown",
    officialName: raw.name?.official ?? raw.name?.common ?? "Unknown",

    region: raw.region ?? "Unknown",
    subregion: raw.subregion ?? "",

    capital: raw.capital?.[0] ?? "N/A",

    population: raw.population ?? 0,
    area: raw.area ?? 0,

    flag: raw.flags?.svg || raw.flags?.png || "",
    flagAlt: raw.flags?.alt || `Flag of ${raw.name?.common}`,

    emoji: raw.flag ?? "",

    languages: raw.languages
      ? Object.values(raw.languages)
      : [],

    currencies: raw.currencies
      ? Object.values(raw.currencies).map(
          (c) => `${c.name}${c.symbol ? ` (${c.symbol})` : ""}`
        )
      : [],

    timezones: raw.timezones ?? [],
    borders: raw.borders ?? [],

    latlng: raw.latlng ?? null,
    continents: raw.continents ?? [],

    independent: raw.independent ?? null,
    unMember: raw.unMember ?? false,

    maps: raw.maps?.googleMaps ?? null,

    coatOfArms:
      raw.coatOfArms?.svg || raw.coatOfArms?.png || null,
  };
}

/* ─────────────────────────────────────────────
   FETCH ALL COUNTRIES (MAIN LIST)
──────────────────────────────────────────── */
export async function fetchAllCountries() {
  const fields = [
    "name",
    "cca3",
    "region",
    "subregion",
    "capital",
    "population",
    "area",
    "flags",
    "flag",
    "languages",
    "currencies",
    "timezones",
    "borders",
    "latlng",
    "continents",
    "independent",
    "unMember",
    "maps",
    "coatOfArms",
  ].join(",");

  const data = await safeFetch(`${BASE_URL}/all?fields=${fields}`);

  return data.map(shapeCountry);
}

/* ─────────────────────────────────────────────
   FETCH SINGLE COUNTRY
──────────────────────────────────────────── */
export async function fetchCountryByCode(code) {
  const data = await safeFetch(`${BASE_URL}/alpha/${code}`);

  const country = Array.isArray(data) ? data[0] : data;

  return shapeCountry(country);
}

/* ─────────────────────────────────────────────
   FETCH BORDER COUNTRIES (PARALLEL REQUESTS)
   ✔ REQUIRED "Promise.all" USE (CAPSTONE REQUIREMENT)
──────────────────────────────────────────── */
export async function fetchBorderCountries(codes = []) {
  if (!codes.length) return [];

  const fields = "name,cca3,flags,flag,region";

  const requests = codes.map((code) =>
    safeFetch(`${BASE_URL}/alpha/${code}?fields=${fields}`)
  );

  const results = await Promise.all(requests);

  return results.map((res) => {
    const country = Array.isArray(res) ? res[0] : res;
    return shapeCountry(country);
  });
}

/* ─────────────────────────────────────────────
   COMBINED DETAIL FETCH (DETAIL VIEW)
──────────────────────────────────────────── */
export async function fetchCountryDetails(code) {
  const country = await fetchCountryByCode(code);
  const borders = await fetchBorderCountries(country.borders);

  return {
    country,
    borders,
  };
}