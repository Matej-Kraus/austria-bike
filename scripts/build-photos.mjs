/*
 * Stáhne ke každé trase fotky míst z Wikipedie / Wikimedia Commons včetně
 * autora a licence a uloží je do src/data/photos.generated.json.
 *
 *   npm run build:photos
 *
 * Ukládají se jen odkazy na obrázky, ne samotné soubory.
 * Cíl: 3–6 skutečných snímků míst NA TRASĚ, ne mapy a erby.
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { ROUTES } from "../src/data/routes.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "src", "data", "photos.generated.json");
const CACHE = join(HERE, ".cache");
const UA = { "User-Agent": "trasy-sattendorf/1.0 (osobni plan cyklovyletu)" };
const WIDTH = 1000;
const WANT = 6;

const strip = (html) =>
  (html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);

const REJECT =
  /karte|map[_ ]|_map|wappen|coat of arms|flagge|flag of|logo|icon|diagram|lageplan|positionskarte|locator|umgebungskarte|im bezirk|diskussion|schematic|signature|\.svg|svg\.png|ski|schnee|snow|winter|loipe|piste|schifahren|november|februar|jänner|january|december/i;

function termsOf(route) {
  return [...new Set((route.sights ?? []).map((s) => s.query).filter(Boolean))];
}

async function api(base, params) {
  const url = `${base}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  const file = join(CACHE, `wiki-${createHash("sha1").update(url).digest("hex").slice(0, 16)}.json`);
  try {
    return { data: JSON.parse(await readFile(file, "utf8")), fresh: false };
  } catch {
    /* v cache není */
  }

  let attempt = 1;
  while (true) {
    const res = await fetch(url, { headers: UA });
    if (res.status === 429 || res.status >= 500) {
      if (attempt > 4) throw new Error(`${base} → ${res.status}`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`${base} → ${res.status}`);
    const data = await res.json();
    await mkdir(CACHE, { recursive: true });
    await writeFile(file, JSON.stringify(data));
    return { data, fresh: true };
  }
}

function score(info) {
  let s = 0;
  const mime = info.mime ?? "";
  if (mime.includes("jpeg")) s += 3;
  if (mime.includes("png")) s += 1;
  if (info.width && info.height && info.width > info.height) s += 4;
  if (info.width && info.height && info.height > info.width * 1.2) s -= 2;
  if ((info.width ?? 0) >= 800) s += 1;
  return s;
}

async function fileInfo(file) {
  const { data, fresh } = await api("https://commons.wikimedia.org/w/api.php", {
    action: "query",
    titles: file.startsWith("File:") ? file : `File:${file}`,
    prop: "imageinfo",
    iiprop: "url|extmetadata|size|mime",
    iiurlwidth: String(WIDTH),
  });
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return { info: null, fresh };
  const meta = info.extmetadata ?? {};
  const clean = (u) => (u ?? "").split("?")[0];
  const title = page.title ?? file;
  if (REJECT.test(title) || REJECT.test(info.url ?? "") || REJECT.test(info.descriptionurl ?? "")) {
    return { info: null, fresh };
  }
  const mime = info.mime ?? "";
  if (mime && !/^image\/(jpeg|png|webp)/.test(mime)) return { info: null, fresh };
  return {
    info: {
      src: clean(info.thumburl ?? info.url),
      width: info.thumbwidth ?? info.width ?? null,
      height: info.thumbheight ?? info.height ?? null,
      mime,
      author: strip(meta.Artist?.value) || "neuveden",
      license: strip(meta.LicenseShortName?.value) || "viz Commons",
      page: info.descriptionurl,
      file: title.replace(/^File:/, ""),
    },
    fresh,
  };
}

async function commonsSearch(term, limit = 8) {
  const { data, fresh } = await api("https://commons.wikimedia.org/w/api.php", {
    action: "query",
    generator: "search",
    gsrsearch: term,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|extmetadata|size|mime",
    iiurlwidth: String(WIDTH),
  });
  const pages = Object.values(data.query?.pages ?? {});
  const hits = [];
  for (const page of pages) {
    const title = page.title ?? "";
    if (REJECT.test(title)) continue;
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const mime = info.mime ?? "";
    if (mime && !/^image\/(jpeg|png|webp)/.test(mime)) continue;
    if (REJECT.test(info.url ?? "") || REJECT.test(info.descriptionurl ?? "")) continue;
    const meta = info.extmetadata ?? {};
    const clean = (u) => (u ?? "").split("?")[0];
    hits.push({
      src: clean(info.thumburl ?? info.url),
      width: info.thumbwidth ?? info.width ?? null,
      height: info.thumbheight ?? info.height ?? null,
      mime,
      author: strip(meta.Artist?.value) || "neuveden",
      license: strip(meta.LicenseShortName?.value) || "viz Commons",
      page: info.descriptionurl,
      file: title.replace(/^File:/, ""),
      caption: term,
    });
  }
  return { hits, fresh };
}

async function wikiLead(term) {
  const { data, fresh } = await api("https://de.wikipedia.org/w/api.php", {
    action: "query",
    prop: "pageimages",
    piprop: "name",
    generator: "search",
    gsrsearch: term,
    gsrlimit: "3",
    gsrnamespace: "0",
  });
  const pages = Object.values(data.query?.pages ?? {});
  return { pages: pages.filter((p) => p.pageimage && !REJECT.test(p.pageimage) && !REJECT.test(p.title ?? "")), fresh };
}

const out = {};

async function collect(term, byFile) {
  const before = byFile.size;
  try {
    const { hits, fresh } = await commonsSearch(term, 5);
    for (const h of hits) {
      if (!byFile.has(h.file)) byFile.set(h.file, { ...h, caption: term });
    }
    if (fresh) await new Promise((res) => setTimeout(res, 300));

    const got = [...byFile.values()].filter((p) => p.caption === term).length;
    if (got > 0) return;
    const lead = await wikiLead(term);
    for (const page of lead.pages.slice(0, 2)) {
      const { info, fresh: f2 } = await fileInfo(page.pageimage);
      if (info && !byFile.has(info.file)) {
        byFile.set(info.file, { ...info, caption: term, article: page.title });
      }
      if (f2) await new Promise((res) => setTimeout(res, 300));
    }
    if (lead.fresh) await new Promise((res) => setTimeout(res, 300));
  } catch (err) {
    console.warn(`  ! ${term}: ${err.message}`);
  }
  return byFile.size - before;
}

function pickRoundRobin(photos, want) {
  const buckets = new Map();
  for (const p of photos) {
    if (!p.src) continue;
    const key = p.caption || "místo";
    const list = buckets.get(key) ?? [];
    list.push(p);
    buckets.set(key, list);
  }
  for (const list of buckets.values()) list.sort((a, b) => score(b) - score(a));

  const picked = [];
  const used = new Set();
  const keys = [...buckets.keys()];
  let round = 0;
  while (picked.length < want) {
    let added = false;
    for (const key of keys) {
      const p = buckets.get(key)[round];
      if (p && !used.has(p.file)) {
        picked.push(p);
        used.add(p.file);
        added = true;
        if (picked.length >= want) break;
      }
    }
    if (!added) break;
    round += 1;
  }
  return picked;
}

for (const r of ROUTES) {
  const terms = termsOf(r);
  const byFile = new Map();
  const bySight = new Map((r.sights ?? []).map((s) => [s.query, s]));

  for (const term of terms) await collect(term, byFile);

  const picked = pickRoundRobin([...byFile.values()], WANT).map(({ file, mime, ...rest }) => {
    const sight = bySight.get(rest.caption);
    return {
      ...rest,
      caption: sight?.name ?? rest.caption,
      kind: sight?.kind ?? "krajina",
      look: sight?.look ?? "",
    };
  });

  out[r.id] = picked;
  console.log(
    `  ${r.id.padEnd(16)} ${picked.length} foto  ${picked.map((p) => p.caption).join(", ")}`
  );
}

await writeFile(
  OUT,
  JSON.stringify({ generatedAt: new Date().toISOString(), source: "Wikimedia Commons", photos: out }, null, 1) + "\n"
);

console.log(`\nHotovo → ${OUT}`);
