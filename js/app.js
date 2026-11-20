import { CONFIG } from "./config.js";
import { GEO } from "./geo.js";
import { ICONS, TYPE_ICON } from "./icons.js";
import { PLACES, norm } from "./search.js";
import { askAssistant, newSessionId } from "./api.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Mémoire locale (facultative : l'appli marche sans) ---------- */
const STORE_KEY = "mykeyai.chat.v1";
const store = {
  read() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch { return null; } },
  write(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch {} },
  clear() { try { localStorage.removeItem(STORE_KEY); } catch {} },
};

const saved = store.read();
const state = {
  sessionId: saved?.sessionId || newSessionId(),
  messages: Array.isArray(saved?.messages) ? saved.messages.slice(-40) : [], // { role, content, listings? }
  tx: "Location", types: new Set(), place: null,
  tts: false, busy: false,
};
const persist = () => store.write({ sessionId: state.sessionId, messages: state.messages.slice(-40) });

/* ---------- Mise en place ---------- */
function paintIcons(root = document) {
  $$("[data-icon]", root).forEach((el) => { el.innerHTML = ICONS[el.dataset.icon] || ""; });
  $$("[data-logo]", root).forEach((el) => { el.innerHTML = '<img src="img/logo.png" alt="" width="690" height="240" decoding="async"><div class="word">my key ai</div>'; });
}

const TYPES = ["Terrain", "Studio", "Villa", "Duplex", "Appartement", "Maison", "Chambre", "Bureau"];
function renderTypeChips() {
  $("#type-chips").innerHTML = TYPES.map((t) => `<button class="chip${state.types.has(t) ? " on" : ""}" data-type="${t}" aria-pressed="${state.types.has(t)}">${t}</button>`).join("");
}

const SUGGESTIONS = [
  [["Louer un studio", "Je veux louer un studio"], ["Acheter une villa", "Je veux acheter une villa"], ["Trouver un terrain", "Je cherche un terrain à acheter"], ["Louer un duplex", "Je veux louer un duplex"]],
  [["Nouveautés", "Montrez-moi les annonces les plus récentes"], ["Quartiers populaires", "Dans quelles communes avez-vous le plus de biens disponibles ?"], ["Petit budget", "Je veux louer pour moins de 100 000 FCFA par mois"], ["Meublés", "Je cherche un appartement ou un studio meublé à louer"]],
];
function renderSuggestions() {
  $("#suggestions").innerHTML = SUGGESTIONS.map((row) =>
    `<div class="chips">${row.map(([label, q]) => `<button class="chip" data-suggest="${esc(q)}">${esc(label)}</button>`).join("")}</div>`).join("");
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
  $$('[data-action="tts"]').forEach((b) => { b.classList.toggle("on", on); b.innerHTML = on ? ICONS.speaker : ICONS.speakerOff; b.setAttribute("aria-pressed", on); });
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

/* ---------- Fiches de biens (format renvoyé par le chat n8n) ---------- */
const PER = { Mensuel: " / mois", Journalier: " / jour", Hebdomadaire: " / semaine", Annuel: " / an" };
const fmtPrice = (b) => b.prix ? `${Number(b.prix).toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA${PER[b.periodicite] || ""}` : "Prix sur demande";
const safeUrl = (u) => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";

function listingCard(b) {
  const isSale = b.transaction === "Vente";
  const loc = [b.quartier && b.quartier !== "Autre / non précisé" ? b.quartier : null, b.zone && b.zone !== b.commune ? b.zone : null, b.commune].filter(Boolean).join(", ");
  const facts = [
    b.chambres ? `${b.chambres} ch.` : null,
    b.pieces ? `${b.pieces} pièce${b.pieces > 1 ? "s" : ""}` : null,
    b.surface ? `${b.surface} m²` : null,
    b.meuble === "Oui" ? "Meublé" : null,
  ].filter(Boolean);
  const c = b.contact || {};
  const phone = c.whatsapp || c.telephone || "";
  const digits = phone.replace(/\D/g, "");
  const img = safeUrl(b.image);
  const url = safeUrl(b.url);
  const waText = encodeURIComponent(`Bonjour, je vous contacte via My Key AI au sujet de votre annonce : ${b.titre}`);
  return `
  <article class="listing">
    <div class="media">
      ${TYPE_ICON[b.type] || TYPE_ICON.default}
      ${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}
      <span class="tag ${isSale ? "sale" : "rent"}">${isSale ? "À vendre" : "À louer"} · ${esc(b.type)}</span>
      ${b.demo ? '<span class="tag demo">Démo</span>' : ""}
    </div>
    <div class="body">
      <h3>${esc(b.titre)}</h3>
      <div class="loc">${esc(loc)}${b.repere ? ` · ${esc(b.repere)}` : ""}</div>
      <div class="price">${esc(fmtPrice(b))}</div>
      ${facts.length ? `<div class="facts">${facts.map((f) => `<span>${esc(f)}</span>`).join("")}</div>` : ""}
      ${b.conditions ? `<div class="cond">${esc(b.conditions)}</div>` : ""}
      <div class="actions">
        ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">Voir l'annonce</a>` : `<span class="off">Annonce non liée</span>`}
        ${b.demo || !digits ? `<span class="off">${b.demo ? "Contact (démo)" : "Pas de numéro"}</span>` : `<a class="wa" href="https://wa.me/${digits}?text=${waText}" target="_blank" rel="noopener">WhatsApp</a>`}
      </div>
      ${!b.demo && phone ? `<div class="contact">${esc(c.nom || "Annonceur")}${c.typeAnnonceur ? ` (${esc(c.typeAnnonceur)})` : ""} · <a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}">${esc(phone)}</a></div>` : ""}
    </div>
  </article>`;
}

/* ---------- Assistant ---------- */
function showConversationStarted(started) {
  $("#hero").classList.toggle("hidden", started);
  $("#suggestions").classList.toggle("hidden", started);
}
function scrollChat() { const sc = $("#chat-scroll"); sc.scrollTop = sc.scrollHeight; }
function addMsg(html, who) {
  showConversationStarted(true);
  const el = document.createElement("div");
  el.className = "msg " + who;
  el.innerHTML = html;
  $("#chat").appendChild(el);
  scrollChat();
  return el;
}
function addCards(listings, root = $("#chat")) {
  const wrap = document.createElement("div");
  wrap.className = "results";
  wrap.innerHTML = listings.map(listingCard).join("");
  root.appendChild(wrap);
  scrollChat();
}
function renderHistory() {
  $("#chat").innerHTML = "";
  showConversationStarted(state.messages.length > 0);
  for (const m of state.messages) {
    addMsg(esc(m.content), m.role === "user" ? "user" : "bot");
    if (m.listings?.length) addCards(m.listings);
  }
}

function historyForApi() {
  return state.messages.slice(-12).map((m) => ({
    role: m.role,
    content: m.listings?.length ? `${m.content} [biens proposés : ${m.listings.map((b) => `${b.id} ${b.titre} ${fmtPrice(b)}`).join(" ; ")}]` : m.content,
  }));
}

async function answer(text) {
  text = String(text || "").trim();
  if (!text || state.busy) return;
  state.busy = true;
  setComposerBusy(true);
  const history = historyForApi();
  state.messages.push({ role: "user", content: text });
  persist();
  addMsg(esc(text), "user");
  const typing = addMsg("<span></span><span></span><span></span>", "bot typing");
  typing.setAttribute("aria-label", "My Key AI écrit…");
  try {
    const data = await askAssistant({ sessionId: state.sessionId, message: text, history });
    typing.remove();
    const listings = Array.isArray(data.listings) ? data.listings : [];
    state.messages.push({ role: "assistant", content: data.reply, listings });
    persist();
    addMsg(esc(data.reply), "bot");
    if (listings.length) addCards(listings);
    speak(data.reply);
  } catch (err) {
    typing.remove();
    state.messages.pop(); persist();
    const el = addMsg(`${esc(err.userMessage || "La connexion a échoué. Vérifiez votre connexion internet et réessayez.")} <button class="retry" type="button">Réessayer</button>`, "bot error");
    el.querySelector(".retry").addEventListener("click", () => { el.previousElementSibling?.remove(); el.remove(); state.busy = false; answer(text); }, { once: true });
  } finally {
    state.busy = false;
    setComposerBusy(false);
  }
}

function setComposerBusy(busy) {
  $("#composer").classList.toggle("busy", busy);
  $$("[data-suggest]").forEach((b) => (b.disabled = busy));
}

function updateMicSend() {
  const btn = $("#mic-or-send");
  const hasText = $("#chat-input").value.trim().length > 0;
  btn.dataset.action = hasText ? "send" : "goto-vocal";
  btn.innerHTML = hasText ? ICONS.send : ICONS.mic;
  btn.setAttribute("aria-label", hasText ? "Envoyer" : "Parler");
}

function resetConversation() {
  state.messages = [];
  state.sessionId = newSessionId();
  store.clear(); persist();
  renderHistory();
  closeAll();
  go("assistant");
}

/* ---------- Recherche détaillée (passe aussi par l'IA) ---------- */
function formQuery() {
  const parts = [state.tx === "Vente" ? "Je veux acheter" : "Je veux louer"];
  parts.push(state.types.size ? [...state.types].join(" ou ").toLowerCase() : "un bien");
  if (state.place) parts.push(state.place.level === "commune" ? `à ${state.place.name}` : `à ${state.place.name} (${state.place.commune})`);
  const desc = $("#search-desc").value.trim();
  return parts.join(" ") + "." + (desc ? " " + desc : "");
}
async function runFormSearch() {
  const box = $("#search-results");
  const btn = $('[data-action="search"]');
  if (btn.disabled) return;
  const q = formQuery();
  btn.disabled = true; btn.textContent = "Recherche en cours…";
  box.innerHTML = '<p class="note">My Key AI cherche les biens qui vous correspondent…</p>';
  try {
    const data = await askAssistant({ sessionId: state.sessionId, message: q, history: [] });
    const listings = Array.isArray(data.listings) ? data.listings : [];
    box.innerHTML = `<div class="msg bot">${esc(data.reply)}</div><div class="results"></div>
      <button class="secondary" data-action="continue-chat">Continuer avec l'assistant</button>`;
    box.querySelector(".results").innerHTML = listings.map(listingCard).join("");
    box.dataset.query = q;
    state.lastSearch = { q, data };
    speak(data.reply);
  } catch (err) {
    box.innerHTML = `<p class="note">${esc(err.userMessage || "La connexion a échoué. Vérifiez votre connexion internet et réessayez.")}</p>`;
  } finally {
    btn.disabled = false; btn.textContent = "Rechercher des biens";
  }
  const sc = box.closest(".scroll"); sc.scrollTo({ top: box.offsetTop - sc.offsetTop - 8, behavior: "smooth" });
}
function continueSearchInChat() {
  const s = state.lastSearch;
  if (s) {
    state.messages.push({ role: "user", content: s.q }, { role: "assistant", content: s.data.reply, listings: s.data.listings || [] });
    persist(); renderHistory();
  }
  go("assistant");
  setTimeout(() => { scrollChat(); $("#chat-input").focus(); }, 50);
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
  if (!SR) return voiceFallback("La reconnaissance vocale n'est pas disponible sur ce navigateur. Tapez votre demande ci-dessous.");
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
      ? "Le micro n'est pas autorisé. Autorisez-le dans le navigateur, ou tapez votre demande." : "Je n'ai pas bien entendu. Réessayez ou tapez votre demande.");
    rec.onend = () => {
      setListening(false);
      const said = (finalText || $("#transcript").textContent).trim();
      if (said) { $("#transcript").textContent = ""; go("assistant"); answer(said); }
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
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    if (!reduce) t += 0.04;
    if ($("#screen-vocal").classList.contains("active") && !document.hidden) requestAnimationFrame(draw);
    else setTimeout(() => requestAnimationFrame(draw), 500);
  };
  draw();
}

/* ---------- Installation (PWA) ---------- */
let installPrompt = null;
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function refreshInstallUI() {
  const show = !isStandalone() && (installPrompt || isIOS());
  $$("[data-action='install']").forEach((b) => b.classList.toggle("hidden", !show));
}
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; refreshInstallUI(); });
window.addEventListener("appinstalled", () => { installPrompt = null; refreshInstallUI(); });
async function install() {
  if (installPrompt) {
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch {}
    installPrompt = null; refreshInstallUI(); closeAll();
  } else {
    closeAll();
    $("#overlay").classList.add("show");
    $("#install-help").classList.add("show");
  }
}

/* ---------- Événements ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action],[data-type],[data-tx],[data-suggest],[data-place],[data-nav]");
  if (!el) return;
  if (el.dataset.nav) return; // lien #hash géré par hashchange
  if (el.dataset.type) { const t = el.dataset.type; state.types.has(t) ? state.types.delete(t) : state.types.add(t); return renderTypeChips(); }
  if (el.dataset.tx) { state.tx = el.dataset.tx; $$("[data-tx]").forEach((b) => { b.classList.toggle("on", b === el); b.setAttribute("aria-selected", b === el); }); return; }
  if (el.dataset.suggest) return answer(el.dataset.suggest);
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
    case "continue-chat": continueSearchInChat(); break;
    case "goto-recherche": go("recherche"); break;
    case "goto-assistant": go("assistant"); break;
    case "goto-vocal": go("vocal"); break;
    case "send": $("#composer").requestSubmit(); break;
    case "voice-stop": stopListening(); break;
    case "install": install(); break;
    case "close-help": $("#install-help").classList.remove("show"); closeAll(); break;
    case "reset": resetConversation(); break;
  }
});
$("#overlay").addEventListener("click", () => { $("#install-help").classList.remove("show"); closeAll(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { $("#install-help").classList.remove("show"); closeAll(); } });
$("#composer").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#chat-input").value.trim();
  if (!v || state.busy) return;
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
paintIcons();
renderTypeChips();
renderSuggestions();
renderHistory();
route();
animateWave();
refreshInstallUI();
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  // Mise à jour automatique : dès qu'une nouvelle version est publiée, l'appli se recharge une fois.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !reloaded && !state.busy) { reloaded = true; location.reload(); }
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((reg) => {
      const check = () => reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
      setInterval(check, 30 * 60 * 1000);
    }).catch(() => {});
  });
}
