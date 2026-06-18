import { fetchAllCountries, fetchCountryDetails } from "./api.js";
import {
  renderGrid,
  renderDetail,
  renderSkeletons,
  renderEmpty,
  renderError,
  renderStatsBar,
} from "./render.js";

/* ─────────────────────────────────────────────
   STATE
──────────────────────────────────────────── */
const state = {
  allCountries: [],
  filtered: [],
  query: "",
  region: "all",
  sort: "name",
  favorites: new Set(),
  showFavs: false,
  loading: false,
  error: null,
  detailOpen: false,
};

/* ─────────────────────────────────────────────
   DOM ELEMENTS
──────────────────────────────────────────── */
const grid = document.getElementById("country-grid");
const searchInput = document.getElementById("search");
const regionSelect = document.getElementById("region-filter");
const sortSelect = document.getElementById("sort-by");
const statsBar = document.getElementById("stats-bar");
const resultCount = document.getElementById("result-count");

const detailPanel = document.getElementById("detail-panel");
const detailInner = document.getElementById("detail-inner");
const detailClose = document.getElementById("detail-close");
const detailLoading = document.getElementById("detail-loading");
const detailError = document.getElementById("detail-error");

const overlay = document.getElementById("overlay");
const favToggle = document.getElementById("fav-toggle");

/* ─────────────────────────────────────────────
   FILTER + SORT LOGIC
──────────────────────────────────────────── */
function applyFilters() {
  let results = [...state.allCountries];

  // Favorites filter
  if (state.showFavs) {
    results = results.filter((c) => state.favorites.has(c.code));
  }

  // Region filter
  if (state.region !== "all") {
    results = results.filter((c) => c.region === state.region);
  }

  // Search filter
  if (state.query) {
    const q = state.query.toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.officialName.toLowerCase().includes(q)
    );
  }

  // Sorting
  results.sort((a, b) => {
    if (state.sort === "name") return a.name.localeCompare(b.name);
    if (state.sort === "population") return b.population - a.population;
    if (state.sort === "area") return (b.area || 0) - (a.area || 0);
    return 0;
  });

  state.filtered = results;
}

/* ─────────────────────────────────────────────
   UI UPDATE
──────────────────────────────────────────── */
function updateUI() {
  applyFilters();

  if (state.error) {
    renderError(grid, state.error, init);
    return;
  }

  renderStatsBar(state.filtered, statsBar);

  resultCount.textContent = `${state.filtered.length} / ${state.allCountries.length} countries`;

  if (!state.filtered.length) {
    renderEmpty(grid, state.query);
    return;
  }

  renderGrid(state.filtered, grid, openDetail);
}

/* ─────────────────────────────────────────────
   DETAIL VIEW (Promise.all used here ✔)
──────────────────────────────────────────── */
async function openDetail(code) {
  detailPanel.classList.add("open");
  overlay.classList.add("visible");
  document.body.classList.add("panel-open");

  detailInner.innerHTML = "";
  detailLoading.hidden = false;
  detailError.hidden = true;

  state.detailOpen = true;

  history.pushState({ code }, "", `#${code}`);

  try {
    const data = await fetchCountryDetails(code);

    const country = data.country;
    const borders = data.borders;

    detailLoading.hidden = true;
    renderDetail(country, borders, detailInner);

    // Wire border clicks
    detailInner.querySelectorAll(".border-chip").forEach((btn) => {
      btn.addEventListener("click", () => openDetail(btn.dataset.code));
    });
  } catch (err) {
    detailLoading.hidden = true;
    detailError.hidden = false;
    detailError.textContent = "Failed to load country details.";
  }
}

/* ─────────────────────────────────────────────
   CLOSE DETAIL
──────────────────────────────────────────── */
function closeDetail() {
  detailPanel.classList.remove("open");
  overlay.classList.remove("visible");
  document.body.classList.remove("panel-open");

  state.detailOpen = false;

  history.pushState({}, "", window.location.pathname);
}

/* ─────────────────────────────────────────────
   FAVORITES
──────────────────────────────────────────── */
function toggleFavorite(code) {
  if (state.favorites.has(code)) {
    state.favorites.delete(code);
  } else {
    state.favorites.add(code);
  }
}

/* ─────────────────────────────────────────────
   DEBOUNCE
──────────────────────────────────────────── */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ─────────────────────────────────────────────
   EVENTS
──────────────────────────────────────────── */
searchInput.addEventListener(
  "input",
  debounce((e) => {
    state.query = e.target.value.trim();
    updateUI();
  }, 250)
);

regionSelect.addEventListener("change", (e) => {
  state.region = e.target.value;
  updateUI();
});

sortSelect.addEventListener("change", (e) => {
  state.sort = e.target.value;
  updateUI();
});

detailClose.addEventListener("click", closeDetail);
overlay.addEventListener("click", closeDetail);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetail();
});

/* ─────────────────────────────────────────────
   FAVORITES TOGGLE UI
──────────────────────────────────────────── */
favToggle.addEventListener("click", () => {
  state.showFavs = !state.showFavs;

  favToggle.classList.toggle("active", state.showFavs);
  favToggle.setAttribute("aria-pressed", String(state.showFavs));

  favToggle.textContent = state.showFavs
    ? "★ Favourites"
    : "☆ Favourites";

  updateUI();
});

/* ─────────────────────────────────────────────
   INIT APP
──────────────────────────────────────────── */
async function init() {
  try {
    state.loading = true;
    renderSkeletons(grid, 16);

    state.allCountries = await fetchAllCountries();

    state.loading = false;
    updateUI();

    // Open country from URL hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      openDetail(hash.toUpperCase());
    }
  } catch (err) {
    state.error = err.message;
    renderError(grid, state.error, init);
  }
}

init();