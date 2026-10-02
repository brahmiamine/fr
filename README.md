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

- **Chunks** : tu retrouves une expression à partir de son intention. Une
  récupération réussie suit ensuite la progression complète
  aujourd'hui → J+1 → J+3 → J+7 avant maîtrise ; un échec la fait revenir le
  lendemain. Les 2 chunks travaillés deviennent tes « chunks du jour », rappelés
  pendant le 4→3→2 et les questions.
- **Trous de mots** : quand tu bloques sur un mot, il rejoint ta base
  personnelle et revient demain → dans 3 jours → dans 7 jours, jusqu'à être
  maîtrisé. Les mots génériques de `paraphrase-words.json` complètent la liste
  tant que ta base personnelle est vide (≈ 70 % perso / 30 % générique).
- **Questions surprises** : préparation automatiquement progressive (10 s au début, 5 s après 5 séances, 3 s après 15), diversité de catégories privilégiée, puis auto-évaluation du blocage. La question la plus difficile revient en « revanche » ; au niveau avancé, la dernière réponse dure 60 s puis enchaîne sur un pivot surprise de 30 s.
- **Enregistrement audio** : optionnel, via `MediaRecorder`. Le premier tour reste disponible au mini-feedback puis au feedback final pour permettre la réécoute différée ; l'audio reste uniquement en mémoire et est supprimé quand la page est quittée.
- **Boucle personnalisée** : mots manquants + contexte, formulations corrigées et expressions utiles sont réinjectés dans de futures séances. L'application demande la correction à réutiliser plutôt que de mémoriser l'erreur brute ; les expressions utiles deviennent des chunks personnels.
- **Transfert réel** : un défi hebdomadaire exige au moins 20 min de vraie conversation puis réinjecte les corrections et blocages observés dans l'entraînement.
- **Mesure hebdomadaire** : le benchmark de fluidité dure réellement 3 minutes complètes avant d'ouvrir le formulaire de mesures, afin de garder des conditions comparables.

## Sonner plus naturel (prosodie)

La route `/prosody` travaille une **deuxième compétence**, séparée de la fluidité :
le rythme et l'intonation. Une boucle d'environ 12–15 minutes :

> entendre → découper → imiter (V1) → shadowing → comparer A/B/A → choisir **une**
> différence → refaire (V2) → comparer V1/V2 → retelling (reformuler sans le modèle).

Le contenu vit dans `src/data/prosody.json` (transcription, groupes rythmiques
avec `/`, `↑`, `↓`, `—`, segment d'imitation, idée de retelling). L'audio du
modèle est dans `public/audio/prosody/`.

> Les fichiers `.wav` livrés sont des **silences de durée correcte** générés par
> `node scripts/generate-prosody-audio.mjs` : remplace-les par de vrais
> enregistrements (n'importe quel format lu par le navigateur) en gardant les
> mêmes noms. Aucun enregistrement personnel n'est conservé : les prises V1/V2
> restent en mémoire et sont révoquées à la sortie de la page.

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

Tout le contenu pédagogique variable est statique et vit dans `src/data/`. Les grandes bases couvrent les sujets 4→3→2, questions surprises, mots de paraphrase, chunks, amorces de réponse et structures anti-blocage.

| Fichier | Rôle |
| --- | --- |
| `src/data/topics.json` | Sujets de l'exercice 4 → 3 → 2 |
| `src/data/questions.json` | Questions surprise |
| `src/data/paraphrase-words.json` | Mots génériques à paraphraser |
| `src/data/native-expressions.json` | Chunks (expressions) à récupérer |
| `src/data/question-starters.json` | Amorces naturelles pour démarrer une réponse |
| `src/data/rescue-structures.json` | Structures de circumlocution quand un mot manque |
| `src/data/prosody.json` | Extraits audio + groupes rythmiques pour la prosodie |

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
- Tout est stocké dans `localStorage` sous la clé `fr-fluency-trainer`, dans un schéma versionné (`version: 3`, avec migration depuis les v1 et v2).
- Données conservées : sessions terminées, tests hebdomadaires, **trous de
  mots** (`wordGaps`), **révisions de chunks** (`chunkReviews`), exemples
  personnels, contenus récents et session en cours.
- Si `localStorage` est indisponible, l'entraînement continue en mémoire et un
  avertissement non bloquant s'affiche.

## Tests

La suite Vitest + React Testing Library couvre notamment :

- sélection de contenu par priorité, sans doublon et avec anti-répétition ;
- ordonnanceur de révision espacée (chunks et trous de mots) ;
- persistance et migration du schéma local (v1/v2 → v3) ;
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

### Design & animations

- Palette indigo → violet → rose avec dégradés et mode sombre.
- Fond animé (blobs), logo SVG animé, illustration héros, icônes par étape et
  par statistique.
- Minuteur circulaire SVG avec anneau de progression dégradé.
- Micro-interactions (élévation des boutons, cartes, transitions de page),
  confettis à la fin de session et barre de progression d'étape.
- Tout respecte `prefers-reduced-motion`.




