/* ─────────────────────────────────────────────
   NUMBER FORMATTING HELPERS
──────────────────────────────────────────── */
export function formatNumber(n) {
  if (!n && n !== 0) return "N/A";

  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";

  return n.toLocaleString();
}

export function formatArea(area) {
  if (!area) return "N/A";
  return `${area.toLocaleString()} km²`;
}

/* ─────────────────────────────────────────────
   REGION COLORS (UI DESIGN SYSTEM)
──────────────────────────────────────────── */
const REGION_COLORS = {
  Africa: "#F59E0B",
  Americas: "#10B981",
  Asia: "#6366F1",
  Europe: "#3B82F6",
  Oceania: "#EC4899",
  Antarctic: "#94A3B8",
  Unknown: "#64748B",
};

export function regionColor(region) {
  return REGION_COLORS[region] || "#64748B";
}

/* ─────────────────────────────────────────────
   BUILD COUNTRY CARD
──────────────────────────────────────────── */
export function buildCard(country, onClick) {
  const card = document.createElement("article");

  card.className = "country-card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `View details for ${country.name}`);

  const accent = regionColor(country.region);

  card.innerHTML = `
    <div class="card-flag" style="background-image:url('${country.flag}')" role="img" aria-label="${country.flagAlt}">
      <div class="card-flag-overlay"></div>
      <span class="card-region-badge" style="--region-color:${accent}">
        ${country.region}
      </span>
    </div>

    <div class="card-body">
      <div class="card-emoji">${country.emoji || "🌍"}</div>

      <h2 class="card-name">${country.name}</h2>

      <p class="card-capital">
        ${country.capital || "N/A"}
      </p>

      <div class="card-stats">
        <div class="card-stat">
          <span class="stat-icon">👥</span>
          <span class="stat-value">
            ${formatNumber(country.population)}
          </span>
        </div>

        <div class="card-stat">
          <span class="stat-icon">📐</span>
          <span class="stat-value">
            ${formatArea(country.area)}
          </span>
        </div>
      </div>
    </div>
  `;

  // Click + keyboard accessibility
  const activate = (e) => {
    if (e.type === "click" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(country.code);
    }
  };

  card.addEventListener("click", activate);
  card.addEventListener("keydown", activate);

  return card;
}

/* ─────────────────────────────────────────────
   RENDER GRID
──────────────────────────────────────────── */
export function renderGrid(countries, container, onClick) {
  container.innerHTML = "";

  if (!countries.length) return;

  const fragment = document.createDocumentFragment();

  countries.forEach((country) => {
    fragment.appendChild(buildCard(country, onClick));
  });

  container.appendChild(fragment);
}

/* ─────────────────────────────────────────────
   DETAIL VIEW RENDER
──────────────────────────────────────────── */
export function renderDetail(country, borders, panel) {
  const accent = regionColor(country.region);

  panel.innerHTML = `
    <!-- HERO -->
    <div class="detail-hero" style="background-image:url('${country.flag}')" role="img" aria-label="${country.flagAlt}">
      <div class="detail-hero-overlay"></div>

      <div class="detail-hero-content">
        <span class="detail-emoji">${country.emoji || "🌍"}</span>

        <h1 class="detail-name">${country.name}</h1>

        ${
          country.officialName !== country.name
            ? `<p class="detail-official">${country.officialName}</p>`
            : ""
        }

        <span class="detail-region-badge" style="--region-color:${accent}">
          ${country.region}${country.subregion ? ` · ${country.subregion}` : ""}
        </span>
      </div>
    </div>

    <!-- BODY -->
    <div class="detail-body">

      <!-- STATS -->
      <div class="detail-stats-row">
        <div class="detail-stat-box">
          <span class="dstat-label">Population</span>
          <span class="dstat-value">${country.population.toLocaleString()}</span>
        </div>

        <div class="detail-stat-box">
          <span class="dstat-label">Area</span>
          <span class="dstat-value">${formatArea(country.area)}</span>
        </div>

        <div class="detail-stat-box">
          <span class="dstat-label">Capital</span>
          <span class="dstat-value">${country.capital}</span>
        </div>

        <div class="detail-stat-box">
          <span class="dstat-label">UN Member</span>
          <span class="dstat-value">
            ${country.unMember ? "✓ Yes" : "✗ No"}
          </span>
        </div>
      </div>

      <!-- FACTS -->
      <div class="detail-facts">
        ${detailRow("🗣️ Languages", country.languages.join(", ") || "N/A")}
        ${detailRow("💱 Currencies", country.currencies.join(", ") || "N/A")}
        ${detailRow("🕐 Timezones", country.timezones.join(", ") || "N/A")}
        ${detailRow("🌍 Continents", country.continents.join(", ") || "N/A")}

        ${
          country.maps
            ? `
          <div class="detail-row">
            <a href="${country.maps}" target="_blank" rel="noopener" class="maps-link">
              📍 View on Google Maps ↗
            </a>
          </div>
        `
            : ""
        }
      </div>

      <!-- BORDERS -->
      ${
        borders.length
          ? `
        <div class="detail-borders">
          <h3 class="borders-heading">Bordering Countries</h3>

          <div class="borders-grid">
            ${borders
              .map(
                (b) => `
              <button class="border-chip" data-code="${b.code}">
                <img src="${b.flag}" alt="${b.name} flag" class="border-flag" />
                <span>${b.name}</span>
              </button>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }

      <!-- COAT OF ARMS -->
      ${
        country.coatOfArms
          ? `
        <div class="detail-coa">
          <h3 class="coa-heading">Coat of Arms</h3>
          <img src="${country.coatOfArms}" alt="Coat of arms of ${country.name}" class="coa-img" />
        </div>
      `
          : ""
      }

    </div>
  `;
}

/* ─────────────────────────────────────────────
   DETAIL ROW HELPER
──────────────────────────────────────────── */
function detailRow(label, value) {
  return `
    <div class="detail-row">
      <span class="detail-row-label">${label}</span>
      <span class="detail-row-value">${value}</span>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   SKELETON LOADING UI
──────────────────────────────────────────── */
export function renderSkeletons(container, count = 12) {
  container.innerHTML = Array.from({ length: count })
    .map(
      () => `
    <div class="skeleton-card">
      <div class="skel skel-flag"></div>
      <div class="skel-body">
        <div class="skel skel-line wide"></div>
        <div class="skel skel-line medium"></div>
        <div class="skel skel-row">
          <div class="skel skel-line short"></div>
          <div class="skel skel-line short"></div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

/* ─────────────────────────────────────────────
   EMPTY STATE
──────────────────────────────────────────── */
export function renderEmpty(container, query) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>No results for "${query}"</h3>
      <p>Try searching by country name, capital, or region.</p>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   ERROR STATE
──────────────────────────────────────────── */
export function renderError(container, message, onRetry) {
  container.innerHTML = `
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Something went wrong</h3>
      <p>${message}</p>
      <button class="retry-btn" id="retry-btn">Try again</button>
    </div>
  `;

  container.querySelector("#retry-btn")?.addEventListener("click", onRetry);
}

/* ─────────────────────────────────────────────
   STATS BAR (reduce() requirement)
──────────────────────────────────────────── */
export function renderStatsBar(countries, el) {
  if (!countries.length) {
    el.textContent = "";
    return;
  }

  const totalPop = countries.reduce((sum, c) => sum + c.population, 0);
  const totalArea = countries.reduce((sum, c) => sum + (c.area || 0), 0);
  const regions = new Set(countries.map((c) => c.region)).size;

  el.innerHTML = `
    <span>${countries.length} <em>countries</em></span>
    <span>${formatNumber(totalPop)} <em>people</em></span>
    <span>${formatNumber(totalArea)} km² <em>land</em></span>
    <span>${regions} <em>regions</em></span>
  `;
}