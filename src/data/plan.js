/*
 * Pět dní, pět krajin. Žádný den nejede znovu to samé jezero ani ten samý kopec.
 *
 * po  — východ: domácí jezero a Feldkirchen (ne Villach, ne Faak)
 * út  — jih: Faaker See + Velden (ne okruh Ossiachu)
 * st  — západ: silnice do Arnoldsteinu, Pontebbana od Maglernu do Tarvisia
 * čt  — Dobratsch, jiná hora než Gerlitzen (ne Faaker po sjezdu)
 * pá  — sever: Gegendtal, druhá strana Gerlitzenu
 */

export const STAY_PLAN = [
  {
    date: "2026-09-07",
    dow: "po",
    day: "7. 9.",
    role: "příjezd",
    slot: "easy",
    pick: "feldkirchen",
    why: "Jen východ od domu: R2 podél vody, Feldkirchen, jižní břeh kolem kláštera. Ve dvou vedle sebe, auta skoro ne.",
    story:
      "Z Sattendorfu po R2 na východ, jezero vlevo, Gerlitzen vpravo — široká stezka, ve dvou v pohodě. Bodensdorf: koupání v Seebadu (Fischerweg 8, zdarma) nebo Mini-Strand z R2. U rákosin u Steindorfu zůstaň na asfaltu. Do Feldkirchenu po vedlejší, oběd u Seitnera na Villacher Straße 11 — Mythos na náměstí má v pondělí zavřeno. Zpátky jižním břehem kolem kláštera, na oběd tam ne. Villach, Faak ani Wörthersee dneska ne.",
    alts: [
      { id: "ossiach", why: "Když přijedete pozdě — jen dokola domácího jezera po R2, bez Feldkirchenu." },
      { id: "landskron", why: "Ještě kratší a jiným směrem: hrad a káva ve Villachu. Pak ve čtvrtek vynechte sjezd kolem hradu." },
      { id: "ossiachertauern", why: "Když chcete hned kopce: hřeben mezi dvěma jezery, ne po břehu." },
    ],
  },
  {
    date: "2026-09-08",
    dow: "út",
    day: "8. 9.",
    role: "den",
    slot: "big",
    pick: "faakerwoerther",
    why: "Poprvé na jih: stezka k Faaker See, okruh u vody, pak Velden. Kousek aut u Roseggu a ve Villachu, jinak ve dvou.",
    story:
      "Z domu na západ po břehu do Annenheimu a poprvé do Villachu — ne po B94. Ve městě chvíli mezi auty, za ním zase stezka k Drobollachu: tyrkysové jezero, Mittagskogel, panoramabeach zdarma. Tretry dolů tady, oběd u vody. Kostel sv. Martina, dál k zámku Rosegg a do Veldnu — tenhle spoj je okreska s auty. Promenáda, zámek ve vodě, zmrzlina. Zpátky Villachem, ne po jižním břehu Ossiachu.",
    alts: [
      { id: "faaker", why: "Jen Faaker See, bez Veldnu. Kratší, pořád jiný kraj než včera." },
      { id: "woerthersee", why: "Celý Wörthersee včetně Maria Wörth (~100 km). Faaker vynecháte." },
      { id: "millstatt", why: "Úplně jinam: Gegendtal a Millstätter See pod Nockbergami. Faak a Velden pak nechte být." },
    ],
  },
  {
    date: "2026-09-09",
    dow: "st",
    day: "9. 9.",
    role: "den",
    slot: "big",
    pick: "caar",
    why: "Do Arnoldsteinu po silnici (R3 je šotolina), od hranice po Pontebbaně do Tarvisia. Oběd v Itálii, stejnou cestou zpátky.",
    story:
      "Villachem na jihozápad údolím Gailitz, po asfaltu přes Arnoldstein k hranici v Thörl-Maglern. Gailtal-Radweg (R3) ne — je zčásti jemně štěrkovaný a stejně vede vedle rušné silnice. Za hranicí odbočíš od aut: sedm kilometrů samostatné stezky po staré Pontebbaně, les, louky, tunely, dojezd starým nádražím do Tarvisia. Kolo k parku, pěšky pizza ve Friuli nebo zmrzlina na Piazza Unità. Jezero dneska není — koupání až večer doma. Doklady s sebou.",
    alts: [
      { id: "fusine", why: "Když nohy poletí: odbočka k Laghi di Fusine a Rateče. Pořád asfalt, zhruba +25 km." },
      { id: "wurzen", why: "Když chceš i pas: nahoru z Arnoldsteinu, dolů do Slovinska, domů po Pontebbaně. Nikdy dolů rakouskou stranou. R3 zase ne." },
      { id: "trizeme", why: "Jen když budou nohy: Predil, Soča, Vršič. Tam i zpátky po silnici a Pontebbaně, ne po R3 a ne dolů Wurzenpassem." },
    ],
  },
  {
    date: "2026-09-10",
    dow: "čt",
    day: "10. 9.",
    role: "den",
    slot: "big",
    pick: "villacher",
    why: "Jiná hora než ta nad ubytováním: Dobratsch. Sem stezka nevede — nahoru za sebou, auta jsou, ale mýto je drží.",
    story:
      "K Villachu po břehu, ve dvou. Od mýtné brány Möltschach už jedete za sebou: 16,5 km serpentin na Rosstratte 1 732 m. Auta platí mýto. Nahoře panorama a oběd v Schmankerlstubn — Kasnudel, pizza z pece. Alpská zahrada u parkoviště. Dolů stejnou silnicí, koupání až dole: Mini-Strand nebo Seebad Bodensdorf. Ráno v kotlině drží mlha — nevyjíždět v sedm. Ne na Faaker a ne na Gerlitzen.",
    alts: [
      { id: "windische", why: "Místo výjezdu okruh: Gailtal a Windische Höhe, ~100 km, pořád jiná údolí." },
      { id: "millstatt", why: "Millstätter See přes Gegendtal. Pak v pátek zvolte Landskron, ne okruh Gerlitzenu." },
      { id: "feuerberg", why: "Gerlitzen Alpenstraße z Bodensdorfu. Pak v pátek nejezděte kolem stejné hory." },
    ],
  },
  {
    date: "2026-09-11",
    dow: "pá",
    day: "11. 9.",
    role: "odjezd",
    slot: "easy",
    pick: "gerlitzenokruh",
    why: "Zavřít týden za domácí horou: klidné okresky Gegendtalu, ve dvou skoro pořád. Jezero jen poslední kilometry.",
    story:
      "Z Treffenu do Gegendtalu — Afritzer See: kolo u silnice, k vodě pěšky, svačina v Seecafé u Strandbad Friessner. Winklern, Hinterbuchholz, Arriach. Alte Point na návsi vaří v pátek jen 12:00–13:30. Sjezd do Himmelbergu je úzký a strmý — tam za sebou. Po sjezdu Zeitlos na Turracher Straße, pak Nadling, Tiffen, u Steindorfu chvíli severní břeh. Domů. Pozdější check-out: sprcha, balení, šest hodin za volantem.",
    alts: [
      { id: "landskron", why: "Když jedete po obědě: jen hrad a Villach, 23 km. Tuhle silnici jste celý týden minuli." },
      { id: "ossiachertauern", why: "Hřeben mezi Ossiachem a Wörthersee, Landskron cestou dolů. Kopce, ale jiná silnice než Gegendtal." },
      { id: "rosental", why: "Karavanky z údolí. Částečně kolem Faaku z úterý — berte, jen když ten den nechcete kopce." },
    ],
  },
];

export const BIG_BY_WEATHER = ["villacher", "caar", "faakerwoerther"];
