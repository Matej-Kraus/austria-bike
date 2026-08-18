/*
 * Výškový profil ze skutečných dat trasy. Malá varianta jde do karty,
 * velká s popisky do rozbaleného detailu.
 */

export default function Elevation({ prof, height = 28, detailed = false, maxElev }) {
  if (!prof?.length) return null;

  const W = 320;
  const H = height;
  const dist = prof[prof.length - 1][0];
  const elevs = prof.map((p) => p[1]);
  const lo = Math.min(...elevs);
  const hi = Math.max(...elevs);
  const span = Math.max(60, hi - lo);
  const pad = detailed ? 12 : 2;

  const x = (km) => (km / dist) * W;
  const y = (m) => H - pad - ((m - lo) / span) * (H - pad * 2);

  const line = prof.map(([km, m]) => `${x(km).toFixed(1)},${y(m).toFixed(1)}`).join(" ");

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full block" style={{ height }}>
        <polygon points={`0,${H} ${line} ${W},${H}`} fill="var(--color-teal)" opacity="0.14" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-teal)"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>

      {detailed && (
        <div className="flex justify-between label text-muted mt-1">
          <span>0 km</span>
          <span className="num">nejvýš {maxElev ?? Math.round(hi)} m</span>
          <span className="num">{Math.round(dist)} km</span>
        </div>
      )}
    </div>
  );
}
