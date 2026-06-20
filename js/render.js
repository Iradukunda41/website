/**
 * render.js — Display layer
 * Pure DOM construction from clean data objects.
 * Never fetches data. Never modifies global state.
 */

/* ── Wind direction code ──────────────────────────────────────── */
function windDirLabel(deg) {
  if (deg == null) return '—';
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/* ── Day name from ISO date string ──────────────────────────── */
function shortDay(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en', { weekday: 'short' });
}

/* ── Hour label from ISO datetime string ────────────────────── */
function hourLabel(isoTime) {
  if (!isoTime) return '';
  const d = new Date(isoTime);
  return d.toLocaleTimeString('en', { hour: 'numeric', hour12: true });
}

/* ── Condition → card accent colour ────────────────────────── */
function conditionAccent(condition) {
  const label = condition?.label?.toLowerCase() ?? '';
  if (label.includes('thunder') || label.includes('storm'))  return '#6366f1';
  if (label.includes('rain')    || label.includes('drizzle') || label.includes('shower')) return '#3b82f6';
  if (label.includes('snow')    || label.includes('ice'))    return '#7dd3fc';
  if (label.includes('fog'))    return '#94a3b8';
  if (label.includes('cloud')   || label.includes('overcast')) return '#a8b5c8';
  if (label.includes('clear')   || label.includes('mainly clear')) return '#f59e0b';
  return '#1d6fe8';
}

/* ── Classify weather for filter ───────────────────────────── */
export function classifyWeather(weatherData) {
  const { temp, condition } = weatherData.current;
  const label = condition?.label?.toLowerCase() ?? '';
  const tags = ['all'];

  if (label.includes('clear') || label.includes('mainly clear')) tags.push('sunny');
  if (label.includes('cloud') || label.includes('overcast'))      tags.push('cloudy');
  if (label.includes('rain')  || label.includes('drizzle') || label.includes('shower') || label.includes('thunder')) tags.push('rainy');
  if (temp !== null && temp < 10) tags.push('cold');

  return tags;
}

/* ── Render a single city card ──────────────────────────────── */
export function renderCard(weatherData, { onOpen, onFav, isFav }) {
  const { city, country, current } = weatherData;
  const { temp, feelsLike, humidity, windSpeed, condition } = current;

  const li = document.createElement('li');
  li.className = 'city-card';
  li.setAttribute('role', 'listitem');
  li.setAttribute('tabindex', '0');
  li.setAttribute('aria-label', `${city}, ${country}. ${Math.round(temp)}°C, ${condition.label}. Click for details.`);
  li.style.setProperty('--card-accent', conditionAccent(condition));

  // Fav button
  const favBtn = document.createElement('button');
  favBtn.className = 'fav-btn' + (isFav ? ' active' : '');
  favBtn.textContent = '★';
  favBtn.setAttribute('aria-label', isFav ? `Remove ${city} from favourites` : `Add ${city} to favourites`);
  favBtn.setAttribute('aria-pressed', String(isFav));

  li.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-city">${city}</div>
        <div class="card-country">${country}</div>
        <div class="card-condition-text">${condition.label}</div>
      </div>
      <div class="card-condition-icon" aria-hidden="true">${condition.icon}</div>
    </div>
    <div class="card-temp-row">
      <div class="card-temp">${temp !== null ? Math.round(temp) : '—'}°</div>
      <div class="card-feels">Feels like<br>${feelsLike !== null ? Math.round(feelsLike) + '°C' : '—'}</div>
    </div>
    <div class="card-meta">
      <div class="card-meta-item">
        <span class="card-meta-label">HUM</span>
        <span>${humidity !== null ? humidity + '%' : '—'}</span>
      </div>
      <div class="card-meta-item">
        <span class="card-meta-label">WIND</span>
        <span>${windSpeed !== null ? Math.round(windSpeed) + ' km/h' : '—'}</span>
      </div>
    </div>
  `;

  li.appendChild(favBtn);

  // Events
  li.addEventListener('click', (e) => {
    if (e.target === favBtn || favBtn.contains(e.target)) return;
    onOpen(weatherData);
  });

  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(weatherData);
    }
  });

  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onFav(weatherData);
  });

  return li;
}

/* ── Render the full card grid ──────────────────────────────── */
export function renderGrid(grid, allData, { filter, query, onOpen, onFav, favSet }) {
  grid.innerHTML = '';

  const filtered = allData.filter(d => {
    const tags  = classifyWeather(d);
    const matchFilter = filter === 'all' || tags.includes(filter);
    const matchQuery  = !query || d.city.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  return { filtered, rendered: filtered.map(d => {
    const card = renderCard(d, {
      onOpen,
      onFav,
      isFav: favSet.has(d.city),
    });
    grid.appendChild(card);
    return card;
  })};
}

/* ── Render detail panel content ────────────────────────────── */
export function renderDetail(panel, weatherData) {
  const { city, country, current, daily, hourly } = weatherData;
  const {
    temp, feelsLike, humidity, windSpeed, windDir,
    pressure, visibility, precipitation, condition,
  } = current;

  panel.querySelector('#detail-country').textContent     = country;
  panel.querySelector('#detail-city-name').textContent   = city;
  panel.querySelector('#detail-condition').textContent   = `${condition.icon}  ${condition.label}`;
  panel.querySelector('#detail-temp').textContent        = temp !== null ? `${Math.round(temp)}°C` : '—';
  panel.querySelector('#detail-feels').textContent       = feelsLike !== null ? `Feels like ${Math.round(feelsLike)}°C` : '';

  // Stats
  const stats = [
    { label: 'Humidity',     value: humidity    !== null ? `${humidity}%`              : '—' },
    { label: 'Wind',         value: windSpeed   !== null ? `${Math.round(windSpeed)} km/h ${windDirLabel(windDir)}` : '—' },
    { label: 'Pressure',     value: pressure    !== null ? `${Math.round(pressure)} hPa` : '—' },
    { label: 'Visibility',   value: visibility  !== null ? `${(visibility / 1000).toFixed(1)} km` : '—' },
    { label: 'Precipitation',value: precipitation !== null ? `${precipitation} mm`     : '—' },
  ];

  const statsEl = panel.querySelector('#detail-stats');
  statsEl.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
    </div>
  `).join('');

  // Forecast
  const forecastEl = panel.querySelector('#forecast-row');
  forecastEl.innerHTML = daily.map(d => `
    <div class="forecast-day">
      <div class="forecast-day-name">${shortDay(d.date)}</div>
      <div class="forecast-icon">${d.weather.icon}</div>
      <div class="forecast-hi">${d.hi !== null ? Math.round(d.hi) + '°' : '—'}</div>
      <div class="forecast-lo">${d.lo !== null ? Math.round(d.lo) + '°' : '—'}</div>
    </div>
  `).join('');

  // Hourly
  const hourlyEl = panel.querySelector('#hourly-row');
  hourlyEl.innerHTML = hourly.map(h => `
    <div class="hourly-item">
      <div class="hourly-time">${hourLabel(h.time)}</div>
      <div class="hourly-icon">${h.weather.icon}</div>
      <div class="hourly-temp">${h.temp !== null ? Math.round(h.temp) + '°' : '—'}</div>
    </div>
  `).join('');
}

/* ── State helpers ──────────────────────────────────────────── */
export function showState(ids, visibleId) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.hidden = (id !== visibleId);
  }
}