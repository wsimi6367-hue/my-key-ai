// Appel au chat IA (workflow n8n « My Key AI – Chat »).
// Réponse attendue : { reply: string, listings: Bien[], total: number, source: "live" | "error" }
import { CONFIG } from "./config.js";

export function newSessionId() {
  try { if (crypto.randomUUID) return "mk-" + crypto.randomUUID().replace(/-/g, ""); } catch {}
  return "mk-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

function fail(userMessage) { const e = new Error(userMessage); e.userMessage = userMessage; return e; }

export async function askAssistant({ sessionId, message, history, profile }) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw fail("Vous semblez hors ligne. Vérifiez votre connexion internet puis réessayez.");
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.chatTimeoutMs);
  let res;
  try {
    res = await fetch(CONFIG.chatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message, history, ...(profile ? { profile } : {}) }),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw fail(e.name === "AbortError"
      ? "L'assistant met trop de temps à répondre. Réessayez dans un instant."
      : "Impossible de joindre l'assistant. Vérifiez votre connexion internet et réessayez.");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw fail("L'assistant est momentanément indisponible. Réessayez dans quelques minutes.");
  let data;
  try { data = await res.json(); } catch { throw fail("Réponse inattendue de l'assistant. Réessayez."); }
  if (!data || typeof data.reply !== "string") throw fail("Réponse inattendue de l'assistant. Réessayez.");
  return data;
}
