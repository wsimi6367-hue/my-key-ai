// Compréhension des demandes et recherche dans les biens.
// Version sans IA (règles). Elle sera remplacée ou complétée par un appel LLM (voir CLAUDE.md),
// mais garde le même contrat : parseQuery(texte) -> critères, searchListings(biens, critères) -> résultat.
import { GEO } from "./geo.js";

export const norm = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

const TYPE_WORDS = [
  ["Studio", ["studio", "studios"]],
  ["Appartement", ["appartement", "appartements", "appart", "apparts", "appt"]],
  ["Maison", ["maison", "maisons"]],
  ["Villa", ["villa", "villas"]],
  ["Duplex", ["duplex", "triplex"]],
  ["Terrain", ["terrain", "terrains", "lot", "lots", "parcelle", "parcelles"]],
  ["Bureau", ["bureau", "bureaux"]],
  ["Magasin / local commercial", ["magasin", "magasins", "boutique", "local commercial"]],
  ["Entrepôt", ["entrepot", "entrepots", "hangar"]],
  ["Immeuble", ["immeuble", "immeubles"]],
];

const RENT = ["louer", "location", "loue", "loyer", "a louer", "rent", "bail", "colocation"];
const BUY = ["acheter", "achat", "vente", "a vendre", "vendre", "acquerir", "buy", "investir"];

const ALIASES = {
  "2 plateaux": "Deux-Plateaux", "deux plateaux": "Deux-Plateaux", "ii plateaux": "Deux-Plateaux",
  "yop": "Yopougon", "yopo": "Yopougon", "port bouet": "Port-Bouët", "riviera golf": "Riviera Golf",
  "palmeraie": "Riviera Palmeraie", "angre": "Angré", "faya": "Faya", "zone 4": "Zone 4",
};

// Liste plate des lieux connus, du plus précis au plus large.
export const PLACES = (() => {
  const list = [];
  for (const [commune, zones] of Object.entries(GEO)) {
    list.push({ level: "commune", name: commune, commune });
    for (const [zone, quartiers] of Object.entries(zones)) {
      if (zone !== commune) list.push({ level: "zone", name: zone, commune, zone });
      for (const q of quartiers) list.push({ level: "quartier", name: q, commune, zone, quartier: q });
    }
  }
  return list.sort((a, b) => norm(b.name).length - norm(a.name).length);
})();

const has = (text, words) => words.some((w) => new RegExp(`(^| )${w}( |$)`).test(text));

function parseMoney(text) {
  // "200 000", "200.000", "200k", "1,5 million", "50 millions", "150 mille"
  const t = text.replace(/(\d)[ .](?=\d{3}\b)/g, "$1");
  const re = /(\d+(?:[.,]\d+)?)\s*(k|mille|m|million|millions|mio|f|fcfa|cfa|francs?)?\b/g;
  const values = [];
  let m;
  while ((m = re.exec(t))) {
    let v = parseFloat(m[1].replace(",", "."));
    const u = m[2] || "";
    if (u === "k" || u === "mille") v *= 1000;
    else if (u === "m" || u.startsWith("million") || u === "mio") v *= 1_000_000;
    if (v >= 10000) values.push(v);
  }
  return values.length ? Math.max(...values) : null;
}

export function parseQuery(raw) {
  const text = norm(raw);
  const c = { raw, transaction: null, types: [], place: null, budgetMax: null, chambresMin: null, piecesMin: null, meuble: null, sort: null };

  if (has(text, RENT.map(norm))) c.transaction = "Location";
  if (has(text, BUY.map(norm))) c.transaction = c.transaction ? null : "Vente";

  const ch = text.match(/(\d+)\s*(chambres?|ch)\b/);
  if (ch) c.chambresMin = +ch[1];
  const pc = text.match(/(\d+)\s*(pieces?|p)\b/);
  if (pc) c.piecesMin = +pc[1];

  for (const [type, words] of TYPE_WORDS) if (has(text, words.map(norm))) c.types.push(type);
  if (/\bchambre salon\b/.test(text) || (/\bchambre\b/.test(text) && !ch)) c.types.push("Chambre");
  if (c.piecesMin && !c.types.length) c.types.push("Appartement");

  if (/\bmeuble/.test(text)) c.meuble = /\bnon meuble|pas meuble/.test(text) ? "Non" : "Oui";

  let probe = " " + text + " ";
  for (const [a, target] of Object.entries(ALIASES)) probe = probe.replace(` ${a} `, ` ${norm(target)} `);
  const rank = { quartier: 3, zone: 2, commune: 1 };
  const found = PLACES.filter((p) => probe.includes(" " + norm(p.name) + " "));
  found.sort((a, b) => rank[b.level] - rank[a.level] || norm(b.name).length - norm(a.name).length);
  if (found.length) {
    // Si une commune est citée, on garde le lieu le plus précis situé dans cette commune.
    const commune = found.find((p) => p.level === "commune");
    c.place = (commune && found.find((p) => p.commune === commune.commune)) || found[0];
  }

  const lower = String(raw || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  c.budgetMax = parseMoney(lower.replace(/(\d+)\s*(chambres?|ch|pieces?|p|m2|m²|metres?)\b/g, " "));
  if (/\bnouveau|nouvelles|recent|derni/.test(text)) c.sort = "recent";
  if (!c.transaction && c.types.length && c.types.every((t) => ["Terrain", "Immeuble"].includes(t))) c.transaction = "Vente";
  if (!c.transaction && c.budgetMax) c.transaction = c.budgetMax >= 5_000_000 ? "Vente" : "Location";
  return c;
}

function matches(b, c, relax = 0) {
  if (b["Disponibilité"] && b["Disponibilité"] !== "Disponible") return false;
  if (c.transaction && b.Transaction !== c.transaction) return false;
  if (c.types.length && !c.types.includes(b["Type de bien"])) return false;
  if (c.place) {
    const lvl = relax >= 2 && c.place.level !== "commune" ? "commune" : relax >= 1 && c.place.level === "quartier" ? "zone" : c.place.level;
    if (lvl === "quartier" && b.Quartier !== c.place.quartier) return false;
    if (lvl === "zone" && b.Zone !== c.place.zone) return false;
    if (lvl === "commune" && b.Commune !== c.place.commune) return false;
  }
  if (c.budgetMax && b.Prix && b.Prix > c.budgetMax * (relax >= 1 ? 1.15 : 1)) return false;
  if (c.chambresMin && (b.Chambres ?? 0) < c.chambresMin) return false;
  if (c.piecesMin && (b["Pièces"] ?? 0) < c.piecesMin) return false;
  if (c.meuble === "Oui" && b["Meublé"] !== "Oui") return false;
  return true;
}

export function searchListings(listings, c, max = 6) {
  for (const relax of [0, 1, 2]) {
    let res = listings.filter((b) => matches(b, c, relax));
    if (res.length) {
      res.sort((a, b) =>
        c.sort === "recent"
          ? String(b["Date et heure de publication"]).localeCompare(String(a["Date et heure de publication"]))
          : (a.Prix || 0) - (b.Prix || 0));
      return { results: res.slice(0, max), total: res.length, relaxed: relax };
    }
  }
  return { results: [], total: 0, relaxed: 0 };
}

export const formatPrice = (b) => {
  if (!b.Prix) return "Prix sur demande";
  const p = Number(b.Prix).toLocaleString("fr-FR").replace(/ /g, " ");
  const per = { Mensuel: " / mois", Journalier: " / jour", Hebdomadaire: " / semaine", Annuel: " / an" }[b["Périodicité"]] || "";
  return `${p} FCFA${per}`;
};

const fmtBudget = (v) => Number(v).toLocaleString("fr-FR").replace(/ /g, " ") + " FCFA";

export function describeCriteria(c) {
  const parts = [];
  if (c.types.length) parts.push(c.types.join(" ou ").toLowerCase());
  else parts.push("biens");
  if (c.transaction) parts.push(c.transaction === "Location" ? "en location" : "à vendre");
  if (c.place) parts.push(`à ${c.place.name}${c.place.level !== "commune" ? ` (${c.place.commune})` : ""}`);
  if (c.chambresMin) parts.push(`${c.chambresMin} chambre${c.chambresMin > 1 ? "s" : ""} minimum`);
  if (c.piecesMin) parts.push(`${c.piecesMin} pièces minimum`);
  if (c.meuble === "Oui") parts.push("meublé");
  if (c.budgetMax) parts.push(`jusqu'à ${fmtBudget(c.budgetMax)}`);
  return parts.join(", ");
}

export function buildReply(c, out) {
  const what = describeCriteria(c);
  const missing = [];
  if (!c.transaction) missing.push("s'il s'agit d'une location ou d'un achat");
  if (!c.place) missing.push("la commune ou le quartier");
  if (!c.budgetMax) missing.push("votre budget");
  if (!out.results.length) {
    return `Je n'ai trouvé aucun bien disponible pour : ${what}. Essayez un quartier voisin ou un budget un peu plus large.`;
  }
  let msg = out.relaxed
    ? `Rien d'exact pour : ${what}. Voici ce qui s'en rapproche le plus (zone élargie ou budget +15 %) :`
    : `J'ai trouvé ${out.total} bien${out.total > 1 ? "s" : ""} pour : ${what}.`;
  if (out.total > out.results.length) msg += ` Voici les ${out.results.length} premiers.`;
  if (missing.length && missing.length < 3) msg += ` Pour affiner, dites-moi ${missing.join(" et ")}.`;
  return msg;
}

export function popularAreas(listings) {
  const counts = {};
  for (const b of listings) if (b["Disponibilité"] === "Disponible" && b.Commune) counts[b.Commune] = (counts[b.Commune] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}
