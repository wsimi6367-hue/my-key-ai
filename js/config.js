// Configuration de My Key AI.
export const CONFIG = {
  appName: "My Key AI",
  // ID du Google Sheet « Agent Immobilier IA – Base des biens Abidjan »
  sheetId: "10gUFQ44l1SUuitSkhM0uYSMCtsmrJbXk7lHITNVbqAY",
  sheetTab: "Biens",
  // Lecture directe du Sheet (le Sheet doit être partagé « Tous les utilisateurs disposant du lien »).
  // En production, passer plutôt par une API (voir CLAUDE.md) pour ne pas exposer les contacts.
  useLiveSheet: true,
  currency: "FCFA",
  maxResults: 6,
  speechLang: "fr-FR",
};
