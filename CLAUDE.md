# My Key AI — notes pour Claude Code

## Le produit
Assistant IA immobilier pour Abidjan (Côte d'Ivoire). Un client demande un bien à louer ou à acheter
(par écrit ou à la voix). L'assistant cherche dans une base Google Sheet et lui renvoie les biens
disponibles qui correspondent, avec photo, prix, lien de l'annonce et contact de l'annonceur.

Ce n'est pas un logiciel de gestion immobilière. Des agents humains remplissent la base à la main
(annonces trouvées sur Facebook, Marketplace, WhatsApp, sites…). L'IA ne fait que lire et proposer.

Langue de l'interface et des réponses : français. Devise : FCFA (XOF).

## État actuel
- `index.html` + `css/styles.css` + `js/*.js` : application web (PWA installable), sans framework ni build.
  Lancer avec un serveur statique : `python3 -m http.server 8000`, puis ouvrir http://localhost:8000.
- 3 écrans, routés par le hash : `#assistant` (chat), `#recherche` (formulaire), `#vocal` (Web Speech API, fr-FR).
- Le chat et la recherche passent par le workflow n8n **« My Key AI – Chat »** (id `iUXATrfSv4ckMzan`),
  webhook `POST https://appn8ncloud81.app.n8n.cloud/webhook/mykey-chat`.
  - Entrée : `{ sessionId, message, history: [{ role: "user"|"assistant", content }] }`.
  - Sortie : `{ reply, listings: Bien[], total, source: "live"|"error" }`.
  - Étapes : contrôle du message (limite 80 messages / session / jour, 3000 / jour au total) →
    lecture brute de l'onglet Biens via l'API Sheets (compte Google de n8n, lecture seule ; la ligne d'en-têtes est retrouvée où qu'elle soit) →
    relecture des colonnes Téléphone/WhatsApp (W:X) en mode formule pour récupérer un numéro affiché « #ERROR! » (numéro tapé avec « + ») →
    catalogue des biens Disponibles trié du plus récent au plus ancien (date de publication, sinon d'enregistrement, sinon position ; 400 max) →
    présélection (« Shrink Catalog ») : seulement les annonces du type / de la transaction demandés (message + 3 derniers messages du client), version courte, 120 max ; tout le catalogue si moins de 4 →
    agent IA (Gemini, modèle `gemini-3-flash-preview`) qui parcourt d'abord les annonces récentes puis remonte vers les plus anciennes, et renvoie `{ ids, reply }` → fiches complètes renvoyées à l'appli.
- Relais Google Apps Script (`relais/Code.gs`, URL dans `CONFIG.relayUrl`) : l'appli l'appelle en premier (POST `text/plain`, sans pré-vérification CORS),
  il transmet à n8n ; si le relais est injoignable, l'appli appelle n8n directement. Raison : certains wifi bloquent l'adresse `*.app.n8n.cloud`.
  Le relais renvoie `{ error: "assistant", status }` si n8n répond en erreur, `{ error: "relais" }` s'il ne joint pas n8n.
- Un `Bien` renvoyé : `id, demo, transaction, type, titre, commune, zone, quartier, repere, prix, periodicite, conditions,
  surface, pieces, chambres, sdb, meuble, equipements, description, publie, contact{nom,typeAnnonceur,telephone,whatsapp,email},
  plateforme, url, image, autresImages`.
- Mémoire : la conversation et le `sessionId` sont gardés dans `localStorage` (l'appli fonctionne aussi sans).
- PWA : `manifest.webmanifest`, `sw.js` (coquille en cache, réseau d'abord, le chat n'est jamais mis en cache),
  icônes dans `icons/`. Bouton « Installer l'application » dans le menu (aide pas à pas sur iPhone).
- Lecture à voix haute des réponses (speechSynthesis) via le bouton haut-parleur : voix française choisie, texte découpé en phrases, déblocage au premier toucher sur mobile, choix gardé dans `localStorage` (`mykeyai.tts`), message de confirmation (`#toast`).
- Comptes utilisateurs (facultatifs) : Firebase Authentication (e-mail ou téléphone + mot de passe) et Firestore.
  - `js/firebase-config.js` : objet `firebaseConfig` du projet Firebase **`my-key-ai`** (forfait Spark gratuit ; connexion e-mail/mot de passe activée ;
    domaine autorisé `wsimi6367-hue.github.io` ; Firestore édition Standard, règles de `firestore.rules` publiées). Si `null`, l'appli marche sans comptes.
  - `js/auth.js` : inscription, connexion, déconnexion, mot de passe oublié (comptes e-mail), conversations du compte.
    Un numéro de téléphone est converti en adresse technique `225XXXXXXXXXX@tel.mykeyai.app`.
  - Fiche Firestore `users/{uid}` : `prenom, nom, commune, identifiant, type ("email"|"tel"), createdAt, updatedAt` (ancien champ `chat` repris une fois).
  - Conversations : `users/{uid}/conversations/{convId}` = `{ title, updatedAt (ms), count, messages (JSON des 40 derniers) }`.
    Menu ☰ > « Mes conversations » (compte connecté) : rouvrir, supprimer ; « Nouvelle conversation » en crée une nouvelle.
    À la déconnexion, la discussion en cours est effacée de l'appareil.
  - Règles de sécurité : `firestore.rules` (chacun ne lit et n'écrit que sa fiche).
  - L'appli envoie `profile: { prenom, commune }` au chat n8n ; l'IA cherche d'abord dans cette commune si la demande ne précise pas de lieu.
- Thème clair / sombre : bouton dans le menu, choix gardé dans `localStorage` (`mykeyai.theme`), attribut `data-theme="light"` sur `<html>` ; couleurs claires en fin de `css/styles.css`. Le logo est un masque CSS (`.logo-mark`) coloré par `--logo-color`.
- Écran d'ouverture animé (`#splash` dans `index.html`, styles en fin de `css/styles.css`) : vert vif #00ff00 + logo blanc, puis blanc + logo vert #009a44, slogan « Une solution en 1 clic ! », cercle de chargement qui tourne ; environ 4,5 s (minimum 4 s demandé), puis fondu vers l'appli (un clic le passe).

## Veille (surveillance)
- Workflow n8n **« My Key AI – Veille »** (id `WSntB0fKJzqxrTNw`), webhook `POST /webhook/mykey-veille` protégé par un jeton
  (le jeton est dans la tâche planifiée de Claude, pas dans ce dépôt). Il analyse l'onglet Biens (en-têtes, cases en erreur,
  doublons, infos manquantes, biens non vérifiés depuis 14 jours, limites) et vérifie le relais Google.
- Tâche planifiée Claude « Veille My Key AI » : tous les jours à 7h44 et 18h44 (heure d'Abidjan). Elle contrôle aussi
  les erreurs n8n (quota Gemini…), le déploiement GitHub Pages, les permissions du Sheet et l'absence de secrets dans le code,
  puis signale les problèmes. Aucune correction sans l'accord (OKAY) du propriétaire.

## Fichiers
- `js/config.js` : adresse du chat n8n, délai, langue.
- `js/api.js` : appel au chat (relais Google puis n8n direct) et messages d'erreur.
- `js/app.js` : interface, navigation, chat, fiches de biens, choix du lieu, vocal, installation.
- `js/geo.js` : référentiel Commune > Zone > Quartier (14 communes du District d'Abidjan). Doit rester identique à l'onglet « Quartiers » du Sheet.
- `js/search.js` : liste des lieux pour le sélecteur (`PLACES`, `norm`). Ses fonctions de recherche par règles ne sont plus utilisées par l'interface.
- `js/icons.js` : icônes SVG.
- `img/logo.png` : logo (maison + signature, fond transparent), utilisé comme masque CSS au-dessus du mot « my key ai » et dans l'écran d'ouverture.

## La base Google Sheet
Fichier : « les biens data base » (anciennement « Agent Immobilier IA – Base des biens Abidjan »)
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
1. Remplir le Sheet avec de vraies annonces (le fichier de biens DÉMO a été supprimé le 20/11/2026).
2. **Canal WhatsApp** : WhatsApp Business Cloud API dans n8n, branché sur le même workflow.
3. Script Apps Script dans le Sheet pour remplir automatiquement ID et date d'enregistrement.
4. Recherche par photo (bouton appareil photo) : non implémentée, affiche un message.
5. Présélection par type déjà en place ; si la base dépasse plusieurs centaines de biens d'un même type, filtrer aussi par commune et budget.

## Conventions
- Interface en français, tutoiement interdit (vouvoiement).
- Thème : fond #050505, vert #5bea5b, surfaces #151515 / #1d1d1d, bords #2a2a2a, police Inter, logo en Nunito 900.
- Tester les écrans à 390 × 844.
