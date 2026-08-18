/*
 * Vyrobí GPX ze stopy trasy, aby šla nahrát do cyklopočítače nebo navigace.
 * Stopa začíná i končí u ubytování v Sattendorfu.
 */

import { BASE } from "../data/routes.js";

const esc = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

export function buildGpx(route) {
  const points = route.line
    .map(([lat, lon, ele]) =>
      ele == null
        ? `<trkpt lat="${lat}" lon="${lon}"/>`
        : `<trkpt lat="${lat}" lon="${lon}"><ele>${ele}</ele></trkpt>`
    )
    .join("\n");

  const waypoints = route.stops
    .filter((s) => s.lat && s.lon)
    .map((s) => `<wpt lat="${s.lat}" lon="${s.lon}"><name>${esc(s.name)}</name></wpt>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Kam dneska — Sattendorf" xmlns="http://www.topografix.com/GPX/1/1">
<metadata>
 <name>${esc(route.name)}</name>
 <desc>${esc(`${route.km} km, ${route.hm} m nahoru. Start i cíl: ${BASE.address}.`)}</desc>
</metadata>
<wpt lat="${BASE.lat}" lon="${BASE.lon}"><name>Start a cíl — ${esc(BASE.label)}</name></wpt>
${waypoints}
<trk>
 <name>${esc(route.name)}</name>
 <trkseg>
${points}
 </trkseg>
</trk>
</gpx>
`;
}

export function downloadGpx(route) {
  const blob = new Blob([buildGpx(route)], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sattendorf-${route.id}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}
