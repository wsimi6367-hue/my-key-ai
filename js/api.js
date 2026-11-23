// Appel au chat IA (workflow n8n « My Key AI – Chat »).
// Réponse attendue : { reply: string, listings: Bien[], total: number, source: "live" | "error" }
//
// Deux chemins :
//  1. le relais Google Apps Script (CONFIG.relayUrl) — adresse Google rarement bloquée par les wifi ;
//  2. l'adresse directe n8n (CONFIG.chatUrl), en secours si le relais est injoignable.
// Le relais est appelé en « text/plain » (requête simple, sans pré-vérification CORS) :
// c'est ce qu'exige Google Apps Script pour répondre à une page web.
import { CONFIG } from "./config.js";

export function newSessionId() {
  try { if (crypto.randomUUID) return "mk-" + crypto.randomUUID().replace(/-/g, ""); } catch {}
  return "mk-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

function fail(userMessage, detail) {
  const e = new Error(userMessage); e.userMessage = userMessage;
  if (detail) e.detail = `${detail} · ${new Date().toLocaleTimeString("fr-FR")}`;
  return e;
}
const MSG_NET = "Impossible de joindre l'assistant. Vérifiez votre connexion internet et réessayez.";
const MSG_SLOW = "L'assistant met trop de temps à répondre. Réessayez dans un instant.";
const MSG_DOWN = "L'assistant est très demandé en ce moment. Réessayez dans une minute.";
const MSG_BAD = "Réponse inattendue de l'assistant. Réessayez.";

async function post(url, body, { simple, signal }) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": simple ? "text/plain;charset=utf-8" : "application/json" },
    body,
    signal,
    redirect: "follow",
  });
}

export async function askAssistant({ sessionId, message, history, profile }) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw fail("Vous semblez hors ligne. Vérifiez votre connexion internet puis réessayez.");
  }
  const body = JSON.stringify({ sessionId, message, history, ...(profile ? { profile } : {}) });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.chatTimeoutMs);
  const tries = [];
  if (CONFIG.relayUrl) tries.push({ name: "relais", url: CONFIG.relayUrl, simple: true });
  tries.push({ name: "direct", url: CONFIG.chatUrl, simple: false });
  const errors = [];
  try {
    for (const t of tries) {
      let res;
      try {
        res = await post(t.url, body, { simple: t.simple, signal: ctrl.signal });
      } catch (e) {
        if (e.name === "AbortError") throw fail(MSG_SLOW, `${t.name} : délai dépassé`);
        errors.push(`${t.name} : ${e.message || e.name}`);
        continue; // chemin injoignable : on essaie le suivant
      }
      if (!res.ok) {
        // Erreur côté assistant (n8n) : inutile de réessayer par l'autre chemin.
        throw fail(MSG_DOWN, `${t.name} : HTTP ${res.status}`);
      }
      let data;
      try { data = await res.json(); } catch { errors.push(`${t.name} : réponse illisible`); continue; }
      if (data && typeof data.reply === "string") return data;
      if (data && data.error === "assistant") throw fail(MSG_DOWN, `${t.name} : assistant HTTP ${data.status}`);
      errors.push(`${t.name} : ${data && data.error ? data.error : "réponse incomplète"}`);
    }
    throw fail(errors.some((x) => /illisible|incomplète/.test(x)) ? MSG_BAD : MSG_NET, errors.join(" · "));
  } finally {
    clearTimeout(timer);
  }
}
