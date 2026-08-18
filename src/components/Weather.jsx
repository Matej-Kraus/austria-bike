/*
 * Předpověď pro Sattendorf. První věc, kterou ráno chceš vidět, než se
 * rozhodneš, kam vyjet.
 */

import { describeWeather } from "../lib/weather.js";

const DAYS = ["ne", "po", "út", "st", "čt", "pá", "so"];

function Icon({ kind, size = 22 }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", fill: "none" };
  const stroke = { stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" };

  if (kind === "slunce")
    return (
      <svg {...s} aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" {...stroke} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line
            key={a}
            x1={12 + 7 * Math.cos((a * Math.PI) / 180)}
            y1={12 + 7 * Math.sin((a * Math.PI) / 180)}
            x2={12 + 9.4 * Math.cos((a * Math.PI) / 180)}
            y2={12 + 9.4 * Math.sin((a * Math.PI) / 180)}
            {...stroke}
          />
        ))}
      </svg>
    );

  const cloud = <path d="M6.5 17h11a3.5 3.5 0 0 0 .2-7 5 5 0 0 0-9.6-1.2A3.6 3.6 0 0 0 6.5 17Z" {...stroke} />;

  if (kind === "oblaka" || kind === "mlha")
    return (
      <svg {...s} aria-hidden="true">
        {cloud}
        {kind === "mlha" && (
          <>
            <line x1="4" y1="20" x2="14" y2="20" {...stroke} />
            <line x1="17" y1="20" x2="20" y2="20" {...stroke} />
          </>
        )}
      </svg>
    );

  return (
    <svg {...s} aria-hidden="true">
      {cloud}
      {kind === "snih" ? (
        <>
          <line x1="9" y1="20" x2="9" y2="20.5" {...stroke} />
          <line x1="13" y1="20" x2="13" y2="20.5" {...stroke} />
          <line x1="17" y1="20" x2="17" y2="20.5" {...stroke} />
        </>
      ) : kind === "bourka" ? (
        <path d="M13 19l-3 4h4l-2.5 3" {...stroke} strokeLinejoin="round" />
      ) : (
        <>
          <line x1="9.5" y1="19.5" x2="8.5" y2="22" {...stroke} />
          <line x1="13.5" y1="19.5" x2="12.5" y2="22" {...stroke} />
          <line x1="17.5" y1="19.5" x2="16.5" y2="22" {...stroke} />
        </>
      )}
    </svg>
  );
}

export default function Weather({ state }) {
  if (state.status === "loading")
    return <div className="text-sm text-muted py-3">Načítám předpověď pro Sattendorf…</div>;

  if (state.status === "error")
    return (
      <div className="text-sm text-muted py-3">
        Předpověď se teď nenačetla — trasy fungují i bez ní.
      </div>
    );

  const { days, now } = state.data;
  const today = days[0];
  const nowDesc = describeWeather(now.code);

  return (
    <div>
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-teal">
          <Icon kind={nowDesc.icon} size={40} />
          <div>
            <div className="display num text-5xl font-bold leading-none text-ink">{now.temp}°</div>
          </div>
        </div>
        <div className="text-sm leading-tight pb-1">
          <div className="font-medium">{nowDesc.text}</div>
          <div className="text-muted num">
            vítr {now.wind} km/h · déšť {today.rain} % · světlo {today.sunrise}–{today.sunset}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mt-4">
        {days.map((d, i) => {
          const desc = describeWeather(d.code);
          const date = new Date(d.date);
          return (
            <div
              key={d.date}
              className={`rounded-xl py-2 px-1 text-center ${i === 0 ? "bg-ink text-paper" : "bg-card"}`}
            >
              <div className="label opacity-70">
                {i === 0 ? "dnes" : DAYS[date.getDay()]}
              </div>
              <div className={`flex justify-center my-1 ${i === 0 ? "" : "text-teal"}`}>
                <Icon kind={desc.icon} size={20} />
              </div>
              <div className="num text-sm font-semibold leading-none">{d.tMax}°</div>
              <div className={`num text-[11px] leading-tight ${i === 0 ? "opacity-70" : "text-muted"}`}>
                {d.rain}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
