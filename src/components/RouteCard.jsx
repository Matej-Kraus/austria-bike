/*
 * Jedna trasa v seznamu. Zavřená ukazuje to podstatné pro rozhodnutí,
 * rozbalená všechno ostatní včetně mapy a odkazu do navigace.
 */

import { BASE, formatHours } from "../lib/routes.js";
import { TAGS } from "../data/routes.js";
import { downloadGpx } from "../lib/gpx.js";
import Elevation from "./Elevation.jsx";
import MapView from "./MapView.jsx";
import { SurfaceBadge, SurfaceDetail } from "./Surface.jsx";

const nb = (v) => String(v).replace(".", ",");

function mapyUrl(route) {
  const point = (lat, lon) => `${lon.toFixed(5)},${lat.toFixed(5)}`;
  const via = route.stops
    .filter((s) => !s.base && s.lat)
    .map((s) => point(s.lat, s.lon))
    .join(";");
  return (
    "https://mapy.com/fnc/v1/route?mapset=outdoor&routeType=bike_road" +
    `&start=${point(BASE.lat, BASE.lon)}&end=${point(BASE.lat, BASE.lon)}&waypoints=${via}`
  );
}

function googleUrl(route) {
  const via = route.stops
    .filter((s) => !s.base && s.lat)
    .slice(0, 9)
    .map((s) => `${s.lat},${s.lon}`)
    .join("|");
  return (
    "https://www.google.com/maps/dir/?api=1&travelmode=bicycling" +
    `&origin=${BASE.lat},${BASE.lon}&destination=${BASE.lat},${BASE.lon}&waypoints=${encodeURIComponent(via)}`
  );
}

function Stat({ value, unit, note, accent }) {
  return (
    <div>
      <div className={`display num text-3xl font-bold leading-none ${accent ? "text-teal" : ""}`}>
        {value}
        {unit && <span className="text-base font-semibold ml-0.5">{unit}</span>}
      </div>
      <div className="label text-muted mt-0.5">{note}</div>
    </div>
  );
}

export default function RouteCard({ route, open, onToggle }) {
  return (
    <article
      className={`rounded-2xl overflow-hidden bg-card transition-colors ${
        open ? "ring-1 ring-teal" : "ring-1 ring-line"
      }`}
    >
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex gap-3 p-3">
          {route.cover ? (
            <img
              src={route.cover.src}
              alt={route.cover.caption}
              loading="lazy"
              className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl shrink-0 bg-wash"
            />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl shrink-0 bg-wash" />
          )}

          <div className="min-w-0 flex-1">
            <h3 className="display text-2xl font-semibold leading-tight">{route.name}</h3>
            <p className="text-sm text-muted leading-snug mt-0.5">{route.claim}</p>

            <div className="flex items-end gap-4 mt-2">
              <Stat value={nb(route.km)} unit="km" note="délka" accent />
              <Stat value={route.hm} unit="m" note="nahoru" />
              <Stat value={formatHours(route.hours)} note="v sedle" />
            </div>
          </div>
        </div>

        <div className="px-3 pb-3 flex items-center gap-2 flex-wrap">
          <SurfaceBadge surface={route.surface} />
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              route.kind === "vyjezd" ? "bg-wash text-muted" : "bg-teal-soft text-teal"
            }`}
          >
            {route.kind === "vyjezd" ? "výjezd" : "okruh"}
          </span>
          {route.official && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-teal-soft text-teal">
              {route.official}
            </span>
          )}
          {route.maxElev >= 1000 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-wash text-muted num">
              nejvýš {route.maxElev} m
            </span>
          )}
          <span className="ml-auto text-xs text-teal font-medium">
            {open ? "skrýt" : "mapa a detail"}
          </span>
        </div>

        <div className="px-3 pb-3">
          <Elevation prof={route.prof} height={26} />
        </div>
      </button>

      {open && (
        <div className="border-t border-line">
          <MapView route={route} height={280} />

          <div className="p-4 space-y-5">
            <p className="text-[15px] leading-relaxed">{route.see}</p>

            {route.photos.length > 0 && (
              <div>
                <div className="label text-muted mb-2">Co uvidíš po cestě</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {route.photos.map((p) => (
                    <figure key={p.src} className="min-w-0">
                      <img
                        src={p.src}
                        alt={p.caption}
                        loading="lazy"
                        className="w-full h-28 object-cover rounded-lg bg-wash"
                      />
                      <figcaption className="text-[11px] text-muted mt-1 leading-tight">
                        {p.caption}
                        <a
                          href={p.page}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block opacity-70 hover:opacity-100"
                        >
                          {p.author} · {p.license}
                        </a>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="label text-muted mb-2">Výškový profil</div>
              <Elevation prof={route.prof} height={90} detailed maxElev={route.maxElev} />
              {route.climb && (
                <p className="text-sm text-muted mt-1 num">
                  Nejdelší stoupání {nb(route.climb.km)} km, {route.climb.gain} m převýšení,
                  průměr {nb(route.climb.grade)} %. Vrchol v km {nb(route.climb.topAt)}.
                </p>
              )}
            </div>

            <div>
              <div className="label text-muted mb-2">Kudy to jede</div>
              <ol className="relative border-l border-line ml-1.5">
                {route.stops.map((stop, i) => (
                  <li key={`${stop.name}-${i}`} className="relative pl-5 pb-3 last:pb-0">
                    <span
                      className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${
                        stop.base ? "bg-ink" : "bg-teal"
                      }`}
                    />
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`text-sm ${stop.base ? "font-semibold" : ""}`}>
                        {stop.name}
                        {stop.base && i === 0 && " — start"}
                        {stop.base && i > 0 && " — cíl"}
                      </span>
                      <span className="text-xs text-muted num whitespace-nowrap">
                        km {nb(stop.km ?? 0)}
                        {stop.elev ? ` · ${stop.elev} m` : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <SurfaceDetail surface={route.surface} />

            <div>
              <div className="label text-muted mb-2">Dobré vědět</div>
              <p className="text-sm leading-relaxed">{route.note}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {route.tags.map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-wash text-muted">
                  {TAGS[t]}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => downloadGpx(route)}
                className="py-3 rounded-xl font-medium text-sm bg-ink text-paper"
              >
                Stáhnout GPX
              </button>
              <a
                href={mapyUrl(route)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 rounded-xl font-medium text-sm text-center ring-1 ring-ink"
              >
                Mapy.com
              </a>
              <a
                href={googleUrl(route)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 rounded-xl font-medium text-sm text-center ring-1 ring-ink"
              >
                Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
