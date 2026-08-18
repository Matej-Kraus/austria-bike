/*
 * Spojí ručně psaný obsah tras s tím, co spočítal BRouter, a s fotkami.
 * Když generovaná data chybí, trasa se zobrazí s hrubým odhadem a příznakem
 * `estimated`, aby aplikace nespadla jen proto, že se nepustil build.
 */

import { BASE, ROUTES, TAGS, STATION, STAY } from "../data/routes.js";
import generated from "../data/routes.generated.json";
import photoData from "../data/photos.generated.json";

export { BASE, TAGS, STATION, STAY };

const byId = new Map(generated.routes.map((r) => [r.id, r]));

const BORING_PHOTO = /karte|map[_ ]|_map|wappen|coat of arms|flagge|locator|lageplan|positionskarte|umgebungskarte|im bezirk|\.svg/i;

function photoKey(p) {
  return p.src || p.page || "";
}

function isScenic(p) {
  const blob = `${p.caption ?? ""} ${p.article ?? ""} ${p.src ?? ""}`;
  return !BORING_PHOTO.test(blob);
}

function tokensOf(route) {
  const raw = [
    ...(route.photoQueries ?? []),
    ...(route.wps ?? []).map((w) => String(w[0] ?? w.name ?? "")),
    route.name,
  ];
  return raw
    .flatMap((s) =>
      String(s)
        .replace(/ \(\w+\)/g, "")
        .replace(/ \d[\d\s.]*m.*$/i, "")
        .split(/[\s,]+/)
        .filter((w) => w.length > 3)
    )
    .map((w) => w.toLowerCase());
}

function related(photo, tokens) {
  const blob = `${photo.caption ?? ""} ${photo.article ?? ""}`.toLowerCase();
  return tokens.some((t) => blob.includes(t));
}

/*
 * Ke každé trase 3–6 snímků. Nejdřív vlastní z buildu, když jich je málo,
 * doplní se záběry stejných míst z jiných tras (jezero, město, kopec).
 */
function resolvePhotos(route, allPhotos) {
  const mine = (allPhotos[route.id] ?? []).filter(isScenic);
  const seen = new Set(mine.map(photoKey));
  const extra = [];
  const tokens = tokensOf(route);

  for (const [id, list] of Object.entries(allPhotos)) {
    if (id === route.id) continue;
    for (const p of list) {
      if (!isScenic(p) || seen.has(photoKey(p))) continue;
      if (related(p, tokens)) {
        extra.push(p);
        seen.add(photoKey(p));
      }
    }
  }

  /* ještě pořád málo — vezmi libovolné zbylé scenic, ať karta není prázdná */
  if (mine.length + extra.length < 3) {
    for (const list of Object.values(allPhotos)) {
      for (const p of list) {
        if (!isScenic(p) || seen.has(photoKey(p))) continue;
        extra.push(p);
        seen.add(photoKey(p));
        if (mine.length + extra.length >= 3) break;
      }
      if (mine.length + extra.length >= 3) break;
    }
  }

  return [...mine, ...extra].slice(0, 6);
}

/*
 * Odhad čistého času v sedle: rovina 25 km/h, každých 750 m stoupání hodinu
 * navíc. Bez zastávek, bez focení, bez oběda v Tarvisiu.
 */
export function ridingHours({ km, hm }) {
  return km / 25 + hm / 750;
}

export function formatHours(hours) {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = Math.round((total % 60) / 5) * 5;
  return m === 60 ? `${h + 1}:00` : `${h}:${String(m).padStart(2, "0")}`;
}

export const ALL_ROUTES = ROUTES.map((route) => {
  const gen = byId.get(route.id);
  const km = gen?.km ?? route.fallback.km;
  const hm = gen?.hm ?? route.fallback.hm;
  const photos = resolvePhotos({ ...route, photoQueries: route.photos }, photoData.photos ?? {});

  return {
    ...route,
    photoQueries: route.photos,
    km,
    hm,
    photos,
    cover: photos[0] ?? null,
    estimated: !gen,
    maxElev: gen?.maxElev ?? null,
    climb: gen?.climb ?? null,
    surface: gen?.surface ?? null,
    prof: gen?.prof ?? [],
    line: gen?.line ?? [],
    bounds: gen?.bounds ?? null,
    /* průjezdní body vždy jako uzavřená smyčka od ubytování a zpátky */
    stops: [
      { name: BASE.label, km: 0, elev: BASE.elev, hm: 0, base: true },
      ...(gen?.wps ?? route.wps.map((w) => ({ name: w[0], lat: w[1], lon: w[2] }))),
      { name: BASE.label, km, elev: BASE.elev, hm, base: true },
    ],
    hours: ridingHours({ km, hm }),
  };
});

export const GENERATED_AT = generated.generatedAt;
