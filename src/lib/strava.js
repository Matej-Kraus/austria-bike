/*
 * Strava bez OAuth: heatmapa (kudy jezdí místní) a nahrání našeho GPX.
 * Trasy si Strava drží za přihlášením, proto je nelistujeme z API.
 */

import { BASE } from "../data/routes.js";
import { downloadGpx } from "./gpx.js";

export function stravaHeatmap(route) {
  const b = route?.bounds;
  const lat = b ? (b[0][0] + b[1][0]) / 2 : BASE.lat;
  const lon = b ? (b[0][1] + b[1][1]) / 2 : BASE.lon;
  const span = b ? Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]) : 0.2;
  const zoom = span > 0.8 ? 10 : span > 0.35 ? 11 : 12;
  return `https://www.strava.com/maps/global-heatmap#${zoom}/${lon.toFixed(4)}/${lat.toFixed(4)}/hot/ride`;
}

export function stravaSegments(route) {
  const q = route.sights?.find((s) => s.kind === "krajina")?.name ?? route.name;
  return `https://www.strava.com/segments/search?filter_type=Ride&keywords=${encodeURIComponent(q)}`;
}

export function stravaSegmentUrl(route) {
  if (route.stravaId) return `https://www.strava.com/segments/${route.stravaId}`;
  return stravaSegments(route);
}

export function sendGpxToStrava(route) {
  downloadGpx(route);
  window.open("https://www.strava.com/upload/select", "_blank", "noopener,noreferrer");
}
