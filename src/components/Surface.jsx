/*
 * Povrch trasy. Jedeme na silničkách, takže tohle rozhoduje, jestli se tam
 * vůbec vyjede — čísla jsou spočítaná z OSM tagů podél skutečné stopy.
 */

const km = (v) => String(v).replace(".", ",");

export function SurfaceBadge({ surface }) {
  if (!surface) return null;

  if (surface.unpavedKm < 0.1) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-teal-soft text-teal">
        Celé po asfaltu
      </span>
    );
  }

  const bad = !surface.roadOk;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
        bad ? "bg-warn-soft text-warn" : "bg-wash text-muted"
      }`}
    >
      {bad ? "Pro silničku nevhodné" : "Asfalt"} · {km(surface.unpavedKm)} km nezpevněno
    </span>
  );
}

export function SurfaceDetail({ surface }) {
  if (!surface) return null;

  return (
    <div>
      <div className="label text-muted mb-2">Povrch</div>

      {surface.unpavedKm < 0.1 ? (
        <p className="text-sm leading-relaxed">
          Celá trasa vede po asfaltu. Nic, co by silničce vadilo.
        </p>
      ) : (
        <>
          <p className="text-sm leading-relaxed">
            {km(surface.pavedKm)} km asfaltu, {km(surface.unpavedKm)} km nezpevněného povrchu (
            {km(surface.unpavedPct)} % trasy).{" "}
            {surface.roadOk
              ? "Na silničce se to dá projet, jen tam ubereš."
              : "Na silničce nepříjemné — zvaž jinou trasu."}
          </p>
          {surface.worst.length > 0 && (
            <ul className="mt-2 space-y-1">
              {surface.worst.map((s) => (
                <li key={s.km} className="text-sm text-muted num">
                  km {km(s.km)}–{km(s.toKm)} · {s.meters} m {s.what}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
