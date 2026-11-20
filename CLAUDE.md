# My Key AI — notes pour Claude Code

## Le produit
Assistant IA immobilier pour Abidjan (Côte d'Ivoire). Un client demande un bien à louer ou à acheter
(par écrit ou à la voix). L'assistant cherche dans une base Google Sheet et lui renvoie les biens
disponibles qui correspondent, avec photo, prix, lien de l'annonce et contact de l'annonceur.

Ce n'est pas un logiciel de gestion immobilière. Des agents humains remplissent la base à la main
(annonces trouvées sur Facebook, Marketplace, WhatsApp, sites…). L'IA ne fait que lire et proposer.

Langue de l'interface et des réponses : français. Devise : FCFA (XOF).

## État actuel (prototype)
- `index.html` + `css/styles.css` + `js/*.js` : application web mobile, sans framework ni build.
  Lancer avec un serveur statique : `python3 -m http.server 8000`, puis ouvrir http://localhost:8000.
- 3 écrans (maquettes fournies par le client), routés par le hash :
  - `#recherche` : formulaire (Acheter/Louer, choix commune > zone > quartier, types, description, bouton).
  - `#assistant` : chat avec suggestions, saisie, bouton + (vers recherche), photo, micro.
  - `#vocal` : reconnaissance vocale (Web Speech API, fr-FR), onde animée, bascule vers le chat.
- Bouton haut-parleur : lit les réponses à voix haute (speechSynthesis).
- La « compréhension » des demandes est faite par des règles (`js/search.js`), pas encore par un LLM.
- Données : `js/data.js` lit le Google Sheet en CSV (endpoint gviz) si le Sheet est public,
  sinon bascule sur 14 biens fictifs de démonstration.

## Fichiers
- `js/config.js` : ID du Sheet, onglet, options.
- `js/geo.js` : référentiel Commune > Zone > Quartier (14 communes du District d'Abidjan). Doit rester identique à l'onglet « Quartiers » du Sheet.
- `js/data.js` : chargement des biens (Sheet ou démo), normalisation des champs.
- `js/search.js` : `parseQuery(texte)` -> critères ; `searchListings(biens, critères)` -> résultats (avec élargissement progressif : quartier -> zone -> commune, budget +15 %) ; textes de réponse.
- `js/app.js` : interface, navigation, chat, choix du lieu, vocal.
- `js/icons.js` : icônes SVG et logo (boucles vertes).

## La base Google Sheet
Fichier : « Agent Immobilier IA – Base des biens Abidjan »
ID : `10gUFQ44l1SUuitSkhM0uYSMCtsmrJbXk7lHITNVbqAY`. Onglets : Guide, Tableau de bord, Biens, Quartiers, Listes, Recherche.

Onglet `Biens`, une ligne par bien, en-têtes exacts (ligne 1) :
ID · Saisi par · Date et heure d'enregistrement · Transaction (Location|Vente) · Type de bien ·
Titre / résumé · Localisation (choisir) · Commune (formule) · Zone (formule) · Repère / adresse · Prix ·
Périodicité · Conditions (caution, avance…) · Surface (m²) · Pièces · Chambres · Salles de bain · Meublé ·
Équipements · Description · Publié par (nom) · Type d'annonceur · Téléphone · WhatsApp · Email ·
Plateforme · URL de la publication · Date et heure de publication · Image principale (URL) ·
Autres images (URL) · Disponibilité (Disponible|À vérifier|Réservé|Loué / vendu|Retiré) ·
Dernière vérification · Notes

« Localisation (choisir) » vaut `Commune – Zone – Quartier` (ou `Commune – Quartier` quand la commune n'a qu'une zone).
Ne proposer au client que les lignes `Disponibilité = Disponible`.

## Prochaines étapes proposées
1. **API serveur** (Node/Express, ou fonction serverless) qui lit le Sheet avec un compte de service
   Google (API Sheets, lecture seule) et met les biens en cache quelques minutes. Ne pas rendre le Sheet
   public en production : il contient les numéros des annonceurs.
2. **Vrai LLM** : endpoint `/api/chat` qui appelle l'API Claude avec un outil `search_properties`
   (paramètres : transaction, types, commune, zone, quartier, budget_max, chambres_min, meuble).
   Le modèle extrait les critères, l'outil appelle `searchListings`, le modèle rédige la réponse en français.
   Garder `parseQuery` comme repli si l'API est indisponible.
3. **Canal WhatsApp** (probablement le canal principal à Abidjan) : WhatsApp Business Cloud API ou n8n,
   branché sur le même `/api/chat`.
4. **Application mobile** : soit PWA (manifest + service worker), soit encapsulation Capacitor,
   soit portage React Native/Expo en gardant `search.js` et `geo.js`.
5. Script Apps Script dans le Sheet pour remplir automatiquement ID et date d'enregistrement.
6. Recherche par photo (bouton appareil photo) : non implémentée, affiche un message.

## Conventions
- Interface en français, tutoiement interdit (vouvoiement).
- Thème : fond #050505, vert #5bea5b, surfaces #151515 / #1d1d1d, bords #2a2a2a, police Inter, logo en Nunito 900.
- Tester les écrans à 390 × 844.
