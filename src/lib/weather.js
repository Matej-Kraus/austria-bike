/*
 * Předpověď pro Sattendorf z Open-Meteo (bez klíče, bez registrace) a výběr
 * trasy na dnešek podle toho, co je za oknem.
 */

import { useEffect, useState } from "react";
import { BASE } from "../data/routes.js";

/* WMO kódy → co to znamená pro člověka na kole */
const WMO = {
  0: { text: "jasno", icon: "slunce", ride: 1 },
  1: { text: "skoro jasno", icon: "slunce", ride: 1 },
  2: { text: "polojasno", icon: "oblaka", ride: 1 },
  3: { text: "zataženo", icon: "oblaka", ride: 0.8 },
  45: { text: "mlha", icon: "mlha", ride: 0.5 },
  48: { text: "namrzající mlha", icon: "mlha", ride: 0.4 },
  51: { text: "mrholení", icon: "dest", ride: 0.5 },
  53: { text: "mrholení", icon: "dest", ride: 0.5 },
  55: { text: "silné mrholení", icon: "dest", ride: 0.4 },
  61: { text: "slabý déšť", icon: "dest", ride: 0.4 },
  63: { text: "déšť", icon: "dest", ride: 0.25 },
  65: { text: "vydatný déšť", icon: "dest", ride: 0.1 },
  71: { text: "sněžení", icon: "snih", ride: 0.1 },
  73: { text: "sněžení", icon: "snih", ride: 0.1 },
  75: { text: "husté sněžení", icon: "snih", ride: 0 },
  80: { text: "přeháňky", icon: "dest", ride: 0.45 },
  81: { text: "přeháňky", icon: "dest", ride: 0.35 },
  82: { text: "silné přeháňky", icon: "dest", ride: 0.15 },
  95: { text: "bouřky", icon: "bourka", ride: 0.1 },
  96: { text: "bouřky s krupobitím", icon: "bourka", ride: 0 },
  99: { text: "bouřky s krupobitím", icon: "bourka", ride: 0 },
};

export const describeWeather = (code) => WMO[code] ?? { text: "—", icon: "oblaka", ride: 0.7 };

const URL =
  "https://api.open-meteo.com/v1/forecast?" +
  new URLSearchParams({
    latitude: String(BASE.lat),
    longitude: String(BASE.lon),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    current: "temperature_2m,weather_code,wind_speed_10m",
    timezone: "Europe/Vienna",
    forecast_days: "16",
  });

export function useWeather() {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let alive = true;
    fetch(URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!alive) return;
        const days = d.daily.time.map((date, i) => ({
          date,
          code: d.daily.weather_code[i],
          tMax: Math.round(d.daily.temperature_2m_max[i]),
          tMin: Math.round(d.daily.temperature_2m_min[i]),
          rain: d.daily.precipitation_probability_max[i] ?? 0,
          wind: Math.round(d.daily.wind_speed_10m_max[i]),
          sunrise: d.daily.sunrise[i].slice(11, 16),
          sunset: d.daily.sunset[i].slice(11, 16),
        }));
        setState({
          status: "ok",
          data: {
            days,
            now: {
              temp: Math.round(d.current.temperature_2m),
              code: d.current.weather_code,
              wind: Math.round(d.current.wind_speed_10m),
            },
          },
        });
      })
      .catch(() => alive && setState({ status: "error", data: null }));
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

/*
 * Doporučení na dnešek. Za jasna má smysl vytáhnout se nahoru kvůli výhledu,
 * v dešti nebo ve větru radši nížina u vody a kratší kilometry.
 */
export function pickForToday(routes, today) {
  if (!routes.length) return null;

  const wet = today ? today.rain >= 55 || describeWeather(today.code).ride < 0.5 : false;
  const windy = today ? today.wind >= 30 : false;
  const clear = today ? describeWeather(today.code).ride >= 0.9 && today.tMax >= 18 : false;

  const scored = routes.map((r) => {
    let score = 0;
    let why = [];

    if (wet) {
      score += r.km <= 35 ? 3 : -2;
      score += r.hm <= 300 ? 2 : -3;
      if (r.tags.includes("jezero")) score += 1;
      why = ["Prší, tak krátce a nízko"];
    } else if (windy) {
      score += r.hm <= 500 ? 1 : -1;
      score += r.tags.includes("klid") ? 2 : 0;
      score += r.km <= 70 ? 1 : -1;
      why = ["Fouká, radši údolím než po hřebeni"];
    } else if (clear) {
      score += r.maxElev >= 1000 ? 4 : 0;
      score += r.tags.includes("kopec") ? 2 : 0;
      score += r.km >= 40 ? 1 : 0;
      why = ["Jasno — dneska se vyplatí vylézt nahoru za výhledem"];
    } else {
      score += r.km >= 40 && r.km <= 90 ? 3 : 0;
      score += r.tags.includes("jezero") ? 1 : 0;
      why = ["Slušné počasí na normální celodenní kolečko"];
    }

    if (r.surface && !r.surface.roadOk) score -= 3;
    if (r.local) score += 1;

    return { route: r, score, why: why[0] };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}
