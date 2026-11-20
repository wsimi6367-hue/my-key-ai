import { CONFIG } from "./config.js";
import { GEO } from "./geo.js";
import { ICONS, logoSwirl, TYPE_ICON } from "./icons.js";
import { loadListings } from "./data.js";
import { parseQuery, searchListings, buildReply, formatPrice, popularAreas, PLACES, norm } from "./search.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const state = {
  listings: [], source: "demo",
  tx: "Location", types: new Set(), place: null,
  tts: false, started: false,
};

/* ---------- Mise en place ---------- */
function paintIcons(root = document) {
  $$("[data-icon]", root).forEach((el) => { el.innerHTML = ICONS[el.dataset.icon] || ""; });
  $$("[data-logo]", root).forEach((el) => { el.innerHTML = logoSwirl() + '<div class="word">my key ai</div>'; });
}

const TYPES = ["Terrain", "Studio", "Villa", "Duplex", "Appartement", "Maison", "Chambre", "Bureau"];
function renderTypeChips() {
  $("#type-chips").innerHTML = TYPES.map((t) => `<button class="chip${state.types.has(t) ? " on" : ""}" data-type="${t}">${t}</button>`).join("");
}

const SUGGESTIONS = [
  [["Louer un studio", "Je veux louer un studio"], ["Acheter une villa", "Je veux acheter une villa"], ["Trouver un terrain", "Je cherche un terrain à acheter"], ["Louer un duplex", "Je veux louer un duplex"]],
  [["Nouveautés", "__new"], ["Quartiers populaires", "__popular"], ["Petit budget", "Je veux louer moins de 100 000"], ["Meublés", "Je cherche un appartement ou studio meublé à louer"]],
];
function renderSuggestions() {
  $("#suggestions").innerHTML = SUGGESTIONS.map((row) =>
    `<div class="chips">${row.map(([label, q]) => `<button class="chip" data-suggest="${esc(q)}" data-label="${esc(label)}">${esc(label)}</button>`).join("")}</div>`).join("");
}

/* ---------- Navigation ---------- */
const SCREENS = ["assistant", "recherche", "vocal"];
function route() {
  const name = SCREENS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "assistant";
  $$(".screen").forEach((s) => s.classList.toggle("active", s.id === "screen-" + name));
  $$("[data-nav]").forEach((a) => a.classList.toggle("current", a.dataset.nav === name));
  closeAll();
  if (name !== "vocal") stopListening();
}
const go = (name) => { if (location.hash !== "#" + name) location.hash = name; else route(); };

function closeAll() {
  $("#overlay").classList.remove("show");
  $("#place-sheet").classList.remove("show");
  $("#drawer").classList.remove("show");
}

/* ---------- Lecture à voix haute ---------- */
function setTTS(on) {
  state.tts = on;
  $$('[data-action="tts"]').forEach((b) => { b.classList.toggle("on", on); b.innerHTML = on ? ICONS.speaker : ICONS.speakerOff; });
  if (!on) try { speechSynthesis.cancel(); } catch {}
}
function speak(text) {
  if (!state.tts) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = CONFIG.speechLang;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch {}
}

/* ---------- Cartes de biens ---------- */
function listingCard(b) {
  const isSale = b.Transaction === "Vente";
  const loc = [b.Quartier && b.Quartier !== "Autre / non précisé" ? b.Quartier : null, b.Zone !== b.Commune ? b.Zone : null, b.Commune].filter(Boolean).join(", ");
  const facts = [
    b.Chambres ? `${b.Chambres} ch.` : null,
    b["Pièces"] ? `${b["Pièces"]} pièce${b["Pièces"] > 1 ? "s" : ""}` : null,
    b["Surface (m²)"] ? `${b["Surface (m²)"]} m²` : null,
    b["Meublé"] === "Oui" ? "Meublé" : null,
  ].filter(Boolean);
  const phone = b.WhatsApp || b["Téléphone"] || "";
  const digits = phone.replace(/\D/g, "");
  const demo = b.Plateforme === "Démo";
  const img = b["Image principale (URL)"];
  return `
  <article class="listing">
    <div class="media">
      ${img ? `<img src="${esc(img)}" alt="" onerror="this.remove()">` : ""}
      ${TYPE_ICON[b["Type de bien"]] || TYPE_ICON.default}
      <span class="tag ${isSale ? "sale" : "rent"}">${isSale ? "À vendre" : "À louer"} · ${esc(b["Type de bien"])}</span>
    </div>
    <div class="body">
      <h3>${esc(b["Titre / résumé"])}</h3>
      <div class="loc">${esc(loc)}</div>
      <div class="price">${esc(formatPrice(b))}</div>
      ${facts.length ? `<div class="facts">${facts.map((f) => `<span>${esc(f)}</span>`).join("")}</div>` : ""}
      <div class="actions">
        ${b["URL de la publication"] ? `<a href="${esc(b["URL de la publication"])}" target="_blank" rel="noopener">Voir l'annonce</a>` : `<span class="off">Annonce non liée</span>`}
        ${demo || !digits ? `<span class="off">Contact (démo)</span>` : `<a class="wa" href="https://wa.me/${digits}" target="_blank" rel="noopener">WhatsApp</a>`}
      </div>
      ${!demo && phone ? `<div class="contact">${esc(b["Publié par (nom)"] || "Annonceur")} · ${esc(phone)}</div>` : ""}
    </div>
  </article>`;
}

/* ---------- Assistant ---------- */
function addMsg(html, who) {
  if (!state.started) { state.started = true; $("#hero").classList.add("hidden"); $("#suggestions").classList.add("hidden"); }
  const el = document.createElement("div");
  el.className = "msg " + who;
  el.innerHTML = html;
  $("#chat").appendChild(el);
  $("#chat-scroll").scrollTop = $("#chat-scroll").scrollHeight;
  return el;
}
function addCards(results) {
  const wrap = document.createElement("div");
  wrap.className = "results";
  wrap.innerHTML = results.map(listingCard).join("");
  $("#chat").appendChild(wrap);
  $("#chat-scroll").scrollTop = $("#chat-scroll").scrollHeight;
}

function answer(text, display = text) {
  addMsg(esc(display), "user");
  const typing = addMsg("<span></span><span></span><span></span>", "bot typing");
  setTimeout(() => {
    typing.remove();
    let reply, results = [];
    if (text === "__new") {
      const c = parseQuery("nouveautes"); c.sort = "recent";
      const out = searchListings(state.listings, c, CONFIG.maxResults);
      reply = "Voici les dernières annonces disponibles :"; results = out.results;
    } else if (text === "__popular") {
      const top = popularAreas(state.listings).slice(0, 6);
      reply = top.length ? "Communes avec le plus de biens disponibles : " + top.map(([c, n]) => `${c} (${n})`).join(", ") + ". Dites-moi laquelle vous intéresse." : "Aucun bien disponible pour l'instant.";
    } else {
      const c = parseQuery(text);
      const empty = !c.transaction && !c.types.length && !c.place && !c.budgetMax && !c.chambresMin && !c.piecesMin;
      if (empty) {
        reply = "Dites-moi ce que vous cherchez : louer ou acheter, le type de bien, la commune ou le quartier, et votre budget. Par exemple : « studio à louer à Faya, 150 000 ».";
      } else {
        const out = searchListings(state.listings, c, CONFIG.maxResults);
        reply = buildReply(c, out); results = out.results;
      }
    }
    addMsg(esc(reply), "bot");
    if (results.length) addCards(results);
    speak(reply);
  }, 450);
}

function updateMicSend() {
  const btn = $("#mic-or-send");
  const hasText = $("#chat-input").value.trim().length > 0;
  btn.dataset.action = hasText ? "send" : "goto-vocal";
  btn.innerHTML = hasText ? ICONS.send : ICONS.mic;
  btn.setAttribute("aria-label", hasText ? "Envoyer" : "Parler");
}

/* ---------- Recherche détaillée ---------- */
function runFormSearch() {
  const desc = $("#search-desc").value;
  const c = parseQuery(desc);
  c.transaction = state.tx;
  if (state.types.size) c.types = [...state.types];
  if (state.place) c.place = state.place;
  const out = searchListings(state.listings, c, 20);
  const box = $("#search-results");
  box.innerHTML = `<p class="note">${esc(buildReply(c, out))}</p>${state.source === "demo" ? '<p class="note">Données de démonstration</p>' : ""}<div class="results">${out.results.map(listingCard).join("")}</div>`;
  const sc = box.closest(".scroll"); sc.scrollTo({ top: box.offsetTop - sc.offsetTop - 8, behavior: "smooth" });
  speak(buildReply(c, out));
}

/* ---------- Choix du lieu ---------- */
function openPlaces(level = "communes", commune = null, zone = null) {
  $("#overlay").classList.add("show");
  $("#place-sheet").classList.add("show");
  renderPlaces(level, commune, zone);
}
function placeItem(label, payload, sub = "", cls = "") {
  return `<li><button class="${cls}" data-place='${esc(JSON.stringify(payload))}'><span>${esc(label)}</span><small>${esc(sub)}</small></button></li>`;
}
function renderPlaces(level, commune, zone) {
  const list = $("#place-list");
  const title = $("#sheet-title");
  $("#place-search").value = "";
  if (level === "communes") {
    title.textContent = "Où cherchez-vous ?";
    list.innerHTML = placeItem("Toutes les communes", { clear: true }, "", "all") +
      Object.keys(GEO).map((c) => placeItem(c, { open: "zones", commune: c }, Object.keys(GEO[c]).length > 1 ? `${Object.keys(GEO[c]).length} zones` : "")).join("");
  } else if (level === "zones") {
    const zones = Object.keys(GEO[commune]);
    if (zones.length === 1) return renderPlaces("quartiers", commune, zones[0]);
    title.innerHTML = `<button class="back" data-place='{"open":"communes"}'>‹ Communes</button> ${esc(commune)}`;
    list.innerHTML = placeItem(`Tout ${commune}`, { pick: { level: "commune", name: commune, commune } }, "", "all") +
      zones.map((z) => placeItem(z, { open: "quartiers", commune, zone: z }, `${GEO[commune][z].length} quartiers`)).join("");
  } else {
    const multi = Object.keys(GEO[commune]).length > 1;
    title.innerHTML = `<button class="back" data-place='${esc(JSON.stringify(multi ? { open: "zones", commune } : { open: "communes" }))}'>‹ ${multi ? esc(commune) : "Communes"}</button> ${esc(zone)}`;
    const all = multi ? { level: "zone", name: zone, commune, zone } : { level: "commune", name: commune, commune };
    list.innerHTML = placeItem(`Tout ${zone}`, { pick: all }, "", "all") +
      GEO[commune][zone].map((q) => placeItem(q, { pick: { level: "quartier", name: q, commune, zone, quartier: q } })).join("");
  }
}
function filterPlaces(q) {
  const n = norm(q);
  if (!n) return renderPlaces("communes");
  const hits = PLACES.filter((p) => norm(p.name).includes(n)).slice(0, 40);
  $("#sheet-title").textContent = "Résultats";
  $("#place-list").innerHTML = hits.map((p) =>
    placeItem(p.name, { pick: p }, p.level === "commune" ? "Commune" : p.level === "zone" ? `Zone · ${p.commune}` : `${p.zone !== p.commune ? p.zone + " · " : ""}${p.commune}`)).join("") ||
    `<li class="note">Aucun lieu trouvé. Essayez un autre nom.</li>`;
}
function setPlace(p) {
  state.place = p;
  $("#place-value").textContent = p ? (p.level === "commune" ? p.name : `${p.name}, ${p.commune}`) : "";
  closeAll();
}

/* ---------- Vocal ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, finalText = "";
function startListening() {
  if (!SR) return voiceFallback("La reconnaissance vocale n'est pas disponible sur ce navigateur.");
  try {
    rec = new SR();
    rec.lang = CONFIG.speechLang; rec.interimResults = true; rec.continuous = false;
    finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (const r of e.results) (r.isFinal ? (finalText = r[0].transcript) : (interim += r[0].transcript));
      $("#transcript").textContent = finalText || interim;
    };
    rec.onerror = (e) => voiceFallback(e.error === "not-allowed" || e.error === "service-not-allowed"
      ? "Le micro n'est pas autorisé ici." : "Je n'ai pas bien entendu. Réessayez ou tapez votre demande.");
    rec.onend = () => {
      setListening(false);
      const said = (finalText || $("#transcript").textContent).trim();
      if (said) { go("assistant"); answer(said); $("#transcript").textContent = ""; }
    };
    rec.start(); setListening(true);
    $("#voice-status").textContent = "Je vous écoute…";
  } catch { voiceFallback("Le micro n'est pas disponible ici."); }
}
function stopListening() { if (rec && listening) try { rec.stop(); } catch {} setListening(false); }
function setListening(on) { listening = on; $("#big-mic").classList.toggle("listening", on); if (!on) $("#voice-status").textContent = ""; }
function voiceFallback(msg) {
  setListening(false);
  $("#voice-status").textContent = msg;
  $("#voice-fallback").classList.add("show");
  $("#voice-text").focus();
}

function animateWave() {
  const cv = $("#wave"), ctx = cv.getContext("2d");
  let t = 0;
  const draw = () => {
    const w = (cv.width = cv.clientWidth * devicePixelRatio), h = (cv.height = cv.clientHeight * devicePixelRatio);
    ctx.clearRect(0, 0, w, h);
    const amp = (listening ? 0.28 : 0.1) * h;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const env = Math.sin((x / w) * Math.PI) ** 2;
        const y = h / 2 + Math.sin(x / (w / (6 + k)) + t * (1.2 + k * 0.3)) * amp * env * (1 - k * 0.2);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `rgba(${k ? "91,234,91" : "160,255,140"},${0.9 - k * 0.2})`;
      ctx.lineWidth = (k ? 1.5 : 2.5) * devicePixelRatio;
      ctx.shadowColor = "rgba(91,234,91,.8)"; ctx.shadowBlur = 12;
      ctx.stroke();
    }
    t += 0.04;
    if ($("#screen-vocal").classList.contains("active")) requestAnimationFrame(draw);
    else setTimeout(() => requestAnimationFrame(draw), 300);
  };
  draw();
}

/* ---------- Événements ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action],[data-type],[data-tx],[data-suggest],[data-place],[data-nav]");
  if (!el) return;
  if (el.dataset.nav) return; // lien #hash géré par hashchange
  if (el.dataset.type) { const t = el.dataset.type; state.types.has(t) ? state.types.delete(t) : state.types.add(t); return renderTypeChips(); }
  if (el.dataset.tx) { state.tx = el.dataset.tx; $$("[data-tx]").forEach((b) => b.classList.toggle("on", b === el)); return; }
  if (el.dataset.suggest) return answer(el.dataset.suggest, el.dataset.label);
  if (el.dataset.place) {
    const p = JSON.parse(el.dataset.place);
    if (p.clear) return setPlace(null);
    if (p.pick) return setPlace(p.pick);
    return renderPlaces(p.open, p.commune, p.zone);
  }
  switch (el.dataset.action) {
    case "menu": $("#overlay").classList.add("show"); $("#drawer").classList.add("show"); break;
    case "tts": setTTS(!state.tts); break;
    case "pick-place": openPlaces(); break;
    case "search": runFormSearch(); break;
    case "goto-recherche": go("recherche"); break;
    case "goto-assistant": go("assistant"); break;
    case "goto-vocal": go("vocal"); break;
    case "send": $("#composer").requestSubmit(); break;
    case "voice-stop": stopListening(); break;
    case "reset":
      $("#chat").innerHTML = ""; state.started = false;
      $("#hero").classList.remove("hidden"); $("#suggestions").classList.remove("hidden"); closeAll(); break;
  }
});
$("#overlay").addEventListener("click", closeAll);
$("#composer").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#chat-input").value.trim();
  if (!v) return;
  $("#chat-input").value = ""; updateMicSend(); answer(v);
});
$("#chat-input").addEventListener("input", updateMicSend);
$("#photo-input").addEventListener("change", () => {
  addMsg("Photo envoyée", "user");
  addMsg("La recherche par photo arrive bientôt. En attendant, décrivez le bien en quelques mots (type, quartier, budget).", "bot");
  $("#photo-input").value = "";
});
$("#place-search").addEventListener("input", (e) => filterPlaces(e.target.value));
$("#big-mic").addEventListener("click", () => (listening ? stopListening() : startListening()));
$("#voice-fallback").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#voice-text").value.trim();
  if (!v) return;
  $("#voice-text").value = ""; go("assistant"); answer(v);
});
window.addEventListener("hashchange", route);

/* ---------- Démarrage ---------- */
(async function init() {
  paintIcons();
  renderTypeChips();
  renderSuggestions();
  route();
  animateWave();
  const { listings, source } = await loadListings();
  state.listings = listings; state.source = source;
  const dispo = listings.filter((b) => b["Disponibilité"] === "Disponible").length;
  $("#data-meta").innerHTML = source === "live"
    ? `Données : Google Sheet en direct<br>${dispo} biens disponibles`
    : `Données de démonstration (${dispo} biens fictifs).<br>Le Google Sheet n'est pas joignable depuis cet aperçu.`;
})();
