# Parle+ — Coach de français parlé

Un **coach de français parlé** sous forme de site web, mobile-first. Chaque
séance est une boucle d'apprentissage fermée : l'application donne du contenu →
tu essaies de le récupérer → tu parles → tu bloques → l'application mémorise le
blocage et te le représente plus tard. Aucun compte : tout
fonctionne en statique sur Cloudflare Workers, avec une IA facultative.

Application déployée : https://fr.testcivique.workers.dev/

## La méthode

L'application applique deux méthodes, décrites en détail (exercices, durées,
niveau de preuve, mesures et références) dans `docs/` :

| Document | Compétence | Boucle |
|---|---|---|
| [`docs/Parler sans bloquer.md`](docs/Parler%20sans%20bloquer.md) | **Fluidité** : trouver ses mots, tenir un discours, ne plus bloquer | récupérer → parler → bloquer → contourner → identifier → corriger → espacer → réutiliser |
| [`docs/Sonner plus naturel.md`](docs/Sonner%20plus%20naturel.md) | **Prosodie** : rythme et intonation du français parlé | entendre → découper → copier → s'écouter → comparer → corriger un point → revenir à froid → parler seul |
| [`docs/ai-models.md`](docs/ai-models.md) | Modèles d'IA gratuits du Worker | diagnostic et choix des modèles |

Trois principes traversent les deux méthodes :

1. **Répéter avant de passer à autre chose** : la répétition consolide, la
   nouveauté seule ne consolide pas (de Jong & Perfetti, 2011). Même sujet,
   même question, même extrait, plutôt qu'un contenu neuf à chaque fois.
2. **Espacer les retours** : revenir quelques jours plus tard (J+1, J+3, J+7
   pour les chunks et les mots ; J+2 à J+7 pour les sujets).
3. **Boucler par une rétroaction** : s'enregistrer, repérer peu de choses (une
   à trois), corriger entre deux passages, jamais pendant, et réinjecter.

La séance de fluidité recommandée dure ≈ 40 min : chunks (5 min), 4→3→2+
(15 min), reprise d'un ancien sujet (3 min), questions surprises « répondre →
reprendre » + zapping (10 min), trous de mots + monologue tabou (5 min),
feedback (2 min). Le bloc prosodie ajoute 10 à 15 min par jour, sur 1 à 3
extraits par semaine travaillés à fond.

Les sections suivantes décrivent ce que l'application fait. La section
[« Écarts entre la méthode et l'application »](#écarts-entre-la-méthode-et-lapplication)
signale le seul point encore absent.

## Le principe

Dans l'application, une séance de fluidité (≈ 40 min) suit un parcours guidé en 6 étapes :

| Étape | Durée |
|---|---:|
| Chunks + récupération espacée | 5 min |
| 4 → 3 → 2 + transfert | 15 min |
| Reprise d'un sujet | 3 min |
| Questions surprises + zapping | 10 min |
| Trous de mots + monologue tabou | 5 min |
| Feedback final | 2 min |

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
  description de l'idée. Une fois révélé, chaque mot est **réinjecté** dans
  le 4→3→2 et les questions des séances suivantes (« Mots à réutiliser »),
  sauf le jour où il doit être retrouvé, pour ne jamais te le souffler avant.
- **Questions surprises** : la question apparaît pendant la préparation progressive (10 s au début, 5 s après 5 séances, 3 s après 15 — mais le niveau ne monte que si moins de 40 % des réponses des 3 dernières séances ont « beaucoup » bloqué). La parole démarre ensuite automatiquement, sans pause ni sortie anticipée, et s'allonge avec le niveau : 60 s, 75 s puis 90 s. La diversité de catégories et de types est privilégiée et la question la plus mal notée revient **toujours** en « revanche » ; au niveau avancé, la dernière réponse dure 60 s puis enchaîne sur un pivot surprise de 30 s. Si l'enregistrement est activé, chaque réponse est enregistrée (en mémoire) : avant la revanche, tu peux réécouter ta première réponse, et le feedback final fait écouter **avant / après**.
- **4 → 3 → 2** : 4 passages (4 min, 3 min, 2 min, 1 min de transfert). Le mini-feedback (minuteur indicatif de 60 s) demande un mot manquant, une formulation corrigée et **un chunk que tu aurais pu utiliser**, rappelé pendant les tours 2 et 3. Une séance sur trois, le 4→3→2 devient un **retelling** : tu écoutes une courte histoire (`retelling-stories.json`, voix de synthèse) ou un **extrait naturel** d'une vraie personne (`retelling-recordings.json`, puisé dans la banque prosodique sous licence), tu notes 2–3 expressions entendues, puis tu la racontes avec tes mots ; le transfert porte sur une expérience personnelle proche. Le dernier point travaillé en prosodie est rappelé pendant le 4→3→2.
- **Enregistrement audio** : optionnel, via `MediaRecorder`. S'il est activé, chaque tour du 4→3→2 et chaque réponse aux questions surprises sont enregistrés pendant qu'ils se déroulent. Le tour 1 est réécouté au mini-feedback, les 4 tours dans un résumé, la pire question avant sa revanche ; l'audio reste uniquement en mémoire.
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
  (frontières trouvées, intonations justes) — calculé **uniquement** sur ce qui
  est fiable (voir « Annotation acoustique » ci-dessous) ;
- la **courbe de hauteur de voix** réelle du locuteur, avec ses pauses et un
  curseur qui suit la lecture, affichée avec le découpage ;
- un segment d'imitation **progressif** : une seule phrase (≤ 8 s) pour les 5
  premières séances, ≤ 11 s ensuite, puis jusqu'à 15 s — toujours coupé à la
  fin d'un groupe ;
- un échauffement mélodique « la-la-la » optionnel avant l'imitation ;
- au moins 2 écoutes du segment d'imitation avant V1 ;
- une vraie passe complète de shadowing ;
- une comparaison A → B → A automatique et ordonnée ;
- un seul focus de correction avant V2 ;
- aucune lecture du modèle pendant l'enregistrement V1/V2 ;
- un retelling progressif : 30–60 s pour les 5 premières séances, 45–90 s
  ensuite, puis 60–120 s après 10 séances, avec une **idée propre à chaque
  extrait** (ce que dit vraiment ce passage) ;
- le choix de l'extrait suivant privilégie ton point de travail le plus
  fréquent (pause, intonation…).

Un extrait marqué `ready: true` doit durer **10–30 s** et son segment d'imitation
**5–15 s**. La banque contient **350 extraits de vraies voix** (licence CC BY,
voir `public/audio/prosody/README.md`), proposés en priorité, et 30 modèles en
**voix de synthèse** du navigateur, ce que l'interface indique clairement. Comme
la synthèse ne donne aucun horodatage, leurs durées sont **estimées** à partir du
nombre de syllabes (`timing: "estimated"`, recalculées par
`node scripts/estimate-prosody-timings.mjs`) ; un test refuse toute durée
invraisemblable (moins de 0,12 s ou plus de 0,4 s par syllabe).

### Annotation acoustique

Le marquage n'a de sens que si la référence décrit ce que fait vraiment le
locuteur. Les groupes des vraies voix sont donc **mesurés sur l'audio**
(`annotation: "acoustic"`) par `scripts/prosody_audio/` :

1. `asr_words.py` (faster-whisper) donne l'horodatage de chaque mot ;
2. `annotate.py` (Praat via parselmouth) aligne ces mots sur la transcription,
   place une frontière **seulement là où le locuteur fait une vraie pause**
   (silence mesuré, `pauseAfter`), cale la fin de chaque groupe sur l'arrêt réel
   de la voix, mesure le mouvement de la dernière syllabe en demi-tons
   (`intonationMeasured: true` seulement si la montée ou la descente est nette,
   ≥ 3 demi-tons), repère l'allongement final et enregistre la courbe de
   hauteur (`pitch`).

```bash
pip install faster-whisper praat-parselmouth numpy
python3 scripts/prosody_audio/asr_words.py   # cache dans .cache/prosody-asr
python3 scripts/prosody_audio/annotate.py    # réécrit src/data/prosody.json
```

Le score ne compte que ce qui est fiable : pour une vraie voix annotée, toutes
ses pauses et ses mouvements nets ; pour la voix de synthèse, les frontières et
mouvements sur la ponctuation (là où elle s'arrête vraiment) ; un extrait dont
les groupes n'ont été que devinés n'est pas noté du tout.

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

## Écarts entre la méthode et l'application

La méthode de `docs/` a été mise à jour à partir de deux synthèses de
recherche. L'application en applique désormais l'essentiel, en fluidité comme
en prosodie. Il ne reste qu'un point absent, signalé ci-dessous.

**État :** ✅ fait · 🟡 partiel · ⬜ à faire

### Fluidité (`Parler sans bloquer`)

| Élément de la méthode | État |
|---|:---:|
| Reprise d'un sujet du 4→3→2 entre J+2 et J+7 (3 min, sans préparation) | ✅ |
| Transfert de 2 min sur une **question** différente | ✅ |
| Version 3/3/3 une fois par semaine | ✅ |
| Réécoute de 1 à 2 min entre les tours | ✅ |
| Une consigne prosodique par tour | ✅ |
| Questions « répondre → reprendre » pour chaque question | ✅ |
| Zapping (4 × 45 s avec transitions) | ✅ |
| Démarrer par un tremplin ; structure position → raison → exemple → nuance → conclusion | ✅ |
| Questions ratées reprogrammées entre J+3 et J+7 | ✅ |
| Chunks : dire 2 phrases **avant** de vérifier | ✅ |
| Chunks récoltés dans l'écoute native, avec leur forme orale (« chais pas ») | ✅ |
| Monologue tabou (90 s) et règle d'une seconde | ✅ |
| Boîte à outils de 8 à 10 formules de contournement | ✅ |
| Conversation réelle 2 à 3 fois par semaine, minute transcrite puis réécrite | ✅ |
| Test hebdo : tâche connue + 3 questions inconnues, contournement de 10 mots, référence L1 | ✅ |
| Pauses ≥ 250 ms et durée moyenne ; « euh » nus séparés des marqueurs français | ✅ |

### Prosodie (`Sonner plus naturel`)

| Élément de la méthode | État |
|---|:---:|
| 1 à 3 extraits par semaine, repris 3 jours puis révisés à J+1, J+3, J+7 | ✅ |
| Test à froid avant toute écoute | ✅ |
| Chorusing en boucle (6 répétitions, une dimension par passe) | ✅ |
| Écouter, pause, reproduire de mémoire, puis changer un mot | ✅ |
| Ralenti à 0,75× les premiers jours | ✅ |
| Courbe de l'apprenant superposée à celle du modèle (demi-tons) | ✅ |
| Retelling en réutilisant 2 ou 3 « moules » de l'extrait | ✅ |
| Paires fonctionnelles d'intonation (*Tu viens. / Tu viens ?*) | ✅ |
| Un locuteur principal pendant 3 à 4 semaines ; préférer le non scripté | ✅ |
| Extraits de conversation à deux voix (semaines 5 à 8) | ⬜ |
| Tests S0 / S4 / S8 et notation à l'aveugle par des natifs | ✅ |
| Marquage `/ ↑ ↓` avant de voir le modèle, A → B → A, une seule correction | ✅ |

> Les extraits de **conversation à deux voix** (semaines 5 à 8) sont encore
> presque absents de la banque : ils s'importent via « Utiliser mon propre
> extrait ».

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
| `src/data/prosody.json` | 350 extraits de vraies voix + 30 modèles de synthèse, avec groupes rythmiques mesurés |
| `src/data/conversation-scenarios.json` | Situations d'interaction avec interruptions et relances (mission + répétition solo) |
| `src/data/retelling-stories.json` | Courtes histoires (voix de synthèse) pour la variante retelling du 4 → 3 → 2 |
| `src/data/retelling-recordings.json` | Extraits naturels de la banque prosodique utilisés comme histoires de retelling |

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
- La progression est stockée dans `localStorage` sous la clé `parle-plus`, dans un schéma versionné (`version: 4`, avec migration depuis les v1/v2/v3 et depuis l'ancienne clé `fr-fluency-trainer`).
- Données conservées : sessions terminées, tests hebdomadaires, **trous de
  mots** (`wordGaps`), **révisions de chunks** (`chunkReviews`), exemples
  personnels, contenus récents, progression prosodique (sans audio) et session de fluidité en cours.
- **Exception — le bilan prosodique S0 / S4 / S8** : ses enregistrements sont
  conservés dans **IndexedDB** (base `parle-plus-audio`) sur l'appareil, pour
  être notés à l'aveugle et comparés plus tard. Ils ne sont jamais envoyés.
  Tout le reste de l'audio reste uniquement en mémoire.
- Si `localStorage` (ou IndexedDB) est indisponible, l'entraînement continue en
  mémoire et un avertissement non bloquant s'affiche.

## Tests

La suite Vitest + React Testing Library couvre notamment :

- sélection de contenu par priorité, sans doublon et avec anti-répétition ;
- ordonnanceur de révision espacée (chunks et trous de mots) ;
- persistance et migration du schéma local (v1/v2/v3 → v4) ;
- précision, pause/reprise et récupération après rafraîchissement des minuteurs ;
- lecture vocale partagée entre prosodie et fluidité, avec garde-fous contre la révélation et l'écoute pendant la parole ;
- calcul des séries, de la progression hebdomadaire et des minutes totales ;
- mesure automatique des pauses sur le niveau du micro et comparaison « il y a 4 semaines » tolérante ;
- marquage prosodique actif noté seulement sur les références fiables, courbe de hauteur, segment d'imitation progressif, durées estimées plausibles des modèles TTS et progression du retelling ;
- plan prosodique (3 jours d'apprentissage, révisions J+1/J+3/J+7, plafond de 3 extraits par semaine, locuteur principal), test à froid, chorusing en boucle, « de mémoire puis changer un mot », courbe superposée et distance DTW, paires d'intonation et bilans S0/S4/S8 ;
- enregistrement des réponses aux questions surprises et réinjection des mots débloqués ;
- vérification honnête des trous de mots, découverte des nouveaux chunks et réinitialisation après échec ;
- machine à états de la session complète (chunks, 4→3→2, questions + revanche,
  trous de mots, feedback) et parcours de bout en bout.

## Déploiement

L'application est un site statique hébergé sur **Cloudflare Workers**
(assets statiques) : https://fr.testcivique.workers.dev/

`wrangler.jsonc` publie le dossier `dist/` sous le nom de Worker `fr`.
Dans Cloudflare (Workers & Pages → `fr` → Settings → Build), utiliser :

- commande de build : `npm run build` ;
- commande de déploiement : `npx wrangler deploy`.

Vite est configuré avec `base: '/'` : l'application est servie à la racine du
domaine. Le routage par hash (`#/training`, …) évite toute règle de
redirection côté serveur.

### Intelligence artificielle (facultative)

Un interrupteur **Paramètres → Intelligence artificielle** (éteint par défaut)
active ou désactive l'IA dans **toutes** les interfaces. Éteint, aucun écran
n'affiche d'IA, rien n'est envoyé, et l'application fonctionne exactement
comme avant. Il est relu à chaque appel : l'éteindre agit immédiatement.

Où l'IA intervient (uniquement quand elle est activée) :

| Écran | Rôle de l'IA |
| --- | --- |
| Manche de transfert du 4→3→2 | Écrit un sujet proche (même type de raisonnement, autre thème), demandé dès le tour 1 ; le sujet écrit dans `topics.json` reste utilisé si l'IA est éteinte ou échoue |
| Petit retour du 4→3→2 et feedback final | Transcrit l'enregistrement et propose reformulations, expressions et mot manquant ; l'apprenant choisit ce qu'il copie dans le formulaire |
| Trous de mots (vérification) | Avis facultatif sur le mot que l'apprenant dit avoir trouvé |
| Test hebdomadaire | Transcrit l'enregistrement et remplit le nombre de mots et d'hésitations |
| Coach IA (`/coach`) | **Questions surprises** : série chronométrée dans le thème choisi (compte à rebours, question révélée au dernier moment, enchaînement automatique, réponses enregistrées puis analysées dans le résumé) ; **jeu de rôle** en conversation de messages, avec micro à côté du texte |

La prosodie n'utilise pas l'IA : les modèles gratuits jugent mal l'intonation.

`worker/index.ts` est le serveur du Worker `fr`. Seules les requêtes `/api/*`
l'exécutent ; tout le reste est servi directement depuis les fichiers statiques.
Les prompts vivent côté serveur (`worker/tasks.ts`) : le site n'est pas un accès
libre à un modèle. Les clés se créent comme **secrets** dans Cloudflare
(Workers → `fr` → Settings → Variables and Secrets), jamais dans le dépôt :

| Secret | Fournisseur |
| --- | --- |
| `GEMINI_API_KEY` | Google Gemini |
| `GROQ_API_KEY` | Groq |
| `MISTRAL_API_KEY` | Mistral |
| `CLOUDFLARE_AI_API_TOKEN` | Workers AI en REST, avec `CLOUDFLARE_ACCOUNT_ID` (variable de `wrangler.jsonc`, pas un secret) ; sinon le binding `AI` suffit |
| `OPENROUTER_API_KEY` | OpenRouter |
| `NVIDIA_API_KEY` | NVIDIA |
| `HF_TOKEN` | Hugging Face |
| `COHERE_API_KEY` | Cohere |

Variables optionnelles : `PROVIDER_ORDER` (ex. `gemini,groq,cloudflare`),
`<FOURNISSEUR>_MODEL` (ex. `GROQ_MODEL`) et `<FOURNISSEUR>_TRANSCRIBE_MODEL` pour la transcription et `AI_ACCESS_CODE` (réservé : l'application n'a plus de champ pour saisir un
code, ne le définissez pas, sinon le serveur refusera toutes les requêtes).

- `GET /api/status` : fournisseurs configurés (jamais les clés) ;
- `POST /api/task` : `analyze-speech`, `judge-word`, `question`, `roleplay` ;
- `POST /api/transcribe` : transcription (Groq, Mistral, Gemini, Workers AI).

Les réponses portent les tokens consommés et le temps de réponse : l'écran Paramètres affiche, par modèle, les requêtes, échecs, tokens, audio transcrit et temps moyen (comptés dans le navigateur, avec un bouton de remise à zéro).

Chaque appel essaie les fournisseurs dans l'ordre et passe au suivant en cas
d'échec, de quota épuisé ou de réponse inexploitable. Quand l'IA est utilisée,
la voix ou le texte est envoyé au fournisseur ; l'audio n'est jamais conservé
par l'application. `npm run dev` ne sert pas `/api` : l'IA y affiche une erreur
de connexion sans gêner le reste.

## Interface web et PWA

Parle+ est un **site web mobile-first installable comme application** :

- manifeste PWA (`public/manifest.webmanifest`) avec le nom, les couleurs et les icônes Parle+ ;
- service worker (`public/service-worker.js`) enregistré au chargement pour mettre en cache l'interface et les ressources déjà consultées ;
- affichage `standalone` lorsqu'il est ajouté à l'écran d'accueil ;
- icône standard + variante maskable dans `public/icons/` ;
- métadonnées mobile et couleur de thème alignées sur la palette indigo → violet → rose ;
- le déploiement Cloudflare Workers fonctionne grâce au `base: '/'` de Vite et au routage par hash.

L'interface reste responsive avec en-tête de marque, navigation, colonne centrée et mode focalisé pendant les exercices. Les champs utilisent `font-size: 16px` pour éviter le zoom automatique sur iOS et les cibles tactiles restent adaptées au mobile.

### Design & animations

- Palette indigo → violet → rose avec dégradés et mode sombre.
- Fond animé (blobs), logo SVG animé, illustration héros, icônes par étape et
  par statistique.
- Minuteur circulaire SVG avec anneau de progression dégradé.
- Micro-interactions (élévation des boutons, cartes, transitions de page),
  confettis à la fin de session et barre de progression d'étape.
- Tout respecte `prefers-reduced-motion`.




