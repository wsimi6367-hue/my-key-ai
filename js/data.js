// Accès aux biens. Les noms de champs sont exactement les en-têtes de l'onglet « Biens » du Google Sheet.
import { CONFIG } from "./config.js";
import { GEO } from "./geo.js";

// Biens fictifs, uniquement pour la démonstration (contacts factices).
const DEMO = [
  ["BIEN-0001","Location","Studio","Studio américain neuf, Riviera Faya","Cocody – Faya – Riviera Faya",120000,"Mensuel",28,1,0,1,"Oui","Climatisation, eau chaude, gardien","2026-11-19 09:15"],
  ["BIEN-0002","Location","Appartement","3 pièces avec parking, Cité SIR","Cocody – Faya – Cité SIR",350000,"Mensuel",95,3,2,2,"Non","Parking, climatisation, gardien","2026-11-18 17:40"],
  ["BIEN-0003","Location","Appartement","2 pièces lumineux, Angré 8e Tranche","Cocody – Angré – Angré 8e Tranche",200000,"Mensuel",60,2,1,1,"Non","Balcon, forage, gardien","2026-11-19 11:05"],
  ["BIEN-0004","Location","Duplex","Duplex 5 pièces avec jardin, Riviera Golf","Cocody – Riviera – Riviera Golf",900000,"Mensuel",250,5,4,4,"Non","Jardin, garage 2 voitures, groupe électrogène","2026-11-17 08:20"],
  ["BIEN-0005","Vente","Villa","Villa basse 4 pièces, Riviera Palmeraie","Cocody – Riviera – Riviera Palmeraie",120000000,"Prix total (vente)",400,4,3,3,"Non","ACD, piscine, garage","2026-11-16 15:00"],
  ["BIEN-0006","Vente","Terrain","Terrain 500 m² avec ACD, Bingerville","Bingerville – Akandjé",25000000,"Prix total (vente)",500,0,0,0,"Non précisé","ACD, viabilisé","2026-11-19 07:30"],
  ["BIEN-0007","Location","Studio","Studio meublé, Deux-Plateaux Vallon","Cocody – Deux-Plateaux – Vallon",250000,"Mensuel",35,1,0,1,"Oui","Wifi, climatisation, ménage","2026-11-18 10:10"],
  ["BIEN-0008","Location","Appartement","3 pièces, Zone 4 proche Biétry","Marcory – Zone 4",450000,"Mensuel",110,3,2,2,"Non","Parking, ascenseur","2026-11-15 19:45"],
  ["BIEN-0009","Location","Chambre","Chambre salon, Yopougon Selmer","Yopougon – Yopougon Attié – Selmer",60000,"Mensuel",30,2,1,1,"Non","Compteur individuel","2026-11-19 12:30"],
  ["BIEN-0010","Location","Appartement","2 pièces, Koumassi Remblais","Koumassi – Remblais",130000,"Mensuel",55,2,1,1,"Non","Carrelé, compteur individuel","2026-11-14 09:00"],
  ["BIEN-0011","Vente","Duplex","Duplex 6 pièces neuf, Angré Château","Cocody – Angré – Angré Château",185000000,"Prix total (vente)",320,6,5,5,"Non","ACD, piscine, garage","2026-11-18 14:25"],
  ["BIEN-0012","Location","Studio","Studio, Abobo Avocatier","Abobo – Abobo Sud / Est – Avocatier",45000,"Mensuel",22,1,0,1,"Non","Compteur individuel","2026-11-19 08:05"],
  ["BIEN-0013","Vente","Terrain","Lot 600 m², Songon Kassemblé","Songon – Songon Kassemblé",12000000,"Prix total (vente)",600,0,0,0,"Non précisé","Attestation villageoise","2026-11-13 16:00"],
  ["BIEN-0014","Location","Villa","Villa 4 pièces avec cour, Riviera 3","Cocody – Riviera – Riviera 3",600000,"Mensuel",220,4,3,3,"Non","Cour, garage, gardien","2026-11-17 18:10"],
];

const LOC_INDEX = buildLocIndex();

function buildLocIndex() {
  const idx = {};
  for (const [commune, zones] of Object.entries(GEO)) {
    for (const [zone, quartiers] of Object.entries(zones)) {
      for (const q of [...quartiers, "Autre / non précisé"]) {
        const label = zone === commune ? `${commune} – ${q}` : `${commune} – ${zone} – ${q}`;
        idx[label] = { commune, zone, quartier: q };
      }
    }
  }
  return idx;
}

function demoListings() {
  return DEMO.map(([id, tr, type, titre, loc, prix, per, surf, pieces, ch, sdb, meuble, equip, pub]) => {
    const g = LOC_INDEX[loc] || {};
    return {
      "ID": id, "Transaction": tr, "Type de bien": type, "Titre / résumé": titre,
      "Localisation (choisir)": loc, "Commune": g.commune, "Zone": g.zone, "Quartier": g.quartier,
      "Prix": prix, "Périodicité": per, "Surface (m²)": surf, "Pièces": pieces, "Chambres": ch,
      "Salles de bain": sdb, "Meublé": meuble, "Équipements": equip,
      "Publié par (nom)": "Annonceur démo", "Type d'annonceur": "Particulier / propriétaire",
      "Téléphone": "+225 00 00 00 00 00", "WhatsApp": "+225 00 00 00 00 00",
      "Plateforme": "Démo", "URL de la publication": "",
      "Date et heure de publication": pub, "Image principale (URL)": "",
      "Disponibilité": "Disponible",
    };
  });
}

// --- Lecture du Google Sheet (format CSV via gviz) ---
function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function toNumber(v) {
  if (typeof v === "number") return v;
  const n = Number(String(v || "").replace(/[^\d.,-]/g, "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function liveListings() {
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.sheetTab)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  const res = await fetch(url, { signal: ctrl.signal });
  clearTimeout(t);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const rows = parseCSV(await res.text());
  const head = rows.shift().map((h) => h.trim());
  return rows
    .map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])))
    .filter((b) => b["Titre / résumé"] && !/^EXEMPLE/i.test(b["Titre / résumé"]))
    .map((b) => {
      const g = LOC_INDEX[b["Localisation (choisir)"]] || {};
      return {
        ...b,
        Commune: b.Commune || g.commune, Zone: b.Zone || g.zone, Quartier: g.quartier,
        Prix: toNumber(b.Prix), Chambres: toNumber(b.Chambres), Pièces: toNumber(b.Pièces),
        "Surface (m²)": toNumber(b["Surface (m²)"]),
      };
    });
}

export async function loadListings() {
  if (CONFIG.useLiveSheet) {
    try {
      const live = await liveListings();
      if (live.length) return { listings: live, source: "live" };
    } catch (e) { /* bascule sur la démo */ }
  }
  return { listings: demoListings(), source: "demo" };
}

export { LOC_INDEX };
