# Entraîneur de fluidité — Français

Un **coach de français parlé** sous forme de site web, mobile-first. Chaque
séance est une boucle d'apprentissage fermée : l'application donne du contenu →
tu essaies de le récupérer → tu parles → tu bloques → l'application mémorise le
blocage et te le représente plus tard. Aucun compte, aucun serveur : tout
fonctionne sur GitHub Pages.

Application déployée : https://brahmiamine.github.io/fr/

## Le principe

Une séance (≈ 35 min) suit un parcours guidé en 5 étapes :

| Étape | Durée |
|---|---:|
| Chunks + récupération espacée | 5–7 min |
| 4 → 3 → 2 + transfert | 12–15 min |
| Questions surprises | 8–10 min |
| Trous de mots / paraphrase | 5 min |
| Feedback final | 2–3 min |

Le contenu n'est **jamais tiré au hasard** : il suit les priorités

1. éléments arrivés à date de révision ;
2. trous de mots personnels ;
3. chunks récemment difficiles ;
4. sujets non vus récemment ;
5. nouveau contenu.

### La boucle entre les journées

- **Chunks** : tu retrouves une expression à partir de son intention, puis tu la
  notes *Facile* (revoir J+7), *Difficile* (J+3) ou *Raté* (J+1). Les 2 chunks
  travaillés deviennent tes « chunks du jour », rappelés pendant le 4→3→2 et les
  questions.
- **Trous de mots** : quand tu bloques sur un mot, il rejoint ta base
  personnelle et revient demain → dans 3 jours → dans 7 jours, jusqu'à être
  maîtrisé. Les mots génériques de `paraphrase-words.json` complètent la liste
  tant que ta base personnelle est vide (≈ 70 % perso / 30 % générique).
- **Questions surprises** : préparation adaptée au niveau (10 s / 5 s / 3 s),
  puis auto-évaluation du blocage. La question la plus difficile revient en
  « revanche ».
- **Enregistrement audio** : optionnel, via `MediaRecorder`, disponible
  uniquement pendant la séance puis supprimé. Rien de volumineux n'est écrit
  dans le stockage local.

## Démarrage local

Prérequis : Node.js 20+ et npm.

```bash
npm install
npm run dev        # serveur de développement
npm test -- --run  # tests une seule fois
npm run build      # build de production dans dist/
npm run preview    # prévisualiser le build
```

## Contenu pédagogique

Tout le contenu est statique et vit dans `src/data/`. Ajouter du contenu ne
demande aucune modification du code applicatif.

| Fichier | Rôle |
| --- | --- |
| `src/data/topics.json` | Sujets de l'exercice 4 → 3 → 2 |
| `src/data/questions.json` | Questions surprise |
| `src/data/paraphrase-words.json` | Mots génériques à paraphraser |
| `src/data/native-expressions.json` | Chunks (expressions) à récupérer |

### Schémas

```jsonc
// topics.json
{
  "id": "t001",
  "title": "Télétravail ou bureau ?",
  "category": "travail",
  "difficulty": "medium",       // "easy" | "medium" | "hard"
  "prompts": ["Question 1", "Question 2"],   // des "pistes", jamais de réponse
  "transferPrompt": "Sujet proche pour la manche de transfert"
}

// questions.json
{ "id": "q001", "text": "…", "category": "societe", "difficulty": "medium" }

// paraphrase-words.json
{ "id": "w001", "word": "embouteillage", "category": "quotidien", "difficulty": "easy" }

// native-expressions.json (chunks)
{ "id": "chunk_001", "intent": "Nuancer une opinion", "expression": "D'un autre côté…", "category": "opinion", "level": "B2" }
```

### Ajouter du contenu

1. Ouvre le fichier JSON correspondant.
2. Ajoute un objet avec un `id` **unique**.
3. Sauvegarde : c'est tout.

Les `id` doivent rester uniques dans toute la durée de vie de l'application :
l'historique et l'anti-répétition s'appuient dessus. Si un `id` est réutilisé,
d'anciennes données peuvent être considérées comme déjà vues.

## Stockage local et confidentialité

- Aucune donnée ne quitte l'appareil.
- Tout est stocké dans `localStorage` sous la clé `fr-fluency-trainer`, dans un
  schéma versionné (`version: 2`, avec migration depuis la v1).
- Données conservées : sessions terminées, tests hebdomadaires, **trous de
  mots** (`wordGaps`), **révisions de chunks** (`chunkReviews`), exemples
  personnels, contenus récents et session en cours.
- Si `localStorage` est indisponible, l'entraînement continue en mémoire et un
  avertissement non bloquant s'affiche.

## Tests

La suite Vitest + React Testing Library couvre notamment :

- sélection de contenu par priorité, sans doublon et avec anti-répétition ;
- ordonnanceur de révision espacée (chunks et trous de mots) ;
- persistance et migration du schéma local (v1 → v2) ;
- précision, pause/reprise et récupération après rafraîchissement des minuteurs ;
- calcul des séries, de la progression hebdomadaire et des minutes totales ;
- machine à états de la session complète (chunks, 4→3→2, questions + revanche,
  trous de mots, feedback) et parcours de bout en bout.

## Déploiement

Le workflow `.github/workflows/deploy-pages.yml` exécute les tests, construit
l'application et la publie sur GitHub Pages à chaque push sur `main`.

Vite est configuré avec `base: '/fr/'` pour respecter le chemin du dépôt.
Dans les paramètres GitHub du dépôt, la source Pages doit être **GitHub Actions**.

## Interface web

L'application se présente comme un **site web** responsive, et non comme une
application installable :

- en-tête de site avec marque et navigation en haut (Accueil / Progression) ;
- contenu dans une colonne centrée, pied de page, défilement de page classique ;
- pendant une session, la navigation est réduite pour rester concentré sur la
  tâche, et le pied de page est masqué ;
- aucune PWA, aucun service worker, aucune installation ni mode plein écran.

Le site reste **mobile-first** : styles de base pensés pour le téléphone, puis
élargissement progressif sur tablette et ordinateur. Les champs passent à
`font-size: 16px` pour éviter le zoom automatique sur iOS, les cibles tactiles
font au moins 44 px et le délai de tap de 300 ms est supprimé.



