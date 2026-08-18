/*
 * Mapa se skutečnou stopou trasy (OpenStreetMap + Leaflet).
 * Ubytování a nádraží jsou v mapě pořád, ať je vidět, odkud se vyjíždí.
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { BASE, STATION } from "../data/routes.js";

const INK = "#14222a";
const TEAL = "#1a726d";

function pin(color, size, ring = 2) {
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:${ring}px solid #fff;box-sizing:border-box"></span>`,
  });
}

export default function MapView({ route, height = 300 }) {
  const holder = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    if (map.current) return;

    map.current = L.map(holder.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView([BASE.lat, BASE.lon], 11);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);

    layer.current = L.layerGroup().addTo(map.current);

    L.marker([BASE.lat, BASE.lon], { icon: pin(INK, 18, 3), zIndexOffset: 1000 })
      .bindTooltip(`Ubytování — ${BASE.label}`, { direction: "top", offset: [0, -10] })
      .addTo(map.current);

    L.marker([STATION.lat, STATION.lon], { icon: pin("#8aa0a8", 10) })
      .bindTooltip(`${STATION.name} — ${STATION.walk} m od ubytování`, { direction: "top", offset: [0, -8] })
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !layer.current) return;
    layer.current.clearLayers();

    if (!route?.line?.length) {
      m.setView([BASE.lat, BASE.lon], 11);
      return;
    }

    const latlngs = route.line.map(([lat, lon]) => [lat, lon]);

    L.polyline(latlngs, { color: "#ffffff", weight: 7, opacity: 0.85 }).addTo(layer.current);
    L.polyline(latlngs, { color: TEAL, weight: 3.5, opacity: 1 }).addTo(layer.current);

    /* nezpevněné úseky nejsou v mapě vidět, ale ať je vidět, kde jsou */
    for (const seg of route.surface?.worst ?? []) {
      const from = Math.round((seg.km / route.km) * (latlngs.length - 1));
      const to = Math.round((seg.toKm / route.km) * (latlngs.length - 1));
      const part = latlngs.slice(Math.max(0, from), Math.min(latlngs.length, to + 1));
      if (part.length > 1) {
        L.polyline(part, { color: "#b4531f", weight: 4, opacity: 1, dashArray: "3 5" })
          .bindTooltip(`${seg.meters} m ${seg.what}`, { direction: "top" })
          .addTo(layer.current);
      }
    }

    for (const stop of route.stops) {
      if (stop.base || !stop.lat) continue;
      L.marker([stop.lat, stop.lon], { icon: pin(TEAL, 11) })
        .bindTooltip(`${stop.name} · km ${stop.km}`, { direction: "top", offset: [0, -8] })
        .addTo(layer.current);
    }

    m.fitBounds(L.latLngBounds(latlngs).pad(0.12), { animate: false });
  }, [route]);

  return <div ref={holder} style={{ height }} className="w-full" />;
}
