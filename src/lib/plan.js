import { STAY_PLAN, BIG_BY_WEATHER } from "../data/plan.js";
import { describeWeather } from "./weather.js";

function rideScore(day) {
  if (!day) return 0;
  const ride = describeWeather(day.code).ride;
  let s = ride * 10;
  if (day.rain >= 55) s -= 4;
  if (day.wind >= 30) s -= 2;
  return s;
}

function weatherByDate(days) {
  const map = new Map();
  for (const d of days ?? []) map.set(d.date, d);
  return map;
}

const byPick = new Map(STAY_PLAN.map((d) => [d.pick, d]));

/*
 * Složí 5 dní: ruční výměna má přednost.
 * Když je předpověď na prostřední tři dny a nikdo je ručně neměnil,
 * celý výlet (ne jen id) se přesune na nejjasnější den.
 */
export function resolveStayPlan(routes, weatherDays, picks) {
  const byId = new Map(routes.map((r) => [r.id, r]));
  const wx = weatherByDate(weatherDays);
  const big = STAY_PLAN.filter((d) => d.slot === "big");
  const bigUntouched = big.every((d) => !picks[d.date]);
  const bigHaveWx = big.every((d) => wx.has(d.date));

  const templateFor = {};
  let weatherSorted = false;

  if (bigUntouched && bigHaveWx) {
    const rankedDates = [...big].sort((a, b) => rideScore(wx.get(b.date)) - rideScore(wx.get(a.date)));
    rankedDates.forEach((slot, i) => {
      templateFor[slot.date] = byPick.get(BIG_BY_WEATHER[i]);
    });
    weatherSorted = rankedDates.some((slot, i) => slot.pick !== BIG_BY_WEATHER[i]);
  }

  const days = STAY_PLAN.map((slot) => {
    const tmpl = templateFor[slot.date] ?? slot;
    const id = picks[slot.date] || tmpl.pick;
    const route = byId.get(id) ?? byId.get(tmpl.pick);
    const options = [
      { id: tmpl.pick, why: tmpl.why },
      ...tmpl.alts,
    ].filter((o, i, all) => all.findIndex((x) => x.id === o.id) === i && byId.has(o.id));

    return {
      date: slot.date,
      dow: slot.dow,
      day: slot.day,
      role: slot.role,
      slot: slot.slot,
      defaultId: tmpl.pick,
      why: tmpl.why,
      story: tmpl.story,
      routeId: route?.id ?? id,
      route,
      changed: id !== tmpl.pick,
      weather: wx.get(slot.date) ?? null,
      options,
    };
  });

  return { days, weatherSorted, byId };
}
