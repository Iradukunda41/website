/**
 * main.js — Wiring layer
 * Owns all application state. Wires events to API calls and renders.
 * Imports from api.js and render.js; never builds DOM directly.
 */

import { fetchManyCities, fetchCityDetail } from './api.js';
import { renderGrid, renderDetail, showState } from './render.js';

/* ── Default cities loaded on start ─────────────────────────── */
const DEFAULT_CITIES = [
  'Kigali',
  'London',
  'New York',
  'Tokyo',
  'Sydney',
  'Lagos',
  'Berlin',
  'Mumbai',
  'São Paulo',
  'Cairo',
  'Toronto',
  'Dubai',
];

/* ── App state ───────────────────────────────────────────────── */
const state = {
  allData:    [],   // WeatherData[] — full set currently loaded
  filter:     'all',
  query:      '',
  favSet:     new Set(JSON.parse(localStorage.getItem('skyline-favs') || '[]')),
  debounceTimer: null,
};

/* ── DOM refs ───────────────────────────────────────────────── */
const grid        = document.getElementById('city-grid');
const searchInput = document.getElementById('city-search');
const searchBtn   = document.getElementById('search-btn');
const retryBtn    = document.getElementById('retry-btn');
const filterBtns  = document.querySelectorAll('.filter-btn');
const overlay     = document.getElementById('detail-overlay');
const detailClose = document.getElementById('detail-close');

/* ── State IDs for showState helper ─────────────────────────── */
const GRID_STATES = ['loading-state', 'error-state', 'empty-state'];

function hideAllStates() {
  GRID_STATES.forEach(id => { document.getElementById(id).hidden = true; });
}

/* ── Persist favourites ──────────────────────────────────────── */
function saveFavs() {
  localStorage.setItem('skyline-favs', JSON.stringify([...state.favSet]));
}

/* ── Repaint the grid with current filter/query ─────────────── */
function repaintGrid() {
  hideAllStates();

  const { filtered } = renderGrid(grid, state.allData, {
    filter:  state.filter,
    query:   state.query,
    onOpen:  openDetail,
    onFav:   toggleFav,
    favSet:  state.favSet,
  });

  if (filtered.length === 0) {
    showState(GRID_STATES, 'empty-state');
    const qEl = document.getElementById('empty-query');
    qEl.textContent = state.query
      ? `"${state.query}" with filter "${state.filter}"`
      : `filter "${state.filter}"`;
  }
}

/* ── Toggle favourite ────────────────────────────────────────── */
function toggleFav(weatherData) {
  const { city } = weatherData;
  if (state.favSet.has(city)) {
    state.favSet.delete(city);
  } else {
    state.favSet.add(city);
  }
  saveFavs();
  repaintGrid();
}

/* ── Load initial or searched cities ────────────────────────── */
async function loadCities(cityNames) {
  hideAllStates();
  grid.innerHTML = '';
  document.getElementById('loading-state').hidden = false;

  try {
    const data = await fetchManyCities(cityNames);
    state.allData = data;
    document.getElementById('loading-state').hidden = true;
    repaintGrid();
  } catch (err) {
    console.error('loadCities error:', err);
    document.getElementById('loading-state').hidden = true;
    document.getElementById('error-state').hidden   = false;
    document.getElementById('error-msg').textContent =
      `Could not load weather: ${err.message}`;
  }
}

/* ── Detail panel ───────────────────────────────────────────── */
async function openDetail(weatherData) {
  // Show overlay immediately with loading state
  overlay.hidden = false;
  document.getElementById('detail-loading').hidden  = false;
  document.getElementById('detail-content').hidden  = true;
  document.getElementById('detail-error').hidden    = true;

  // Trap focus in overlay
  detailClose.focus();

  try {
    // Re-fetch detail for this city to get full hourly + daily data
    const detail = await fetchCityDetail(weatherData.city);

    renderDetail(overlay, detail);
    document.getElementById('detail-loading').hidden = true;
    document.getElementById('detail-content').hidden = false;
  } catch (err) {
    console.error('openDetail error:', err);
    document.getElementById('detail-loading').hidden    = true;
    document.getElementById('detail-error').hidden      = false;
    document.getElementById('detail-error-msg').textContent =
      `Could not load details: ${err.message}`;
  }
}

function closeDetail() {
  overlay.hidden = true;
}

/* ── Search handler (debounced for typing, immediate for button) */
function handleSearch(immediate = false) {
  const val = searchInput.value.trim();

  if (immediate) {
    if (!val) {
      // If blank, reset to default cities
      state.query = '';
      loadCities(DEFAULT_CITIES);
    } else {
      // Search: load just that city
      state.query = val;
      loadCities([val]);
    }
    return;
  }

  // Inline filter while typing (no network call)
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => {
    state.query = val;
    repaintGrid();
  }, 280);
}

/* ── Events ─────────────────────────────────────────────────── */

// Search
searchBtn.addEventListener('click', () => handleSearch(true));
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch(true);
});
searchInput.addEventListener('input', () => handleSearch(false));

// Filters
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filter = btn.dataset.filter;
    repaintGrid();
  });
});

// Retry
retryBtn.addEventListener('click', () => loadCities(DEFAULT_CITIES));

// Detail overlay close
detailClose.addEventListener('click', closeDetail);
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeDetail();
});

// Keyboard: Escape closes detail
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !overlay.hidden) closeDetail();
});

/* ── Boot ────────────────────────────────────────────────────── */
loadCities(DEFAULT_CITIES);