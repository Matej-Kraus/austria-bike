/*
 * Kontrola průjezdních bodů: dohledá místa v OSM (Nominatim) a k nalezeným
 * souřadnicím doplní nadmořskou výšku (Open-Meteo). Slouží k ověření, že bod
 * sedí na vesnici a ne na svah nad ní.
 *
 *   node scripts/geocode.mjs                    # výchozí seznam míst
 *   node scripts/geocode.mjs "Villach;Ossiach"  # vlastní dotazy
 */

const DEFAULT = [
  "Sattendorf, 9520, Oesterreich",
  "Bahnhof Sattendorf, Kaernten",
  "Bodensdorf, Steindorf am Ossiacher See",
  "Steindorf am Ossiacher See, Kaernten",
  "Annenheim, Kaernten",
  "Ossiach, Kaernten",
  "Burg Landskron, Villach",
  "Kanzelhoehe, Treffen am Ossiacher See",
  "Villach, Kaernten",
  "Ledenitzen, Kaernten",
  "Drobollach am Faaker See",
  "Faak am See, Kaernten",
  "Rosstratte, Villacher Alpenstrasse",
  "Moeltschach, Villach",
  "Feistritz an der Drau, Kaernten",
  "Paternion, Kaernten",
  "Noetsch im Gailtal",
  "Hermagor, Kaernten",
  "St. Jakob im Rosental",
  "Rosegg, Kaernten",
  "Velden am Woerthersee",
  "Poertschach am Woerther See",
  "Maria Woerth, Kaernten",
  "Klagenfurt am Woerthersee",
  "Klopeiner See, Kaernten",
  "Feldkirchen in Kaernten",
  "Millstatt am See",
  "Spittal an der Drau",
  "Arnoldstein, Kaernten",
  "Tarvisio, Italia",
  "Lago del Predil, Tarvisio",
  "Bovec, Slovenija",
  "Kranjska Gora, Slovenija",
];

const UA = { "User-Agent": "trasy-sattendorf/1.0 (osobni plan cyklovyletu)" };
const queries = process.argv[2] ? process.argv[2].split(";").map((s) => s.trim()) : DEFAULT;
const found = [];

for (const q of queries) {
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({ q, format: "jsonv2", limit: "1" });
  const [hit] = await fetch(url, { headers: UA }).then((r) => r.json());
  found.push(hit ? { q, lat: +hit.lat, lon: +hit.lon, type: hit.type } : { q, lat: null });
  await new Promise((r) => setTimeout(r, 1100)); // Nominatim: max 1 dotaz/s
}

const ok = found.filter((f) => f.lat !== null);
const ele = await fetch(
  "https://api.open-meteo.com/v1/elevation?" +
    new URLSearchParams({
      latitude: ok.map((f) => f.lat.toFixed(5)).join(","),
      longitude: ok.map((f) => f.lon.toFixed(5)).join(","),
    })
)
  .then((r) => r.json())
  .then((d) => d.elevation);

ok.forEach((f, i) => (f.ele = ele[i]));

for (const f of found) {
  if (f.lat === null) console.log(`${f.q.padEnd(36)} nenalezeno`);
  else
    console.log(
      `${f.q.padEnd(36)} ${f.lat.toFixed(5)}, ${f.lon.toFixed(5)}  ${String(Math.round(f.ele)).padStart(5)} m  ${f.type}`
    );
}
