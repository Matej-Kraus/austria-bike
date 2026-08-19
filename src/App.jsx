import { useMemo, useState } from "react";

import { ALL_ROUTES, BASE, STATION, STAY, TAGS, formatHours, GENERATED_AT } from "./lib/routes.js";
import { stravaHeatmap } from "./lib/strava.js";
import { useWeather, pickForToday } from "./lib/weather.js";
import { resolveStayPlan } from "./lib/plan.js";
import { usePlanPicks } from "./lib/usePlanPicks.js";
import Weather from "./components/Weather.jsx";
import StayPlan from "./components/StayPlan.jsx";
import RouteCard from "./components/RouteCard.jsx";
import MapView from "./components/MapView.jsx";
import { SurfaceBadge } from "./components/Surface.jsx";

const nb = (v) => String(v).replace(".", ",");

const TIME_PICKS = [
  { id: "kratka", label: "Dvě hodiny", hours: 2.2, minKm: 0, maxKm: 45 },
  { id: "puldne", label: "Půl dne", hours: 4.5, minKm: 45, maxKm: 90 },
  { id: "celyden", label: "Celý den", hours: 12, minKm: 80, maxKm: Infinity },
];

const KM_PICKS = [
  { id: "do40", label: "do 40 km", min: 0, max: 40 },
  { id: "40-80", label: "40–80 km", min: 40, max: 80 },
  { id: "80-120", label: "80–120 km", min: 80, max: 120 },
  { id: "120+", label: "120+ km", min: 120, max: Infinity },
];

const KM_MAX = Math.max(...ALL_ROUTES.map((r) => r.km));
const HM_MAX = Math.max(...ALL_ROUTES.map((r) => r.hm));

function Chip({ on, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
        on ? "bg-ink text-paper" : "bg-card text-ink ring-1 ring-line hover:ring-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Slider({ label, unit, value, min, max, step, onChange }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="display num text-2xl font-bold leading-none">
          {value}
          <span className="text-sm font-semibold text-muted ml-1">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2"
      />
    </div>
  );
}

function TodayPick({ pick, onOpen }) {
  if (!pick) return null;
  const r = pick.route;

  return (
    <section className="rounded-2xl overflow-hidden bg-card ring-1 ring-line">
      <div className="grid sm:grid-cols-2">
        <div className="relative min-h-[190px]">
          {r.cover ? (
            <img src={r.cover.src} alt={r.cover.caption} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <MapView route={r} height={190} />
          )}
        </div>

        <div className="p-4">
          <div className="label text-teal">Dneska bych jel</div>
          <h2 className="display text-3xl font-bold leading-none mt-1">{r.name}</h2>
          <p className="text-sm text-muted mt-1">{pick.why}</p>

          <div className="flex items-end gap-5 mt-3">
            <div>
              <div className="display num text-4xl font-bold leading-none text-teal">{nb(r.km)}</div>
              <div className="label text-muted">km</div>
            </div>
            <div>
              <div className="display num text-4xl font-bold leading-none">{r.hm}</div>
              <div className="label text-muted">m nahoru</div>
            </div>
            <div>
              <div className="display num text-3xl font-semibold leading-none pb-1">{formatHours(r.hours)}</div>
              <div className="label text-muted">v sedle</div>
            </div>
          </div>

          <div className="mt-3">
            <SurfaceBadge surface={r.surface} />
          </div>

          <button
            onClick={onOpen}
            className="mt-4 w-full py-3 rounded-xl font-medium text-sm bg-ink text-paper"
          >
            Ukaž mi ji
          </button>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const weather = useWeather();
  const [timePick, setTimePick] = useState(null);
  const [kmPick, setKmPick] = useState(null);
  const [loopsOnly, setLoopsOnly] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [tags, setTags] = useState([]);
  const [pavedOnly, setPavedOnly] = useState(false);
  const [maxKm, setMaxKm] = useState(KM_MAX);
  const [maxHm, setMaxHm] = useState(HM_MAX);
  const [sort, setSort] = useState("km");
  const [open, setOpen] = useState(null);
  const [advanced, setAdvanced] = useState(false);
  const planPicks = usePlanPicks();

  const today = weather.data?.days?.[0] ?? null;
  const stayPlan = useMemo(
    () => resolveStayPlan(ALL_ROUTES, weather.data?.days, planPicks.picks),
    [weather.data, planPicks.picks]
  );
  const todayIso = new Date().toISOString().slice(0, 10);
  const stayToday = stayPlan.days.find((d) => d.date === todayIso);
  const pick = useMemo(() => {
    if (stayToday?.route) return { route: stayToday.route, why: stayToday.why };
    return pickForToday(ALL_ROUTES, today);
  }, [stayToday, today]);

  const chooseTime = (id) => {
    const next = timePick === id ? null : id;
    setTimePick(next);
    if (next === "celyden") {
      const km = KM_PICKS.find((k) => k.id === kmPick);
      if (km && km.min < 80) setKmPick("80-120");
    }
  };

  const list = useMemo(() => {
    const time = TIME_PICKS.find((t) => t.id === timePick);
    const km = KM_PICKS.find((k) => k.id === kmPick);
    const hourCap = time?.hours ?? Infinity;
    let minKm = time?.minKm ?? 0;
    let capKm = time?.maxKm ?? Infinity;
    if (km) {
      minKm = Math.max(minKm, km.min);
      capKm = Math.min(capKm, km.max);
    }
    if (timePick === "celyden") minKm = Math.max(minKm, 80);
    capKm = Math.min(capKm, maxKm);

    const filtered = ALL_ROUTES.filter(
      (r) =>
        r.hours <= hourCap &&
        r.km >= minKm &&
        r.km <= capKm &&
        r.hm <= maxHm &&
        (!loopsOnly || r.kind !== "vyjezd") &&
        (!localOnly || r.local) &&
        (!pavedOnly || (r.surface?.unpavedKm ?? 0) < 0.1) &&
        (tags.length === 0 || tags.every((t) => r.tags.includes(t)))
    );
    const cmp = {
      km: (a, b) => a.km - b.km,
      hm: (a, b) => a.hm - b.hm,
      cas: (a, b) => a.hours - b.hours,
      mistni: (a, b) => Number(b.local) - Number(a.local) || a.km - b.km,
    }[sort];
    return [...filtered].sort(cmp);
  }, [timePick, kmPick, loopsOnly, localOnly, tags, pavedOnly, maxKm, maxHm, sort]);

  const active = timePick || kmPick || loopsOnly || localOnly || tags.length > 0 || pavedOnly || maxKm < KM_MAX || maxHm < HM_MAX;
  const reset = () => {
    setTimePick(null);
    setKmPick(null);
    setLoopsOnly(false);
    setLocalOnly(false);
    setTags([]);
    setPavedOnly(false);
    setMaxKm(KM_MAX);
    setMaxHm(HM_MAX);
  };

  const openRoute = (id) => {
    setOpen(id);
    requestAnimationFrame(() => document.getElementById(`r-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <header className="pt-8 pb-5">
          <div className="label text-muted">
            {BASE.address} · {STAY.from}–{STAY.to}
          </div>
          <h1 className="display text-6xl font-bold leading-none mt-1">Kam dneska</h1>
          <p className="text-sm text-muted mt-2 max-w-lg leading-relaxed">
            Každá trasa vyjíždí od ubytování v Sattendorfu a sem se zase vrací.
            Čistá silnička, žádný šterk. Kde je stezka asfaltová, jedete po ní
            ve dvou vedle sebe. R3 a Drauradweg ne — ty uhýbají na šotolinu.
            Kopce (Gerlitzen, Dobratsch, Predil, Vršič) po silnici, která na
            vrchol vede. Nádraží{" "}
            {STATION.name} je {STATION.walk} m odsud (trať {STATION.line}). Ze Sattendorfu
            jezdí i loď po jezeře — sezóna do 27. 9., kolo na palubě 5 €.{" "}
            <a
              href={stravaHeatmap()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal underline"
            >
              Strava heatmapa okolí
            </a>{" "}
            ukáže, kudy tu šlapou místní.
          </p>
        </header>

        <section className="rounded-2xl bg-wash ring-1 ring-line p-4 mb-4">
          <Weather state={weather} />
        </section>

        <StayPlan
          plan={stayPlan}
          dirty={planPicks.dirty}
          onPick={planPicks.setPick}
          onReset={planPicks.reset}
          onOpen={openRoute}
        />

        {!stayToday && (
          <div className="mb-6">
            <TodayPick pick={pick} onOpen={() => openRoute(pick.route.id)} />
          </div>
        )}

        <section className="mb-5">
          <div className="label text-muted mb-2">Kolik máš času</div>
          <div className="flex flex-wrap gap-2">
            {TIME_PICKS.map((t) => (
              <Chip key={t.id} on={timePick === t.id} onClick={() => chooseTime(t.id)}>
                {t.label}
              </Chip>
            ))}
          </div>

          <div className="label text-muted mb-2 mt-4">Kolik zhruba kilometrů</div>
          <div className="flex flex-wrap gap-2">
            {KM_PICKS.map((k) => (
              <Chip key={k.id} on={kmPick === k.id} onClick={() => setKmPick(kmPick === k.id ? null : k.id)}>
                {k.label}
              </Chip>
            ))}
            <Chip on={loopsOnly} onClick={() => setLoopsOnly(!loopsOnly)}>
              Jen okruhy
            </Chip>
            <Chip on={localOnly} onClick={() => setLocalOnly(!localOnly)}>
              Tudy jezdí místní
            </Chip>
            <Chip on={pavedOnly} onClick={() => setPavedOnly(!pavedOnly)}>
              Jen čistý asfalt
            </Chip>
          </div>

          <div className="label text-muted mb-2 mt-4">Co chceš vidět</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TAGS).map(([key, label]) => (
              <Chip
                key={key}
                on={tags.includes(key)}
                onClick={() => setTags(tags.includes(key) ? tags.filter((t) => t !== key) : [...tags, key])}
              >
                {label}
              </Chip>
            ))}
          </div>

          <button onClick={() => setAdvanced(!advanced)} className="text-sm text-teal mt-3">
            {advanced ? "skrýt podrobný filtr" : "podrobný filtr"}
          </button>

          {advanced && (
            <div className="grid sm:grid-cols-2 gap-5 mt-3 rounded-2xl bg-card ring-1 ring-line p-4">
              <Slider label="Nejvýš kilometrů" unit="km" value={maxKm} min={15} max={KM_MAX} step={1} onChange={setMaxKm} />
              <Slider label="Nejvýš převýšení" unit="m" value={maxHm} min={80} max={HM_MAX} step={20} onChange={setMaxHm} />
            </div>
          )}
        </section>

        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="label text-muted">
            {list.length === 0 ? "Nic nesedí" : `${list.length} z ${ALL_ROUTES.length} tras`}
          </div>
          <div className="flex items-center gap-3">
            {active && (
              <button onClick={reset} className="text-sm text-teal underline">
                zrušit filtr
              </button>
            )}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-sm bg-card ring-1 ring-line rounded-full px-3 py-1.5"
            >
              <option value="km">řadit podle km</option>
              <option value="hm">podle převýšení</option>
              <option value="cas">podle času</option>
              <option value="mistni">nejdřív kudy jezdí místní</option>
            </select>
          </div>
        </div>

        {list.length === 0 && (
          <div className="rounded-2xl bg-card ring-1 ring-line p-6 text-sm leading-relaxed">
            Tahle kombinace v okolí neexistuje. Uber jeden požadavek — velký kopec a rovina se
            navzájem vylučují, a do dvou hodin se z Ossiacher See k Wörthersee nedostaneš.
          </div>
        )}

        <div className="space-y-3">
          {list.map((route) => (
            <div key={route.id} id={`r-${route.id}`} className="scroll-mt-4">
              <RouteCard
                route={route}
                open={open === route.id}
                onToggle={() => setOpen(open === route.id ? null : route.id)}
                planDay={stayPlan.days.find((d) => d.routeId === route.id)}
              />
            </div>
          ))}
        </div>

        <footer className="mt-10 text-xs text-muted leading-relaxed space-y-2">
          <p>
            <strong className="text-ink">Kilometry, převýšení i povrch jsou spočítané</strong> ze
            skutečné stopy přes OpenStreetMap (BRouter, profil pro silniční kolo), ne odhadnuté.
            Povrch vychází z OSM tagů podél trasy — když někdo tag neuvedl, bere se silnice jako
            asfaltová.
          </p>
          <p>
            Čistý čas v sedle počítám jako 25 km/h na rovině plus hodina za každých 750 metrů
            stoupání. Bez zastávek, focení a oběda.
          </p>
          <p>
            Fotky: Wikimedia Commons, autoři a licence u každého snímku. Předpověď: Open-Meteo.
            Mapové podklady: OpenStreetMap. Data přepočítaná{" "}
            {new Date(GENERATED_AT).toLocaleDateString("cs-CZ")}.
          </p>
        </footer>
      </div>
    </div>
  );
}
