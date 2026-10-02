# Entraîneur de fluidité — Français

Une application web légère et mobile-first pour travailler le **français parlé**
au quotidien. Chaque session guidée combine quatre exercices, des minuteurs
fiables et un suivi local de progression. Aucun compte, aucun serveur : tout
fonctionne sur GitHub Pages.

Application déployée : https://brahmiamine.github.io/fr/

## Fonctionnement

Une session quotidienne enchaîne automatiquement quatre exercices :

1. **4 → 3 → 2** (≈ 12 min) — parle 4, 3 puis 2 minutes sur un sujet, avec une
   courte pause réflexion après la première manche, puis 1 minute de transfert
   sur un sujet proche.
2. **Mot interdit** (≈ 5 min) — 5 mots à faire deviner sans les prononcer,
   60 secondes chacun, avec des structures de secours.
3. **Questions surprise** (≈ 8 min) — 5 questions révélées par un décompte
   3 → 2 → 1, puis 60 secondes de parole chacune.
4. **Français naturel** (≈ 5 min) — 3 expressions naturelles, avec 3 phrases
   personnelles à écrire pour chaque.

La session se termine par un **bilan** (blocages, paraphrase réussie, expression
à réutiliser, erreur à surveiller, note de fluidité de 1 à 5).

L'accueil affiche la série en cours, les minutes parlées, le nombre de sessions
et l'objectif hebdomadaire (5 sessions). La page Progression contient
l'historique, les statistiques et un **test hebdomadaire** de 3 minutes.

## Démarrage local

Prérequis : Node.js 20+ et npm.

```bash
npm install
npm run dev        # serveur de développement
npm test           # tests en mode watch
npm test -- --run  # tests une seule fois
npm run build      # build de production dans dist/
npm run preview    # prévisualiser le build
```

## Contenu pédagogique

Tout le contenu est statique et vit dans `src/data/`. Ajouter du contenu ne
demande aucune modification du code applicatif.

| Fichier | Rôle |
| --- | --- |
| `src/data/topics.json` | Sujets des exercices 4 → 3 → 2 |
| `src/data/questions.json` | Questions surprise |
| `src/data/paraphrase-words.json` | Mots interdits à paraphraser |
| `src/data/native-expressions.json` | Expressions naturelles |

### Schémas

```jsonc
// topics.json
{
  "id": "t001",
  "title": "Télétravail ou bureau ?",
  "category": "travail",
  "difficulty": "medium",       // "easy" | "medium" | "hard"
  "prompts": ["Question 1", "Question 2"],
  "transferPrompt": "Sujet proche pour la manche de transfert"
}

// questions.json
{ "id": "q001", "text": "…", "category": "societe", "difficulty": "medium" }

// paraphrase-words.json
{ "id": "w001", "word": "embouteillage", "category": "quotidien", "difficulty": "easy" }

// native-expressions.json
{ "id": "e001", "expression": "Ça dépend vraiment de...", "category": "nuancer" }
```

### Ajouter du contenu

1. Ouvre le fichier JSON correspondant.
2. Ajoute un objet avec un `id` **unique**.
3. Sauvegarde : c'est tout.

Les `id` doivent rester uniques dans toute la durée de vie de l'application :
l'historique et l'anti-répétition s'appuient dessus. Si un `id` est réutilisé,
d'anciennes données peuvent être considérées comme déjà vues.

La sélection évite les éléments récents quand c'est possible, ne répète jamais
un même élément dans une session, et se relâche proprement si le jeu de données
est encore petit.

## Stockage local et confidentialité

- Aucune donnée ne quitte l'appareil.
- Tout est stocké dans `localStorage` sous la clé `fr-fluency-trainer`, dans un
  schéma versionné (`version: 1`).
- Données conservées : sessions terminées, tests hebdomadaires, exemples de
  phrases, contenus récents et session en cours.
- Si `localStorage` est indisponible, l'entraînement continue en mémoire et un
  avertissement non bloquant s'affiche.

## Tests

La suite Vitest + React Testing Library couvre notamment :

- sélection de contenu sans doublon et anti-répétition ;
- persistance et migration du schéma local ;
- précision, pause/reprise et récupération après rafraîchissement des minuteurs ;
- calcul des séries, de la progression hebdomadaire et des minutes totales ;
- machine à états de la session d'entraînement et parcours de bout en bout.

## Déploiement

Le workflow `.github/workflows/deploy-pages.yml` exécute les tests, construit
l'application et la publie sur GitHub Pages à chaque push sur `main`.

Vite est configuré avec `base: '/fr/'` pour respecter le chemin du dépôt.
Dans les paramètres GitHub du dépôt, la source Pages doit être **GitHub Actions**.

## Application installable (PWA)

L'application est **mobile-first** et installable comme une app :

- `public/manifest.webmanifest` (mode `standalone`, portrait, couleurs, icônes
  `any` + `maskable`).
- `public/sw.js` : service worker réseau-d'abord avec repli hors ligne.
- Icônes générées sans dépendance via `node scripts/generate-icons.mjs`.
- iOS : `apple-touch-icon` et mode plein écran
  (`apple-mobile-web-app-capable`).
- Zones sûres (`env(safe-area-inset-*)`) pour les encoches et la barre système.
- Champs en `font-size: 16px` pour éviter le zoom automatique sur iOS, cibles
  tactiles de 44 px minimum et suppression du délai de tap de 300 ms.

Sur Android/Chrome, une bannière « Installer l'application » apparaît. Le
service worker n'est enregistré qu'en production.

