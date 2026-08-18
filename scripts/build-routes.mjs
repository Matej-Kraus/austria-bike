/*
 * Spočítá reálné trasy přes BRouter (OSM data, profil fastbike = silniční kolo)
 * a uloží je do src/data/routes.generated.json.
 *
 *   npm run build:routes
 *
 * Z každé trasy bere skutečnou délku, převýšení, stopu s výškami a kilometráž
 * jednotlivých průjezdních bodů. Aplikace pak nepotřebuje běhat na síť.
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { BASE, ROUTES } from "../src/data/routes.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "src", "data", "routes.generated.json");
const CACHE = join(HERE, ".cache");

const PROFILE = "fastbike";
const SIMPLIFY_M = 12; // tolerance zjednodušení stopy v metrech
const PROFILE_POINTS = 160; // kolik vzorků má výškový profil

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

function dist(a, b) {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const la1 = rad(a[1]);
  const la2 = rad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* vzdálenost bodu od úsečky, v metrech (lokální rovinná aproximace) */
function segDist(p, a, b) {
  const k = Math.cos(rad(p[1]));
  const x = (v) => v[0] * k * (Math.PI / 180) * R;
  const y = (v) => v[1] * (Math.PI / 180) * R;
  const px = x(p), py = y(p), ax = x(a), ay = y(a), bx = x(b), by = y(b);
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    let far = -1;
    let max = 0;
    for (let i = lo + 1; i < hi; i++) {
      const d = segDist(pts[i], pts[lo], pts[hi]);
      if (d > max) {
        max = d;
        far = i;
      }
    }
    if (max > tol && far > 0) {
      keep[far] = 1;
      stack.push([lo, far], [far, hi]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/* odpovědi si držíme na disku, ať se veřejný server nevolá při každé úpravě */
async function cached(lonlats) {
  const key = createHash("sha1").update(`${PROFILE}|${lonlats}`).digest("hex").slice(0, 16);
  const file = join(CACHE, `${key}.json`);
  try {
    return { geo: JSON.parse(await readFile(file, "utf8")), fresh: false };
  } catch {
    const geo = await brouter(lonlats);
    await mkdir(CACHE, { recursive: true });
    await writeFile(file, JSON.stringify(geo));
    return { geo, fresh: true };
  }
}

async function brouter(lonlats, attempt = 1) {
  const url =
    "https://brouter.de/brouter?" +
    new URLSearchParams({
      lonlats,
      profile: PROFILE,
      alternativeidx: "0",
      format: "geojson",
    });
  const res = await fetch(url, { headers: { "User-Agent": "trasy-sattendorf/1.0 (osobni plan cyklovyletu)" } });
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith("operation")) {
    if (attempt >= 4) throw new Error(`BRouter ${res.status}: ${text.slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 4000 * attempt));
    return brouter(lonlats, attempt + 1);
  }
  return JSON.parse(text);
}

/*
 * Rozbor povrchu z OSM tagů, které BRouter vrací u každého úseku.
 * Jedeme na silničních kolech, takže šotolina a lesní cesty jsou vyloučené —
 * tohle je podklad pro odznak "100 % asfalt" nebo konkrétní varování.
 */
const UNPAVED = new Set([
  "unpaved", "gravel", "fine_gravel", "compacted", "ground", "dirt", "earth",
  "grass", "sand", "mud", "pebblestone", "woodchips", "wood", "rock", "stone",
]);
const ROUGH = new Set(["sett", "cobblestone", "paving_stones", "unhewn_cobblestone", "bricks"]);
const PAVED = new Set(["asphalt", "paved", "concrete", "concrete:plates", "concrete:lanes", "chipseal", "metal"]);
/* cesty, kam se silničku prostě nedává, i když je surface netagovaný */
const OFFROAD_HIGHWAY = new Set(["path", "track", "bridleway", "steps"]);

const SURFACE_CZ = {
  gravel: "šotolina",
  fine_gravel: "jemná šotolina",
  compacted: "zpevněný štěrk",
  unpaved: "nezpevněné",
  ground: "polní cesta",
  dirt: "polní cesta",
  earth: "polní cesta",
  grass: "tráva",
  sand: "písek",
  pebblestone: "kamení",
  sett: "dlažební kostky",
  cobblestone: "kočičí hlavy",
  paving_stones: "zámková dlažba",
  track: "polní/lesní cesta",
  path: "pěšina",
  bridleway: "pěšina",
  steps: "schody",
};

function classify(tags) {
  const surface = /surface=([\w:]+)/.exec(tags)?.[1];
  const highway = /highway=([\w:]+)/.exec(tags)?.[1];

  if (surface && UNPAVED.has(surface)) return { kind: "unpaved", label: SURFACE_CZ[surface] ?? surface };
  if (surface && ROUGH.has(surface)) return { kind: "rough", label: SURFACE_CZ[surface] ?? surface };
  if (surface && PAVED.has(surface)) return { kind: "paved", label: "asfalt" };
  /* bez tagu surface rozhoduje typ cesty: silnice v Rakousku jsou asfaltové */
  if (highway && OFFROAD_HIGHWAY.has(highway))
    return { kind: "unpaved", label: SURFACE_CZ[highway] ?? highway };
  return { kind: "paved", label: "asfalt" };
}

function surfaceReport(messages) {
  const head = messages[0];
  const iDist = head.indexOf("Distance");
  const iTags = head.indexOf("WayTags");

  const totals = { paved: 0, rough: 0, unpaved: 0 };
  const runs = [];
  let run = null;
  let km = 0;

  for (const row of messages.slice(1)) {
    const meters = Number(row[iDist]) || 0;
    const { kind, label } = classify(row[iTags] ?? "");
    totals[kind] += meters;

    if (kind === "unpaved") {
      if (run && km - (run.km + run.meters / 1000) < 0.4) {
        run.meters += meters;
        if (!run.labels.includes(label)) run.labels.push(label);
      } else {
        run = { km: Math.round(km * 10) / 10, meters, labels: [label] };
        runs.push(run);
      }
    }
    km += meters / 1000;
  }

  const total = totals.paved + totals.rough + totals.unpaved;
  const unpavedPct = total ? (totals.unpaved / total) * 100 : 0;

  return {
    pavedKm: Math.round((totals.paved / 1000) * 10) / 10,
    roughKm: Math.round((totals.rough / 1000) * 10) / 10,
    unpavedKm: Math.round((totals.unpaved / 1000) * 10) / 10,
    unpavedPct: Math.round(unpavedPct * 10) / 10,
    roadOk: unpavedPct <= 3,
    /* drobné napojení od domu k silnici nikoho nezajímá, hlásíme úseky od 150 m */
    worst: runs
      .filter((s) => s.meters >= 150)
      .sort((a, b) => b.meters - a.meters)
      .slice(0, 4)
      .map((s) => ({
        km: s.km,
        toKm: Math.round((s.km + s.meters / 1000) * 10) / 10,
        meters: Math.round(s.meters),
        what: s.labels.join(" / "),
      }))
      .sort((a, b) => a.km - b.km),
  };
}

/* klouzavý průměr — surová data z DEM skáčou o metry i na rovině */
function smooth(values, win) {
  const out = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const lo = Math.max(0, i - win);
    const hi = Math.min(values.length - 1, i + win);
    let sum = 0;
    for (let j = lo; j <= hi; j++) sum += values[j];
    out[i] = sum / (hi - lo + 1);
  }
  return out;
}

function analyse(coords) {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum[i] = cum[i - 1] + dist(coords[i - 1], coords[i]);
  }
  const total = cum[cum.length - 1];

  const elevs = smooth(
    coords.map((c) => c[2] ?? 0),
    2
  );

  /*
   * Převýšení s prahem: stoupání se započítá až když souvisle nastoupá přes
   * THRESHOLD. Prostý součet kladných rozdílů nafoukne i rovinu o stovky metrů,
   * protože výšková data z DEM skáčou.
   */
  const THRESHOLD = 10;
  let ascent = 0;
  let anchor = elevs[0];
  let rising = false;
  const ascAt = [0];
  for (let i = 1; i < elevs.length; i++) {
    const e = elevs[i];
    if (rising) {
      if (e > anchor) {
        ascent += e - anchor;
        anchor = e;
      } else if (anchor - e > THRESHOLD) {
        anchor = e;
        rising = false;
      }
    } else {
      if (e < anchor) anchor = e;
      else if (e - anchor > THRESHOLD) {
        ascent += e - anchor;
        anchor = e;
        rising = true;
      }
    }
    ascAt[i] = ascent;
  }

  /* profil: rovnoměrné vzorky po vzdálenosti */
  const prof = [];
  let idx = 0;
  for (let s = 0; s < PROFILE_POINTS; s++) {
    const target = (s / (PROFILE_POINTS - 1)) * total;
    while (idx < cum.length - 1 && cum[idx + 1] < target) idx++;
    prof.push([Math.round((target / 1000) * 10) / 10, Math.round(elevs[idx])]);
  }

  /* nejdelší souvislé stoupání */
  let best = { gain: 0, from: 0, to: 0 };
  let startI = 0;
  let low = elevs[0];
  for (let i = 1; i < elevs.length; i++) {
    if (elevs[i] < low - 25) {
      low = elevs[i];
      startI = i;
    }
    const gain = elevs[i] - low;
    if (gain > best.gain) best = { gain, from: startI, to: i };
  }
  const climb =
    best.gain > 250
      ? {
          gain: Math.round(best.gain),
          km: Math.round(((cum[best.to] - cum[best.from]) / 1000) * 10) / 10,
          topAt: Math.round((cum[best.to] / 1000) * 10) / 10,
          grade: Math.round((best.gain / Math.max(1, cum[best.to] - cum[best.from])) * 1000) / 10,
        }
      : null;

  return { cum, total, elevs, prof, climb, ascent, ascAt };
}

/*
 * Průjezdní body hledáme popořadě od posledního nalezeného dál. Bez toho by
 * druhý průjezd Villachem dostal kilometráž toho prvního.
 */
function nearestIndex(coords, lat, lon, from = 0) {
  let bi = from;
  let bd = Infinity;
  for (let i = from; i < coords.length; i++) {
    const d = dist([lon, lat], coords[i]);
    if (d < bd) {
      bd = d;
      bi = i;
    }
  }
  return bi;
}

const routes = [];

for (const r of ROUTES) {
  const pts = [[BASE.lon, BASE.lat], ...r.wps.map((w) => [w[2], w[1]]), [BASE.lon, BASE.lat]];
  const lonlats = pts.map(([lo, la]) => `${lo},${la}`).join("|");

  process.stdout.write(`  ${r.id.padEnd(16)} `);
  const { geo, fresh } = await cached(lonlats);
  const coords = geo.features[0].geometry.coordinates;
  const { cum, total, elevs, prof, climb, ascent, ascAt } = analyse(coords);
  const surface = surfaceReport(geo.features[0].properties.messages);

  /* trasa musí být uzavřená smyčka od ubytování */
  const offStart = dist([BASE.lon, BASE.lat], coords[0]);
  const offEnd = dist([BASE.lon, BASE.lat], coords[coords.length - 1]);
  if (offStart > 400 || offEnd > 400) {
    throw new Error(
      `${r.id}: trasa nezačíná/nekončí v ${BASE.label} (start ${Math.round(offStart)} m, cíl ${Math.round(offEnd)} m)`
    );
  }

  let cursor = 0;
  const wps = r.wps.map((w) => {
    const i = nearestIndex(coords, w[1], w[2], cursor);
    cursor = i;
    return {
      name: w[0],
      lat: w[1],
      lon: w[2],
      km: Math.round((cum[i] / 1000) * 10) / 10,
      elev: Math.round(elevs[i]),
      hm: Math.round(ascAt[i] / 5) * 5,
    };
  });

  /* [lat, lon, výška] — výška je tu kvůli GPX do cyklopočítače */
  const line = simplify(coords, SIMPLIFY_M).map(([lo, la, el]) => [
    Math.round(la * 1e5) / 1e5,
    Math.round(lo * 1e5) / 1e5,
    Math.round(el ?? 0),
  ]);

  const lats = coords.map((c) => c[1]);
  const lons = coords.map((c) => c[0]);

  routes.push({
    id: r.id,
    km: Math.round((total / 1000) * 10) / 10,
    hm: Math.round(ascent / 5) * 5,
    maxElev: Math.round(Math.max(...elevs)),
    minElev: Math.round(Math.min(...elevs)),
    climb,
    surface,
    wps,
    prof,
    line,
    bounds: [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ],
  });

  const verdict = surface.roadOk
    ? surface.unpavedKm < 0.1
      ? "asfalt"
      : `asfalt (${surface.unpavedKm} km jinde)`
    : `!! ${surface.unpavedKm} km nezpevněno`;

  console.log(
    `${String(Math.round(total / 1000)).padStart(4)} km  ${String(Math.round(ascent)).padStart(5)} hm  ` +
      `max ${String(Math.round(Math.max(...elevs))).padStart(4)} m  ` +
      `${String(surface.unpavedPct).padStart(5)} % nezpev.  ${verdict}`
  );
  for (const s of surface.worst) {
    console.log(`${" ".repeat(20)}└ km ${s.km}–${s.toKm}: ${s.meters} m ${s.what}`);
  }

  if (fresh) await new Promise((res) => setTimeout(res, 1200)); // ohleduplnost k veřejnému serveru
}

await writeFile(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "BRouter (OpenStreetMap)",
      profile: PROFILE,
      routes,
    },
    null,
    1
  ) + "\n"
);

console.log(`\nHotovo → ${OUT}`);
