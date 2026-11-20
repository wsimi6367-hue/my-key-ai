# My Key AI

Assistant IA pour trouver un bien à louer ou à acheter à Abidjan.

## Lancer le prototype
```
cd my-key-ai
python3 -m http.server 8000
```
Puis ouvrir http://localhost:8000 (sur téléphone : même réseau Wi-Fi, http://<ip-de-l-ordinateur>:8000).

## Les 3 écrans
- `#assistant` : discuter avec l'assistant (écran d'accueil).
- `#recherche` : recherche détaillée avec choix de la commune et du quartier.
- `#vocal` : parler à l'assistant (Chrome ou Safari, micro autorisé).

## Brancher le Google Sheet
Pour un essai rapide : partager le Sheet en « Tous les utilisateurs disposant du lien : lecteur ».
L'app lit alors l'onglet `Biens` en direct. Sinon, elle affiche des biens de démonstration.
En production, passer par une API (voir CLAUDE.md).

## Continuer avec Claude Code
Ouvrir ce dossier dans Claude Code : le fichier `CLAUDE.md` décrit le projet, la base de données et les prochaines étapes.
