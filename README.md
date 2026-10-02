# Parle+ — Coach de français parlé

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
3. chunks ratés ou difficiles (un échec recommence le parcours, une récupération difficile ne permet pas la maîtrise) ;
4. sujets non vus récemment ;
5. nouveau contenu.

### La boucle entre les journées

- **Chunks** (4 par séance) : tu retrouves une expression à partir de son
  intention, puis tu fais 2–3 phrases. Un chunk jamais vu est marqué
  « Nouveau » : tu proposes une expression, tu découvres celle du jour, et la
  première vraie récupération a lieu le lendemain. La progression est
  aujourd'hui → J+1 → J+3 → J+7 → maîtrise ; un échec **remet le parcours à
  zéro**, et la maîtrise exige une récupération « facile ». Les chunks
  travaillés deviennent tes « chunks du jour », rappelés pendant le 4→3→2 et
  les questions ; au feedback final, tu confirmes ceux que tu as réellement
  placés.
- **Trous de mots** : quand tu bloques sur un mot, il rejoint ta base
  personnelle et suit réellement J+1 → J+3 → J+7 avant maîtrise ; un échec le
  fait revenir le lendemain. L'exercice présente seulement l'idée : tu as 5 s
  pour retrouver le mot, sinon tu passes automatiquement à la circumlocution.
  Si tu as une réponse, elle n'est comptée comme juste qu'**après** avoir vu
  le mot et confirmé. Les mots génériques de `paraphrase-words.json`
  complètent la liste (≈ 70 % perso / 30 % générique) ; un mot générique que
  tu n'aurais pas trouvé peut rejoindre ta base personnelle avec ta propre
  description de l'idée.
- **Questions surprises** : la question apparaît pendant la préparation progressive (10 s au début, 5 s après 5 séances, 3 s après 15 — mais le niveau ne monte que si moins de 40 % des réponses des 3 dernières séances ont « beaucoup » bloqué). La parole démarre ensuite automatiquement, sans pause ni sortie anticipée, et s'allonge avec le niveau : 60 s, 75 s puis 90 s. La diversité de catégories et de types est privilégiée et la question la plus mal notée revient **toujours** en « revanche » ; au niveau avancé, la dernière réponse dure 60 s puis enchaîne sur un pivot surprise de 30 s.
- **4 → 3 → 2** : 4 passages (4 min, 3 min, 2 min, 1 min de transfert). Le mini-feedback (minuteur indicatif de 60 s) demande un mot manquant, une formulation corrigée et **un chunk que tu aurais pu utiliser**, rappelé pendant les tours 2 et 3. Une séance sur trois, le 4→3→2 devient un **retelling** : tu écoutes une courte histoire (`retelling-stories.json`), tu notes 2–3 expressions entendues, puis tu la racontes avec tes mots ; le transfert porte sur une expérience personnelle proche. Le dernier point travaillé en prosodie est rappelé pendant le 4→3→2.
- **Enregistrement audio** : optionnel, via `MediaRecorder`. S'il est activé, l'enregistrement du premier tour démarre avant le minuteur et s'arrête automatiquement à la fin des 4 minutes. Il reste disponible au mini-feedback puis au feedback final ; l'audio reste uniquement en mémoire.
- **Lecture vocale guidée** : le moteur de synthèse vocale déjà utilisé par les modèles prosodiques TTS est partagé avec la fluidité. Les chunks et mots ne deviennent écoutables qu'après révélation ; le sujet 4→3→2 et les formulations corrigées sont écoutables avant réutilisation. Les questions surprises et les phases de parole chronométrées restent sans lecture pour ne pas modifier la contrainte de production.
- **Boucle personnalisée** : mots manquants + contexte, formulations corrigées et expressions utiles sont réinjectés dans de futures séances. Une correction précédente n'avance dans son espacement que lorsque tu confirmes l'avoir réellement réutilisée à voix haute ; les expressions utiles deviennent des chunks personnels.
- **Transfert réel** : un défi hebdomadaire exige au moins 20 min de vraie conversation puis réinjecte les corrections et blocages observés dans l'entraînement. Une situation tirée de `conversation-scenarios.json` (avec ses interruptions) sert de mission, et une répétition solo de 2 min lit les interruptions à voix haute pendant que tu parles.
- **Mesure hebdomadaire** : le sujet et le minuteur apparaissent ensemble et le benchmark démarre automatiquement pour 3 minutes complètes, sans pause, afin de garder des conditions comparables. Ta voix est **enregistrée** (en mémoire) : le niveau du micro mesure automatiquement le temps avant le premier son, les pauses de plus d'1 s, la plus longue séquence continue et le temps de parole ; tu réécoutes pour répartir les pauses (milieu de phrase / entre deux idées). La comparaison « il y a 4 semaines » prend le test le plus proche (3 à 6 semaines en arrière) et un tableau montre l'évolution.

## Sonner plus naturel (prosodie)

La route `/prosody` travaille une **deuxième compétence**, séparée de la fluidité :
le rythme et l'intonation. La boucle suit strictement :

> entendre → **marquer soi-même** `/ ↑ ↓` → découper → imiter (V1) →
> shadowing → comparer **A → B → A** → choisir **une** différence → refaire
> (V2) → comparer V1/V2 → retelling sans modèle.

Le protocole impose maintenant :
- une première écoute complète pour comprendre le sens ;
- une deuxième écoute complète centrée sur les groupes, pauses et mouvements de voix ;
- un **marquage actif** : l'apprenant place lui-même les frontières `/` et les
  intonations ↑ ↓ → avant de voir le découpage du modèle, puis reçoit un score
  (frontières trouvées, intonations justes) ;
- un échauffement mélodique « la-la-la » optionnel avant l'imitation ;
- au moins 2 écoutes du segment d'imitation avant V1 ;
- une vraie passe complète de shadowing ;
- une comparaison A → B → A automatique et ordonnée ;
- un seul focus de correction avant V2 ;
- aucune lecture du modèle pendant l'enregistrement V1/V2 ;
- un retelling progressif : 30–60 s pour les 5 premières séances, 45–90 s
  ensuite, puis 60–120 s après 10 séances ;
- le choix de l'extrait suivant privilégie ton point de travail le plus
  fréquent (pause, intonation…).

Un extrait marqué `ready: true` doit durer **10–30 s** et son segment d'imitation
**5–15 s**. Les 30 modèles fournis (deux phrases chacun) utilisent la **voix de
synthèse** du navigateur, ce que l'interface indique clairement. Comme la
synthèse ne donne aucun horodatage, leurs durées sont **estimées** à partir du
nombre de syllabes (`timing: "estimated"`, recalculées par
`node scripts/estimate-prosody-timings.mjs`) ; un test refuse toute durée
invraisemblable (moins de 0,12 s ou plus de 0,4 s par syllabe).

Pour copier une **vraie personne**, le bouton « Utiliser mon propre extrait »
permet d'importer un fichier audio de 10–60 s (idéalement 10–30 s) avec sa
transcription : tu choisis le segment d'imitation (5–15 s) en écoutant, puis tu
fais tout le protocole dessus. Le fichier reste en mémoire et n'est jamais
envoyé. Pour ajouter un enregistrement permanent à la banque, place le fichier
dans `public/audio/prosody/`, mets `modelKind: "recording"`,
`timing: "measured"` avec des horodatages mesurés, puis `ready: true`.

Les enregistrements personnels V1/V2/retelling restent uniquement en mémoire.
Seules les métadonnées de progression (extrait, focus, durée, retelling) sont
conservées dans `localStorage`.

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
| `src/data/prosody.json` | 30 modèles prosodiques jouables + groupes rythmiques |
| `src/data/conversation-scenarios.json` | Situations d'interaction avec interruptions et relances (mission + répétition solo) |
| `src/data/retelling-stories.json` | Courtes histoires pour la variante retelling du 4 → 3 → 2 |

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
{
  "id": "q001",
  "text": "…",
  "category": "societe",
  "difficulty": "medium",
  "type": "abstract",
  "pivots": ["q038", "q084", "q150"]
}

// paraphrase-words.json
{
  "id": "w001",
  "word": "embouteillage",
  "category": "quotidien",
  "difficulty": "easy",
  "rescueAngles": ["À quoi ça sert ?", "Où est-ce qu'on le trouve ?", "À quoi ça ressemble ?"]
}

// native-expressions.json (chunks)
{
  "id": "chunk_001",
  "intent": "Nuancer une opinion",
  "expression": "D'un autre côté…",
  "category": "opinion",
  "level": "B2",
  "register": "courant",
  "usageTip": "À réutiliser pour nuancer une opinion sans reconstruire la phrase mot par mot."
}
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
- Tout est stocké dans `localStorage` sous la clé `parle-plus`, dans un schéma versionné (`version: 4`, avec migration depuis les v1/v2/v3 et depuis l'ancienne clé `fr-fluency-trainer`).
- Données conservées : sessions terminées, tests hebdomadaires, **trous de
  mots** (`wordGaps`), **révisions de chunks** (`chunkReviews`), exemples
  personnels, contenus récents, progression prosodique (sans audio) et session de fluidité en cours.
- Si `localStorage` est indisponible, l'entraînement continue en mémoire et un
  avertissement non bloquant s'affiche.

## Tests

La suite Vitest + React Testing Library couvre notamment :

- sélection de contenu par priorité, sans doublon et avec anti-répétition ;
- ordonnanceur de révision espacée (chunks et trous de mots) ;
- persistance et migration du schéma local (v1/v2/v3 → v4) ;
- précision, pause/reprise et récupération après rafraîchissement des minuteurs ;
- lecture vocale partagée entre prosodie et fluidité, avec garde-fous contre la révélation et l'écoute pendant la parole ;
- calcul des séries, de la progression hebdomadaire et des minutes totales ;
- mesure automatique des pauses sur le niveau du micro et comparaison « il y a 4 semaines » tolérante ;
- marquage prosodique actif, durées estimées plausibles des modèles TTS et progression du retelling ;
- vérification honnête des trous de mots, découverte des nouveaux chunks et réinitialisation après échec ;
- machine à états de la session complète (chunks, 4→3→2, questions + revanche,
  trous de mots, feedback) et parcours de bout en bout.

## Déploiement

Le workflow `.github/workflows/deploy-pages.yml` exécute les tests, construit
l'application et la publie sur GitHub Pages à chaque push sur `main`.

Vite est configuré avec `base: '/fr/'` pour respecter le chemin du dépôt.
Dans les paramètres GitHub du dépôt, la source Pages doit être **GitHub Actions**.

## Interface web et PWA

Parle+ est un **site web mobile-first installable comme application** :

- manifeste PWA (`public/manifest.webmanifest`) avec le nom, les couleurs et les icônes Parle+ ;
- service worker (`public/service-worker.js`) enregistré au chargement pour mettre en cache l'interface et les ressources déjà consultées ;
- affichage `standalone` lorsqu'il est ajouté à l'écran d'accueil ;
- icône standard + variante maskable dans `public/icons/` ;
- métadonnées mobile et couleur de thème alignées sur la palette indigo → violet → rose ;
- le déploiement GitHub Pages reste compatible grâce au `base: '/fr/'` de Vite et au routage par hash.

L'interface reste responsive avec en-tête de marque, navigation, colonne centrée et mode focalisé pendant les exercices. Les champs utilisent `font-size: 16px` pour éviter le zoom automatique sur iOS et les cibles tactiles restent adaptées au mobile.

### Design & animations

- Palette indigo → violet → rose avec dégradés et mode sombre.
- Fond animé (blobs), logo SVG animé, illustration héros, icônes par étape et
  par statistique.
- Minuteur circulaire SVG avec anneau de progression dégradé.
- Micro-interactions (élévation des boutons, cartes, transitions de page),
  confettis à la fin de session et barre de progression d'étape.
- Tout respecte `prefers-reduced-motion`.




