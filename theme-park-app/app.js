const API_BASE = "https://queue-times.com/parks";
const REFRESH_MS = 5 * 60 * 1000; // la API se actualiza cada 5 min

const state = {
  filter: "todos",
  favorites: new Set(JSON.parse(localStorage.getItem("colas:favorites") || "[]")),
  openParks: new Set(),
  cache: new Map(), // parkId -> { rides: [...], fetchedAt }
};

const main = document.getElementById("main");
const filtersEl = document.getElementById("filters");
const lastSyncEl = document.getElementById("last-sync");
const pulseDot = document.getElementById("pulse-dot");

function saveFavorites() {
  localStorage.setItem("colas:favorites", JSON.stringify([...state.favorites]));
}

function buildFilters() {
  const chips = [
    { id: "todos", label: "Todos" },
    { id: "favoritos", label: "★ Favoritos" },
    ...PARK_GROUPS.map((g) => ({ id: g.group, label: g.group })),
  ];
  filtersEl.innerHTML = "";
  chips.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "filter-chip" + (state.filter === c.id ? " active" : "");
    btn.textContent = c.label;
    btn.addEventListener("click", () => {
      state.filter = c.id;
      render();
    });
    filtersEl.appendChild(btn);
  });
}

function waitClass(wait) {
  if (wait <= 20) return "low";
  if (wait <= 45) return "mid";
  return "high";
}

// En producción (Vercel) esto llama a nuestra propia función serverless en /api/queue-times,
// que hace de intermediaria con Queue-Times.com sin problemas de CORS ni límites de terceros.
const USE_OWN_API = true; // false = llamar directo a queue-times.com (solo para pruebas locales sin Vercel)

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`http ${res.status}`);
  return res.json();
}

async function fetchParkQueue(parkId) {
  const url = USE_OWN_API
    ? `/api/queue-times?id=${parkId}`
    : `${API_BASE}/${parkId}/queue_times.json`;
  const data = await fetchJson(url);
  const rides = [
    ...(data.rides || []),
    ...(data.lands || []).flatMap((l) => l.rides || []),
  ];
  return rides;
}

function renderRides(park, rides) {
  if (!rides || rides.length === 0) {
    return `<div class="empty-state">Sin datos de atracciones ahora mismo.</div>`;
  }
  const sorted = [...rides].sort((a, b) => {
    if (a.is_open !== b.is_open) return a.is_open ? -1 : 1;
    return (b.wait_time || 0) - (a.wait_time || 0);
  });
  return sorted
    .map((r) => {
      const closed = !r.is_open;
      const cls = closed ? "closed" : waitClass(r.wait_time || 0);
      return `
        <div class="ride-row">
          <span class="ride-name ${closed ? "closed" : ""}">${escapeHtml(r.name)}</span>
          <span class="ride-wait ${cls}">${closed ? "CERRADO" : (r.wait_time ?? 0) + " MIN"}</span>
        </div>`;
    })
    .join("");
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function summaryFor(parkId) {
  const cached = state.cache.get(parkId);
  if (!cached) return { text: "···", hasData: false };
  if (cached.error && !cached.rides) return { text: "ERROR", hasData: false, error: true };
  const open = cached.rides.filter((r) => r.is_open);
  if (open.length === 0) return { text: "CERRADO", hasData: false };
  const avg = Math.round(open.reduce((s, r) => s + (r.wait_time || 0), 0) / open.length);
  return { text: `${avg} MIN AVG`, hasData: true };
}

// Iconos dot-matrix originales por categoría (sin logos de terceros)
const ICONS = {
  disney: [
    "00100","01110","11111","11111","11111",
  ],
  universal: [
    "01110","10001","10101","10001","01110",
  ],
  water: [
    "00000","01010","10101","01010","00000",
  ],
  coaster: [
    "10001","10001","01010","01010","00100",
  ],
};

function categoryFor(name) {
  const n = name.toLowerCase();
  if (n.includes("disney")) return "disney";
  if (n.includes("universal") || n.includes("epic universe") || n.includes("islands of adventure")) return "universal";
  if (n.includes("water") || n.includes("volcano") || n.includes("aquatica")) return "water";
  return "coaster";
}

function iconSvg(category) {
  const grid = ICONS[category] || ICONS.coaster;
  const dots = [];
  grid.forEach((row, y) => {
    [...row].forEach((v, x) => {
      if (v === "1") dots.push(`<circle cx="${x * 4 + 2}" cy="${y * 4 + 2}" r="1.6"/>`);
    });
  });
  return `<svg class="park-icon" viewBox="0 0 20 20" fill="currentColor">${dots.join("")}</svg>`;
}

function parkCard(park) {
  const isOpen = state.openParks.has(park.id);
  const isFav = state.favorites.has(park.id);
  const summary = summaryFor(park.id);
  const cached = state.cache.get(park.id);

  const bodyHtml = (() => {
    if (cached && cached.error && !cached.rides) {
      return `<div class="empty-state">No se pudo conectar con Queue-Times.com.<br><button class="retry-btn" data-retry="${park.id}">Reintentar</button></div>`;
    }
    if (cached && cached.rides) return renderRides(park, cached.rides);
    return `<div class="loading-state">Cargando…</div>`;
  })();

  const el = document.createElement("div");
  el.className = "park" + (isOpen ? " open" : "");
  el.innerHTML = `
    <div class="park-head">
      <span class="park-name">${iconSvg(categoryFor(park.name))}${escapeHtml(park.name)}</span>
      <span class="park-meta">
        <button class="fav-btn ${isFav ? "active" : ""}" aria-label="Favorito" data-fav="${park.id}">★</button>
        <span class="park-summary ${summary.hasData ? "has-data" : ""} ${summary.error ? "is-error" : ""}">${summary.text}</span>
        <span class="caret">▶</span>
      </span>
    </div>
    <div class="rides">${bodyHtml}</div>
  `;

  const retryBtn = el.querySelector("[data-retry]");
  if (retryBtn) {
    retryBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      retryBtn.textContent = "Reintentando…";
      await loadPark(park.id);
      render();
    });
  }

  el.querySelector(".fav-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.favorites.has(park.id)) state.favorites.delete(park.id);
    else state.favorites.add(park.id);
    saveFavorites();
    render();
  });

  el.querySelector(".park-head").addEventListener("click", async () => {
    if (state.openParks.has(park.id)) {
      state.openParks.delete(park.id);
    } else {
      state.openParks.add(park.id);
      if (!state.cache.has(park.id)) {
        await loadPark(park.id);
      }
    }
    render();
  });

  return el;
}

// Limita cuántas llamadas van en paralelo, para no saturar el proxy CORS gratuito
async function runLimited(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function loadPark(parkId, { retried = false } = {}) {
  try {
    const rides = await fetchParkQueue(parkId);
    state.cache.set(parkId, { rides, fetchedAt: Date.now(), error: null });
  } catch (e) {
    if (!retried) {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));
      return loadPark(parkId, { retried: true });
    }
    const prev = state.cache.get(parkId);
    state.cache.set(parkId, { rides: prev ? prev.rides : null, fetchedAt: Date.now(), error: true });
  }
}

function groupsForFilter() {
  if (state.filter === "todos") return PARK_GROUPS;
  if (state.filter === "favoritos") {
    return PARK_GROUPS
      .map((g) => ({ group: g.group, parks: g.parks.filter((p) => state.favorites.has(p.id)) }))
      .filter((g) => g.parks.length > 0);
  }
  return PARK_GROUPS.filter((g) => g.group === state.filter);
}

function render() {
  buildFilters();
  main.innerHTML = "";
  const groups = groupsForFilter();

  if (groups.length === 0) {
    main.innerHTML = `<div class="empty-state">Aún no tienes favoritos. Toca ★ en un parque para añadirlo.</div>`;
    return;
  }

  groups.forEach((g) => {
    const section = document.createElement("div");
    section.className = "region";
    section.innerHTML = `<div class="region-label">${escapeHtml(g.group)}</div>`;
    g.parks.forEach((p) => section.appendChild(parkCard(p)));
    main.appendChild(section);
  });
}

async function refreshOpenParks() {
  pulseDot.classList.add("pulse");
  const loaded = [...state.cache.keys()];
  await runLimited(loaded, 3, (id) => loadPark(id));
  lastSyncEl.textContent = `Última sync: ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  render();
  setTimeout(() => pulseDot.classList.remove("pulse"), 900);
}

async function init() {
  render();
  // Precarga datos de resumen (favoritos, o grupo España si no hay favoritos) SIN expandir las tarjetas
  const toPreload = state.favorites.size > 0
    ? [...state.favorites]
    : PARK_GROUPS[0].parks.map((p) => p.id); // grupo España por defecto
  await runLimited(toPreload, 3, (id) => loadPark(id));
  lastSyncEl.textContent = `Última sync: ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  render();

  setInterval(refreshOpenParks, REFRESH_MS);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

init();
