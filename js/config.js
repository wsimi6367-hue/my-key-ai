// Configuration de My Key AI.
export const CONFIG = {
  appName: "My Key AI",
  // Adresse du chat IA (workflow n8n « My Key AI – Chat »).
  // Le workflow lit le Google Sheet « Agent Immobilier IA – Base des biens Abidjan » de façon privée
  // et fait répondre Gemini. Le Sheet n'a pas besoin d'être public.
  chatUrl: "https://appn8ncloud81.app.n8n.cloud/webhook/mykey-chat",
  chatTimeoutMs: 60000,
  currency: "FCFA",
  speechLang: "fr-FR",
};
