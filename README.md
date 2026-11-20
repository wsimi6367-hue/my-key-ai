# My Key AI

Assistant IA pour trouver un bien à louer ou à acheter à Abidjan. Application web installable
sur PC (Chrome, Edge) et sur téléphone (Android, iPhone).

## Comment ça marche
```
Appli (ce dossier)  ──POST {sessionId, message, history}──▶  n8n « My Key AI – Chat »
                                                              ├─ lit le Google Sheet des biens (privé)
                                                              ├─ Gemini choisit les biens et répond
◀── {reply, listings[], total, source} ───────────────────────┘
```
- Le Google Sheet « Agent Immobilier IA – Base des biens Abidjan » reste privé : seul n8n le lit.
- Seuls les biens `Disponibilité = Disponible` sont proposés. Les lignes dont le titre commence par « EXEMPLE » sont ignorées.
- Le fichier « My Key AI – Biens DÉMO » ajoute 14 biens fictifs pour tester. **Supprimez-le avant le lancement** : les biens DÉMO disparaissent aussitôt.

## Lancer en local
```
python3 -m http.server 8000
```
Puis ouvrir http://localhost:8000.

## Mettre en ligne
N'importe quel hébergement statique en https (GitHub Pages, Netlify…). Le https est obligatoire
pour l'installation et pour le micro.

## Les 3 écrans
- `#assistant` : discuter avec l'assistant (écran d'accueil). La conversation est gardée sur l'appareil.
- `#recherche` : recherche détaillée (Acheter/Louer, lieu, types, description), traitée aussi par l'IA.
- `#vocal` : parler à l'assistant (Chrome ou Safari, micro autorisé).
