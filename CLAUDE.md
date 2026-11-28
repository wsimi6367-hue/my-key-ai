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
    catalogue des biens Disponibles trié du plus récent au plus ancien (date de publication, sinon d'enregistrement, sinon position ; 10 000 max) →
    recherche par le système (« Shrink Catalog ») dans TOUTES les annonces, d'après le message (+ les 3 derniers messages du client pour ce qui manque) :
    ville, commune / zone / quartier (vocabulaire tiré des annonces), type de bien, location longue durée / courte durée / vente
    (un budget sans précision = loyer au mois, ou achat s'il dépasse 5 M ; une annonce à la nuit n'est jamais proposée pour un loyer mensuel),
    budget (« 60000F », « 60 000 », « 60k », « 60 mille », « 13M », « entre … et … », « au moins … »), pièces, chambres,
    meublé : les biens meublés ne sont proposés QUE si le client dit « meublé » ou demande une location à la nuit / au séjour (jamais mélangés aux locations au mois, demande du propriétaire),
    fautes courantes comprises (« apartement », « 03 pièces »),
    Type de bien écrit hors menu dans le Sheet reconnu (« boutique », « local commercial », « Villa duplex », « Immeuble »…),
    nombre de biens demandé (« 10 studios », « donne-moi 10 … » ; 6 par défaut, 12 max ; l'interface affiche toutes les fiches reçues). Chaque annonce reçoit une étiquette : ★ CORRESPOND (tout respecté),
    ★ correspond mais prix ou détails à confirmer, lieu voisin, budget dépassé de 15 % au plus, approchant,
    commune voisine dans le budget (Bingerville ↔ Cocody, Yopougon ↔ Songon / Attécoubé…), même lieu mais jusqu'à 50 % plus cher. « encore » / « d'autres » :
    les annonces déjà montrées dans la conversation sont écartées. 120 lignes max envoyées à l'IA →
    agent IA (Gemini, modèle `gemini-3-flash-preview`) qui propose d'abord les ★ CORRESPOND jusqu'au nombre demandé, et renvoie `{ ids, reply }` →
    « Shape Reply » : garantie que les ★ CORRESPOND passent en premier jusqu'au nombre demandé (sinon il complète la liste et réécrit le message) →
    fiches complètes renvoyées à l'appli.
    Secours : si Gemini échoue (quota 429, panne), « Shape Reply » renvoie les meilleures annonces trouvées par le système avec un message d'excuse (`source: "secours"`).
    Lecture du Sheet limitée à 10 000 lignes (chat, veille, correcteur).
- Relais Google Apps Script (`relais/Code.gs`, URL dans `CONFIG.relayUrl`) : l'appli l'appelle en premier (POST `text/plain`, sans pré-vérification CORS),
  il transmet à n8n ; si le relais est injoignable, l'appli appelle n8n directement. Raison : certains wifi bloquent l'adresse `*.app.n8n.cloud`.
  Le relais renvoie `{ error: "assistant", status }` si n8n répond en erreur, `{ error: "relais" }` s'il ne joint pas n8n.
- Un `Bien` renvoyé : `id, demo, transaction, typeTx, type, categorie, standing, capacite, titre, ville, commune, zone, quartier, repere, prix, periodicite, conditions,
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
- Tâche planifiée Claude « Veille My Key AI » : tous les jours à 7h44 et 18h44 (heure d'Abidjan). Elle applique les corrections sûres (voir plus bas) et contrôle aussi
  les erreurs n8n (quota Gemini…), le déploiement GitHub Pages, les permissions du Sheet et l'absence de secrets dans le code,
  puis signale les problèmes. Aucune correction sans l'accord (OKAY) du propriétaire.

## Corrections automatiques
- Workflow n8n **« My Key AI – Corrections »** (id `bgQLIoCGWLElRmUz`), webhook `POST /webhook/mykey-corrections` protégé par un jeton
  (dans la tâche planifiée de Claude, pas dans ce dépôt). Le compte n8n est donc **Éditeur** du Sheet (accord du propriétaire, 24/11/2026).
  - `{mode:"auto", dryRun:true}` : liste les corrections sûres sans écrire ; `{mode:"auto", maxWrites:N}` : écrit (rien si plus de N).
  - Corrige seulement : Commune / Zone / Ville d'après la Localisation (onglet Quartiers), Localisation ou valeur de menu mal écrite
    (accents, tirets, ancien format « Bingerville – Bingerville – … », 1 lettre d'écart et une seule possibilité), cases vides déductibles
    (Ville, Type de location / vente, Catégorie). Écrit en RAW, uniquement les cellules concernées. Le reste est renvoyé dans `aSignaler`.
  - Type de location / vente et Catégorie hors menu (ex. « Location », « Villa ») sont remplacés par la valeur déduite (Transaction / Périodicité, Type de bien).
  - Type de bien (accord « OKAY type de bien », 28/11/2026) : « boutique », « local commercial », « magasin » → « Magasin / local commercial » ;
    « Villa duplex », « Duplex villa » → « Duplex ». « Résidence », « Townhouse » restent signalés (pas de valeur sûre).
  - Une ligne dont la Disponibilité est invalide (signe d'un décalage de colonnes) n'est jamais corrigée automatiquement : elle est signalée.
  - `{cells:[{range, old, new}], input:"RAW"|"USER_ENTERED"}` : correction précise de cellules (50 max par appel), écrite seulement si la valeur actuelle = `old`.
    USER_ENTERED pour les dates / nombres (Sheet en fr_FR), RAW pour les téléphones (sinon le « + » devient une formule #ERROR!).
- La veille l'appelle : essai à blanc → relecture → écriture → nouvel essai à blanc (doit donner 0). Jamais de suppression, ni prix,
  contact, disponibilité ou lieu deviné sans OKAY du propriétaire.

## Ajout des biens (point d'entrée unique)
- Workflow n8n **« My Key AI – Ajouter un bien »** (id `UTldi921iLmNPQk2`), webhook `POST /webhook/mykey-ajouter-bien`, protégé par un jeton
  (donné à l'IA de saisie, pas dans ce dépôt). Corps : `{ token, biens: [ { "<titre de colonne>": valeur, … } ], dryRun? }` (50 biens max).
- Il refuse un bien sans titre, sans lien http, sans Transaction ou Type de bien valides, ou dont le lien existe déjà
  (sauf `"doublonAutorise": true` pour une publication qui présente plusieurs biens).
- Il normalise les menus (majuscules, alias « Standard », « Résidentiel »…), la Localisation (Commune / Zone / Ville d'après Quartiers),
  les nombres (« 350 000 », « 13M »), les dates (ISO ou jj/mm/aaaa), protège les téléphones (« ' » devant « + »), donne l'ID (plus grand + 1)
  et ajoute TOUJOURS après la dernière ligne remplie (append INSERT_ROWS, USER_ENTERED) : il ne peut pas écraser une ligne.
- Réponse : `{ ecrit, lignes, ajoutes:[{id,titre}], refuses:[{raison}], avertissements }`.
- Incident du 25/11/2026 : l'IA de saisie, qui écrivait directement, a écrasé les lignes 2 à 22 ; restauration le 26/11 depuis une copie
  (biens d'origine remis en place, biens écrasants recopiés en fin de tableau, ID BIEN-1233 à 1253).
  Nouveaux écrasements le 26/11 15h20 et le 27/11 9h20 (lignes 2 à 16) ; réparés le 27/11 au soir (BIEN-1610…1624 recopiés en BIEN-1713…1727).

## Gardien anti-écrasement
- Workflow n8n **« My Key AI – Gardien »** (id `8jAkBKBfMlKhBQyw`), actif depuis le 27/11/2026 (accord du propriétaire) :
  toutes les 30 minutes, plus webhook `POST /webhook/mykey-gardien` protégé par un jeton (`{token, dryRun?}`, jeton hors dépôt).
- Il compare l'onglet Biens à la copie de référence « My Key AI – Gardien (copie de référence, ne pas modifier) »
  (ID `1-ktuFROd2SfG_BbY-zgMxr9TdagsEylyQMzv4sJNxH4`, partagée avec le compte n8n). Écrasement = même ligne, autre ID et autre
  titre + URL, et l'ancien bien n'existe plus nulle part. Alors : le bien écrasant est recopié en fin de tableau avec un nouvel ID,
  puis l'ancien est remis à sa place (seulement si la ligne n'a pas changé entre-temps). Plus de 60 lignes touchées → il ne fait rien et signale.
- Jamais de suppression. Une insertion ou un simple déplacement de lignes n'est pas un écrasement. Après chaque passage, la copie de
  référence est réécrite ; un onglet « Journal » de la copie garde chaque réparation.

## Fichiers
- `js/config.js` : adresse du chat n8n, délai, langue.
- `js/api.js` : appel au chat (relais Google puis n8n direct) et messages d'erreur.
- `js/app.js` : interface, navigation, chat, fiches de biens, choix du lieu, vocal, installation.
- `js/geo.js` : référentiel Commune > Zone > Quartier (14 communes du District d'Abidjan, puis les autres villes). Doit rester identique à l'onglet « Quartiers » du Sheet.
- `js/search.js` : liste des lieux pour le sélecteur (`PLACES`, `norm`). Ses fonctions de recherche par règles ne sont plus utilisées par l'interface.
- `js/icons.js` : icônes SVG.
- `img/logo.png` : logo (maison + signature, fond transparent), utilisé comme masque CSS au-dessus du mot « my key ai » et dans l'écran d'ouverture.

## La base Google Sheet
Fichier : « les biens data base » (anciennement « Agent Immobilier IA – Base des biens Abidjan »)
ID : `10gUFQ44l1SUuitSkhM0uYSMCtsmrJbXk7lHITNVbqAY`. Onglets : Guide, Tableau de bord, Biens, Quartiers, Listes, Recherche.

Onglet `Biens`, une ligne par bien, en-têtes exacts (ligne 1) :
ID · Saisi par · Date et heure d'enregistrement · Transaction (Location|Vente) · Type de bien ·
Titre / résumé · Localisation (choisir) · Commune · Zone · Repère / adresse · Prix ·
Périodicité · Conditions (caution, avance…) · Surface (m²) · Pièces · Chambres · Salles de bain · Meublé ·
Équipements · Description · Publié par (nom) · Type d'annonceur · Téléphone · WhatsApp · Email ·
Plateforme · URL de la publication · Date et heure de publication · Image principale (URL) ·
Autres images (URL) · Disponibilité (Disponible|À vérifier|Réservé|Loué / vendu|Retiré) ·
Dernière vérification · Notes · Ville (AH) · Type de location / vente (AI : Location longue durée|Location courte durée|Vente) ·
Catégorie (AJ : Habitation|Hébergement|Commercial / professionnel|Terrain|Événementiel|Autre) · Standing (AK : Économique|Moyen standing|Haut standing|Luxe) ·
Capacité (personnes) (AL)

Colonnes AH–AL ajoutées le 24/11/2026 (sauvegarde avant changement : « SAUVEGARDE 24-11-2026 – les biens data base (avant restructuration) »).
Listes déroulantes non strictes alimentées par l'onglet Listes (colonnes J–M). Si Ville ou Type de location / vente est vide,
n8n le déduit (commune d'Abidjan → Abidjan ; Périodicité Journalier/Hebdomadaire → courte durée ; Transaction Vente → Vente).
Onglet Quartiers : colonne E « Ville » ; autres villes (Grand-Bassam, Assinie, Bonoua, Jacqueville, Dabou, Sikensi, Yamoussoukro,
Fresco, Sassandra, San-Pédro, Bouaké, Korhogo) en fin d'onglet, au format « Ville – Quartier » avec Commune = Zone = Ville.
Une seule table pour tout (pas de fichiers séparés par ville ou par type) : le filtrage se fait dans n8n.
ATTENTION : Commune (H) et Zone (I) sont des valeurs écrites, PAS des formules : elles ne suivent pas la Localisation toute seule.
Les valeurs doivent être écrites exactement comme dans les menus (onglet Listes). Ville : les 14 communes d'Abidjan (dont Bingerville) = « Abidjan ».
Le Sheet est aussi rempli par une IA de saisie externe (hors n8n) : ne jamais déplacer, trier ou supprimer de lignes ou de colonnes.

« Localisation (choisir) » vaut `Commune – Zone – Quartier` (ou `Commune – Quartier` quand la commune n'a qu'une zone).
Ne proposer au client que les lignes `Disponibilité = Disponible`.

## Prochaines étapes proposées
1. Remplir le Sheet avec de vraies annonces (le fichier de biens DÉMO a été supprimé le 20/11/2026).
2. **Canal WhatsApp** : WhatsApp Business Cloud API dans n8n, branché sur le même workflow.
3. Script Apps Script dans le Sheet pour remplir automatiquement ID et date d'enregistrement.
4. Recherche par photo (bouton appareil photo) : non implémentée, affiche un message.
5. Recherche par lieu, budget, pièces et meublé en place (27/11/2026) ; au-delà de quelques milliers de biens, passer à une vraie base (Firestore) remplie depuis le Sheet.

## Conventions
- Interface en français, tutoiement interdit (vouvoiement).
- Thème : fond #050505, vert #5bea5b, surfaces #151515 / #1d1d1d, bords #2a2a2a, police Inter, logo en Nunito 900.
- Tester les écrans à 390 × 844.
