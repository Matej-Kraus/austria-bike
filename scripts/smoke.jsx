/*
 * Rychlá kontrola, že se aplikace vůbec vykreslí a že v ní sedí data.
 * Pouští se přes `npm run check` (Vite ji přeloží a spustí v Node).
 */

import { renderToString } from "react-dom/server";
import App from "../src/App.jsx";
import { ALL_ROUTES, BASE } from "../src/lib/routes.js";
import { buildGpx } from "../src/lib/gpx.js";

const problems = [];

const html = renderToString(<App />);
if (!html.includes("Kam dneska")) problems.push("hlavička se nevykreslila");
if (html.includes("vlak zpátky")) problems.push("UI pořád ukazuje vlak zpátky");
if (!html.includes("do 40 km")) problems.push("chybí kilometrový filtr");
if (!html.includes("Jen okruhy")) problems.push("chybí filtr jen okruhy");

for (const r of ALL_ROUTES) {
  if (r.estimated) problems.push(`${r.id}: chybí spočítaná data z BRouteru`);
  if (!r.line.length) problems.push(`${r.id}: prázdná stopa`);
  if (r.photos.length < 3) problems.push(`${r.id}: málo fotek (${r.photos.length}, chce 3+)`);
  if (r.escape) problems.push(`${r.id}: pořád má escape / vlak zpátky`);
  if (!r.surface) problems.push(`${r.id}: chybí rozbor povrchu`);

  const first = r.stops.at(0);
  const last = r.stops.at(-1);
  if (!first.base || first.km !== 0) problems.push(`${r.id}: nezačíná v ${BASE.label}`);
  if (!last.base || last.km !== r.km) problems.push(`${r.id}: nekončí v ${BASE.label}`);

  /* stopa musí být uzavřená smyčka kolem ubytování */
  const near = (p) => Math.hypot((p[0] - BASE.lat) * 111, (p[1] - BASE.lon) * 76) * 1000;
  if (near(r.line[0]) > 400) problems.push(`${r.id}: stopa začíná ${Math.round(near(r.line[0]))} m od základny`);
  if (near(r.line.at(-1)) > 400) problems.push(`${r.id}: stopa končí ${Math.round(near(r.line.at(-1)))} m od základny`);

  const gpx = buildGpx(r);
  if (!gpx.includes("<trkpt") || !gpx.includes(BASE.label)) problems.push(`${r.id}: rozbité GPX`);
}

console.log(`vykresleno ${Math.round(html.length / 1024)} kB HTML, ${ALL_ROUTES.length} tras`);
console.log(
  ALL_ROUTES.map(
    (r) =>
      `  ${r.id.padEnd(15)} ${String(r.km).padStart(5)} km ${String(r.hm).padStart(5)} hm  ` +
      `${r.photos.length} foto  ${r.surface.unpavedKm < 0.1 ? "asfalt" : `${r.surface.unpavedKm} km nezpev.`}`
  ).join("\n")
);

if (problems.length) {
  console.error(`\nPROBLÉMY (${problems.length}):`);
  problems.forEach((p) => console.error(`  ✗ ${p}`));
  process.exit(1);
}
console.log("\nVše sedí.");
