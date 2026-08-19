import { useState } from "react";

import { formatHours } from "../lib/routes.js";
import { describeWeather } from "../lib/weather.js";
import { SurfaceBadge } from "./Surface.jsx";

const nb = (v) => String(v).replace(".", ",");

function WeatherHint({ weather }) {
  if (!weather) return null;
  const w = describeWeather(weather.code);
  const bad = w.ride < 0.5 || weather.rain >= 55;
  return (
    <span className={`text-xs ${bad ? "text-warn" : "text-muted"}`}>
      {w.text}
      {weather.rain >= 40 ? ` · déšť ${weather.rain} %` : ""}
    </span>
  );
}

export default function StayPlan({ plan, dirty, onPick, onReset, onOpen }) {
  const [swap, setSwap] = useState(null);
  const { days, weatherSorted, byId } = plan;

  return (
    <section className="rounded-2xl bg-card ring-1 ring-line overflow-hidden mb-6">
      <div className="p-4 pb-3">
        <div className="label text-teal">7.–11. září · pět dní</div>
        <h2 className="display text-3xl font-bold leading-none mt-1">Tenhle týden bych jel takhle</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          První a poslední den volněji, uprostřed to nejlepší. Každý den jiný
          kraj — domácí jezero, Faak s Veldenem, Alpe-Adria do Itálie, Dobratsch,
          druhá strana Gerlitzenu. Ideál je stezka, kde jedete ve dvou vedle
          sebe a auta neřešíte. Kousek hlavní silnice je v pořádku, když stezka
          není. Stejnou cestu jezdíme jen k domu a z domu. Kterýkoliv den jde
          vyměnit.
        </p>
        {weatherSorted && (
          <p className="text-xs text-teal mt-2">
            Prostřední dny jsou seřazené podle předpovědi: kopce na nejjasnější den.
          </p>
        )}
      </div>

      <ol>
        {days.map((slot) => {
          const r = slot.route;
          if (!r) return null;
          const open = swap === slot.date;
          const why = slot.options.find((o) => o.id === r.id)?.why ?? slot.why;
          return (
            <li key={slot.date} className="border-t border-line">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {r.cover && (
                    <img
                      src={r.cover.src}
                      alt=""
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shrink-0 bg-wash"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="label text-muted">
                        {slot.dow} {slot.day}
                        {slot.role === "příjezd" && " · příjezd"}
                        {slot.role === "odjezd" && " · odjezd"}
                      </div>
                      <WeatherHint weather={slot.weather} />
                    </div>
                    <h3 className="display text-2xl font-semibold leading-tight mt-0.5">{r.name}</h3>
                    <p className="text-sm text-muted leading-relaxed mt-1">
                      {r.id === slot.defaultId && slot.story ? slot.story : why}
                    </p>
                    {(r.swim || r.eat) && (
                      <dl className="mt-2 space-y-1.5">
                        {r.swim && (
                          <div>
                            <dt className="label text-teal">koupání</dt>
                            <dd className="text-sm text-muted leading-relaxed">{r.swim}</dd>
                          </div>
                        )}
                        {r.eat && (
                          <div>
                            <dt className="label text-warn">jídlo</dt>
                            <dd className="text-sm text-muted leading-relaxed">{r.eat}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                    <div className="flex items-end gap-4 mt-2">
                      <div>
                        <div className="display num text-2xl font-bold leading-none text-teal">{nb(r.km)}</div>
                        <div className="label text-muted">km</div>
                      </div>
                      <div>
                        <div className="display num text-2xl font-bold leading-none">{r.hm}</div>
                        <div className="label text-muted">m nahoru</div>
                      </div>
                      <div>
                        <div className="display num text-xl font-semibold leading-none pb-0.5">
                          {formatHours(r.hours)}
                        </div>
                        <div className="label text-muted">v sedle</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <SurfaceBadge surface={r.surface} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => onOpen(r.id)}
                    className="px-3 py-2 rounded-xl text-sm font-medium bg-ink text-paper"
                  >
                    Ukaž mi ji
                  </button>
                  <button
                    onClick={() => setSwap(open ? null : slot.date)}
                    className="px-3 py-2 rounded-xl text-sm font-medium ring-1 ring-ink"
                  >
                    {open ? "zavřít výměnu" : "vyměnit den"}
                  </button>
                </div>

                {open && (
                  <div className="mt-3 space-y-2">
                    {slot.options.map((option) => {
                      const alt = byId.get(option.id);
                      if (!alt) return null;
                      const active = r.id === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => {
                            onPick(slot.date, option.id === slot.defaultId ? null : option.id);
                            setSwap(null);
                          }}
                          className={`w-full text-left rounded-xl px-3 py-2.5 ring-1 transition-colors ${
                            active ? "ring-teal bg-teal-soft" : "ring-line hover:ring-ink"
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-semibold">{alt.name}</span>
                            <span className="text-xs text-muted num whitespace-nowrap">
                              {nb(alt.km)} km · {alt.hm} m
                            </span>
                          </div>
                          <p className="text-xs text-muted leading-relaxed mt-0.5">{option.why}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {dirty && (
        <div className="px-4 py-3 border-t border-line">
          <button onClick={onReset} className="text-sm text-teal underline">
            Vrátit doporučené dny
          </button>
        </div>
      )}
    </section>
  );
}
