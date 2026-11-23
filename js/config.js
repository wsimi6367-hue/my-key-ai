// Configuration de My Key AI.
export const CONFIG = {
  appName: "My Key AI",
  // Adresse du chat IA (workflow n8n « My Key AI – Chat »).
  // Le workflow lit le Google Sheet « Agent Immobilier IA – Base des biens Abidjan » de façon privée
  // et fait répondre Gemini. Le Sheet n'a pas besoin d'être public.
  chatUrl: "https://appn8ncloud81.app.n8n.cloud/webhook/mykey-chat",
  // Relais Google Apps Script (projet « My Key AI relais » du compte Google du propriétaire) :
  // utilisé en premier, car certains wifi bloquent l'adresse n8n. Mettre "" pour le désactiver.
  relayUrl: "https://script.google.com/macros/s/AKfycbz9TeofKXC5du9H6vmFUWOsttXzqhUtFKgXgVJvGFT3Eq4ZrBAVqQWzhLAQRZefwRTv/exec",
  chatTimeoutMs: 60000,
  currency: "FCFA",
  speechLang: "fr-FR",
};
