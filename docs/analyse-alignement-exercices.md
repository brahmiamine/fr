# Analyse : Parle+ est-il aligné avec les exercices ?

> Analyse du code de la branche `main` (commit `1475ec1`), comparée aux deux
> documents de méthode : **« Parler sans bloquer »** (fluidité) et
> **« Sonner plus naturel »** (prosodie).
> Les 124 tests passent (`npx vitest --run`) et `tsc -b` ne signale aucune erreur.
>
> **Mise à jour** : la plupart des écarts décrits ci-dessous ont depuis été
> corrigés. Les sections 0 à 6 décrivent l'état *avant* corrections ; la
> **section 7** liste ce qui a été corrigé et ce qui reste à faire.

---

## 0. Verdict en une page

**Réponse courte : oui, en grande partie.** Le module fluidité (`/training`)
est une traduction fidèle et sérieuse de « Parler sans bloquer ». La séquence,
les durées, l'espacement J+1/J+3/J+7, la boucle de feedback qui réinjecte les
difficultés et le « refaire la pire réponse » sont tous implémentés, et la
machine à états impose l'ordre des étapes.

Mais **trois points réduisent nettement l'efficacité réelle** :

1. **Le module prosodie utilise une voix de synthèse (TTS du navigateur) comme
   « modèle natif »** pour les 30 extraits. Or tout l'exercice repose sur
   copier *une vraie personne* (« copier la personne, pas seulement la
   phrase »). En plus, les horodatages (`start`/`end`) sont fictifs (chaque
   groupe dure exactement 4 s). La règle « 10–30 s / 5–15 s » est donc validée
   sur le papier mais pas dans la réalité (≈ 5–6 s de parole par extrait).
2. **Le test hebdomadaire n'enregistre pas l'audio.** On demande de compter
   après coup les pauses de plus d'1 s au milieu d'une phrase, le temps avant
   le premier mot et le nombre de mots. C'est impossible à faire de mémoire,
   alors que c'est l'outil qui doit prouver la progression.
3. **Il n'y a aucune boucle de vérification dans les trous de mots et la
   récupération.** On clique sur « Je l'ai trouvé » *avant* de voir la
   réponse, sans pouvoir corriger ensuite. De plus, un chunk raté après
   plusieurs succès ne repart pas de zéro (bug d'espacement, §3).

| Bloc de la méthode | Alignement | Efficacité probable | Commentaire clé |
|---|:---:|:---:|---|
| 1. Chunks + récupération espacée | 🟢 Bon | 🟡 Moyenne | Intention → récupération → 2 phrases → espacement : OK. Mais il faut « deviner » un chunk jamais vu, l'utilisation dans les autres exercices n'est pas vérifiée, et il y a un bug de réinitialisation. |
| 2. 4→3→2 + feedback + transfert | 🟢 Très bon | 🟢 Bonne | Exercice le plus fidèle. Il manque seulement le « chunk que j'aurais pu utiliser » et la variante retelling. |
| 3. Questions surprises + revanche + pivot | 🟢 Très bon | 🟢 Bonne | Préparation 10→5→3 s, position→raison→exemple, diversité, revanche, pivot. Parole limitée à 60 s (la méthode dit 60–90 s). |
| 4. Trous de mots + circumlocution | 🟢 Bon | 🟡 Moyenne | Parcours idée → mot → paraphrase → vérification → phrases bien fait. Mais la vérification est auto-déclarée avant de voir la réponse, et les mots génériques entraînent seulement la paraphrase, pas la récupération. |
| 5. Feedback → boucle d'apprentissage | 🟢 Très bon | 🟢 Bonne | Mot manquant → trous de mots, formulation → chunk perso, erreur → rappel au prochain 4→3→2, avec confirmation d'usage réel. C'est le point fort du projet. |
| Test hebdomadaire (mesurer) | 🟡 Partiel | 🔴 Faible | Bonnes métriques, mais pas d'enregistrement ni de mesure automatique. Comparaison « il y a 4 semaines » trop stricte. |
| Conversation réelle hebdo | 🟢 Bon | 🟡 Moyenne | Bon défi de 20 min minimum avec réinjection. Les 30 `conversation-scenarios.json` existent mais ne sont **jamais affichés**. |
| P1. Écoute + groupes rythmiques | 🟡 Partiel | 🟡 Moyenne | Deux écoutes imposées, mais l'apprenant ne **marque pas lui-même** `/ ↑ ↓ —` : le découpage lui est simplement révélé. |
| P2. Micro-imitation / shadowing | 🟡 Partiel | 🔴 Faible (TTS) | Protocole correct (au moins 2 écoutes, imitation différée, shadowing), mais le modèle est une voix de synthèse. |
| P3. Enregistrement + A/B/A | 🟢 Très bon | 🟡 Moyenne (TTS) | A→B→A automatique, un seul focus, V1↔V2 : excellent design, limité par la qualité du modèle. |
| P4. Retelling prosodique | 🟢 Bon | 🟡 Moyenne | Audio et transcription cachés, minimum 30 s. Mais l'idée source fait une seule phrase, et rien ne fait progresser vers 1–2 min. |
| P5. Imitation « la-la-la » | 🔴 Absent | — | Non implémenté (la méthode le présente comme optionnel). |
| Convergence des deux blocs | 🔴 Absent | — | Rien ne relie la prosodie à la fluidité. |

---

## 1. Comment l'application est construite (rappel rapide)

- **React + TypeScript + Vite**, PWA hors ligne, sans serveur. Tout est stocké
  dans `localStorage` (`src/services/storage/storage.ts`, schéma v4 avec
  migrations).
- **Fluidité** : `src/features/training/`
  - `sessionReducer.ts` est une machine à états qui impose l'ordre
    `chunks → fluency → questions → gaps → feedback` (`types.ts:117`).
  - `services/review/selectPlan.ts` construit le plan de séance : révisions
    dues, trous de mots personnels, diversité des questions, pivot, mots et
    corrections à réutiliser.
  - `services/progress/progress.ts` gère l'espacement des chunks, des trous
    de mots et des corrections, les séries et le niveau.
- **Prosodie** : `src/features/prosody/`, avec une machine à états stricte
  (`prosodyReducer.ts`) : écoute (sens) → écoute (prosodie) → découpage →
  imitation (au moins 2 écoutes) → V1 → shadowing → A/B/A → focus unique →
  V2 → V1↔V2 → retelling (au moins 30 s).
- **Contenu** (`src/data/`) : 150 sujets, 530 questions (16 catégories,
  8 types, toutes avec pivots), 377 chunks, 250 mots à paraphraser,
  40 structures de secours, 60 amorces, 30 extraits prosodiques,
  30 scénarios de conversation.

Point positif général : **les contraintes pédagogiques sont codées dans la
machine à états, pas juste écrites dans l'interface**. Par exemple, on ne peut
pas passer au V1 sans 2 écoutes, ni sauter le feedback, et le minuteur du
4→3→2 n'a pas de bouton pause. C'est exactement ce qu'il faut pour un outil
d'auto-entraînement.

---

## 2. Partie A : « Parler sans bloquer »

### 2.1 Chunks + récupération active espacée

**Ce que dit la méthode** : on part d'une *intention* (« Nuancer une
opinion »), on retrouve soi-même le chunk, on crée 2–3 phrases, on le
réutilise dans les autres exercices du jour, puis on le revoit à
aujourd'hui → J+1 → J+3 → J+7.

**Ce que fait l'app** (`ChunksExercise.tsx`, `selectPlan.ts:selectChunks`,
`progress.ts:upsertChunkReview`) :

| Exigence | Implémentation | ✓ |
|---|---|:---:|
| Partir de l'intention, pas de l'expression | L'intention s'affiche seule, puis 3 s de préparation, puis « Voir l'expression » | ✅ |
| Récupération active (pas de relecture passive) | Il faut dire l'expression à voix haute avant de la révéler | ✅ |
| Créer 2–3 phrases | Consigne « Fais maintenant 2 phrases différentes » | ✅ |
| Utiliser le chunk dans les autres exercices | « Chunks du jour » affichés pendant le 4→3→2 et les questions | ✅ (affichage seulement) |
| Espacement J+1 → J+3 → J+7 | Intervalles +1, +2, +4 puis maîtrise (= J+1, J+3, J+7) | ✅ |
| Échec → revient le lendemain | `interval = 1` en cas d'échec | ✅ |
| Priorité aux révisions dues | `pickInPriority([due, unseen, rest])` | ✅ |
| Chunks personnels issus du feedback | `upsertPersonalChunk` → réinjectés dans `selectChunks` | ✅ |

**Limites qui réduisent l'efficacité :**

1. **Un chunk jamais vu est présenté en mode « récupération ».** Avec
   377 chunks et 375 intentions différentes, la première rencontre est en
   pratique une devinette. Une intention comme « Nuancer une opinion » a
   plusieurs bonnes réponses (« Cela dit… », « En même temps… », « D'un autre
   côté… ») et l'apprenant sera presque toujours marqué « non retrouvé ». Ce
   n'est pas faux en soi (le *pre-testing* a un effet positif), mais il faut
   le signaler (« Nouveau chunk : découvre-le ») et accepter une réponse
   équivalente.
2. **« Facile » et « Avec difficulté » ont exactement le même effet** sur
   l'espacement. Le README parle de « chunks récemment difficiles » comme
   d'une priorité, mais aucun groupe de sélection ne les privilégie.
3. **L'utilisation du chunk pendant les autres exercices n'est jamais
   vérifiée.** Pour les corrections, il y a un bouton « Je l'ai réellement
   utilisée ». Les chunks du jour n'en ont pas, alors que c'est la condition
   du transfert d'après la méthode.
4. **3 chunks par séance** (`CHUNKS_PER_SESSION = 3`) avec une préparation
   de 3 s font environ 2–4 min, pas les 5–7 min prévues. On peut monter à
   4–5 chunks.
5. **`usageTip` est la même phrase-modèle pour les 377 chunks** (« À
   réutiliser pour X sans reconstruire la phrase mot par mot »). Un exemple
   d'usage réel en contexte serait bien plus utile.
6. **Bug d'espacement** : voir §4.1.

### 2.2 4→3→2 amélioré : le moteur principal

**C'est le bloc le mieux aligné.** (`Fluency432Exercise.tsx`,
`FLUENCY_ROUND_SECONDS = [240, 180, 120, 60]`)

| Exigence | Implémentation | ✓ |
|---|---|:---:|
| 3 mots-clés maximum, jamais un texte | Champ limité à 3 mots-clés (`slice(0, 3)`), pistes cachées derrière « Besoin d'une piste ? » | ✅ |
| 4 min, avec enregistrement | Enregistrement lancé *avant* le minuteur, arrêté automatiquement à la fin | ✅ |
| 30–60 s de feedback : 1 erreur, 1 mot manquant | Formulaire « Petit retour (30–60 s) » avec réécoute du tour 1 | ✅ |
| … éventuellement un chunk que j'aurais pu utiliser | **Absent** | ❌ |
| 3 min « reformuler, pas réciter » | Indice « Reformule, ne récite pas. » | ✅ |
| 2 min | ✅ | ✅ |
| 1 min de transfert sur un sujet proche | `transferPrompt` propre à chaque sujet (150 différents), révélé seulement au début du tour | ✅ |
| Ne pas se corriger pendant la parole | Minuteur sans pause ni sortie (`hideControls`) | ✅ |
| Correction réutilisée au prochain 4→3→2 | `importantError` / `difficultPhrase` → `fluencyNotes` → rappel au prochain 4→3→2, avancé seulement si l'usage est confirmé | ✅ |
| Mot manquant réinjecté | `captureWordGap` (avec contexte obligatoire) | ✅ |
| Variante retelling « certains jours » | **Absente du module fluidité** (elle n'existe que dans la prosodie) | ❌ |

**Petits défauts** :
- La pastille affiche `Tour 1 / 3` (`Fluency432Exercise.tsx:78`) alors qu'il
  y a 4 passages. C'est trompeur.
- Le « 30–60 s » du mini-feedback n'est pas chronométré. La méthode insiste
  sur la *brièveté*, et un minuteur indicatif de 60 s aiderait.
- Les 150 sujets n'utilisent que **20 jeux de pistes différents** (pistes
  génériques). Ce n'est pas grave, puisque les pistes sont facultatives et
  volontairement non directives.

**Efficacité** : 🟢. La structure (répétition de tâche, temps décroissant,
feedback entre les passages, transfert) correspond exactement au protocole
le mieux étayé de la méthode.

### 2.3 Questions surprises + répétition ciblée

(`SurpriseQuestionsExercise.tsx`, `selectDiverseQuestions`, `sessionReducer.ts:QUESTION_RATE`)

| Exigence | Implémentation | ✓ |
|---|---|:---:|
| Question inconnue | Anti-répétition via `recentQuestionIds` | ✅ |
| Préparation 10 s → 5 s → 3 s | `prepSecondsForLevel` : moins de 5 séances = 10 s, moins de 15 = 5 s, sinon 3 s | ✅ |
| Décider seulement position → raison → exemple | Consigne « Idée → raison → exemple » pendant la préparation | ✅ |
| Parler 60–90 s | **60 s fixes** (`QUESTION_SPEAKING_SECONDS = 60`) | 🟡 |
| Questions très variées | Diversité des catégories *et* des types imposée (16 catégories × 8 types) | ✅ |
| Refaire la pire réponse | « Revanche » sur la question la plus mal notée | ✅ |
| Pivot au niveau avancé | Niveau 3 : 60 s, puis pivot de 30 s sur une autre catégorie, enchaîné sans pause | ✅ |

**Limites** :
- **Pas de revanche si tout est noté « Non »**. La méthode dit de reprendre
  *toujours* celle où l'on a le plus bloqué. On pourrait prendre la moins bien
  notée même au niveau « none ».
- **La progression du niveau dépend seulement du nombre de séances**
  (`trainingLevelForSessionCount`), pas des résultats. Quelqu'un qui bloque
  encore beaucoup passe quand même à 3 s après 15 séances. La méthode dit de
  « réduire *progressivement* ». Un critère combiné (nombre de séances +
  peu de blocages sur les dernières séances) serait plus fidèle.
- **Au niveau 3, la note de la dernière question est attribuée au pivot**
  (`sessionReducer.ts:209`). La question d'origine n'est jamais notée et ne
  peut donc pas être choisie pour la revanche.
- Le type `comparison` n'a que 4 questions sur 530.
- Les blocages des questions surprises ne créent pas de trous de mots : seuls
  le 4→3→2 et le feedback final en créent.

**Efficacité** : 🟢. La planification en ligne est bien entraînée et la
contrainte de temps est réelle (pas de pause, démarrage automatique).

### 2.4 Trous de mots personnels + circumlocution

(`WordGapsExercise.tsx`, `selectGapItems`, `scheduler.ts:gapSchedule`)

| Exigence | Implémentation | ✓ |
|---|---|:---:|
| Liste de mots *réellement cherchés* | Captés depuis le 4→3→2, le feedback final et la conversation hebdo, avec contexte obligatoire | ✅ |
| Pas seulement une liste générique | Environ 70 % personnels / 30 % génériques | ✅ |
| On présente seulement l'idée | Mode `retrieve` : « Tu voulais exprimer : … » | ✅ |
| Essayer de retrouver *rapidement* | **Pas de limite de temps** sur l'étape de rappel | 🟡 |
| S'il ne vient pas → circumlocution immédiate | « Explique-le sans connaître le mot », avec structures de secours et 15 s | ✅ |
| *Ensuite seulement* vérifier | Révélation de la réponse | ✅ |
| 2–3 phrases avec le vrai terme | Consigne affichée | ✅ |
| Réinjecter dans un futur 4→3→2 ou question | `focusWords` (mots déjà réussis) affichés dans le 4→3→2 et les questions | ✅ |
| Espacement J+1 → J+3 → J+7 | `gapSchedule` : +1, puis +2, puis +4, puis maîtrise ; un échec remet à zéro | ✅ |

**Limites qui réduisent l'efficacité :**

1. **« Je l'ai trouvé » est enregistré comme succès *avant* de voir la
   réponse** (`sessionReducer.ts:258`). Si le mot dit était faux, on ne peut
   pas se corriger, et le mot avance quand même vers la maîtrise. Il faut
   plutôt : « J'ai une réponse » → révélation → « C'était juste / C'était
   faux ».
2. **Les mots génériques montrent le mot cible** (« Explique :
   *interrupteur* »). C'est un bon exercice de circumlocution (type
   « Taboo »), mais il n'entraîne pas la voie *concept → mot*, qui est le
   premier des deux apprentissages décrits par la méthode. Et un mot
   générique qu'on ne savait pas expliquer n'entre jamais dans la base
   personnelle.
3. **Pas de minuteur sur le rappel** : la consigne « tu n'attends pas » n'est
   pas appliquée. Un compte à rebours de 5 s qui bascule automatiquement vers
   la paraphrase serait plus fidèle.
4. Le minuteur de paraphrase (15 s) ne démarre pas automatiquement.

### 2.5 Le feedback comme boucle d'apprentissage

**C'est la partie la plus aboutie de l'application.**

| Méthode | Application |
|---|---|
| Écouter environ 1 min de son oral | Réécoute du tour 1 au mini-feedback *et* au feedback final (audio en mémoire) |
| Repérer un mot cherché | `blockedWord` + contexte → `captureWordGap` → trous de mots |
| Repérer une phrase abandonnée | `abandonedSentence` (formulation **corrigée**) → `fluencyNotes` |
| Repérer une formulation maladroite | `awkwardPhrase` → `fluencyNotes` |
| Formulation utile → nouveau chunk | `expressionToReuse` + intention → `personalChunks` |
| Erreur fréquente → la réutiliser au prochain 4→3→2 | `fluencyReminders` affichés en préparation et pendant le 4→3→2 ; ils n'avancent dans l'espacement (J+3, J+7) que si « Je l'ai réellement utilisée » |
| Ne pas corriger 20 choses | Un champ par catégorie, tous facultatifs |

La consigne de noter **la formulation corrigée, pas l'erreur brute** est
pédagogiquement juste (on n'automatise pas l'erreur).

**Limite** : l'enregistrement couvre seulement le tour 1 du 4→3→2. Les
questions surprises (le moment où l'on bloque le plus) ne sont jamais
enregistrées et ne peuvent donc pas être réécoutées.

### 2.6 La séance complète (32–38 min)

| Bloc | Méthode | App (estimation réaliste) |
|---|---:|---:|
| Chunks | 5–7 min | ≈ 2–4 min (3 chunks) |
| 4→3→2 + feedback + transfert | 12–15 min | ≈ 12–13 min |
| Questions + revanche | 8–10 min | ≈ 7–9 min (5 × 60 s + revanche) |
| Trous de mots | 5 min | ≈ 3–5 min (5 mots) |
| Feedback | 2 min | ≈ 2–3 min |
| **Total** | **32–38 min** | **≈ 27–34 min** |

La boucle *récupérer → parler → rencontrer une difficulté → contourner →
identifier → corriger → espacer → réutiliser* est **complète dans le code** :
chaque maillon correspond à une étape ou à une donnée persistée.

### 2.7 Une fois par semaine : mesurer

(`WeeklyTest.tsx`, `ProgressPage.tsx`)

✅ Les mesures demandées sont toutes présentes : temps avant le premier mot,
pauses au milieu d'une phrase / entre deux idées, phrases abandonnées,
hésitations, mots contournés, plus long segment fluide, débit. Le sujet est
non vu récemment, il n'y a pas de préparation, la durée est de 3 min et les
conditions sont fixes (démarrage automatique, pas de pause).

❌ **Mais rien n'est enregistré.** Après 3 minutes de parole, l'utilisateur
doit saisir *de mémoire* le nombre de pauses de plus d'1 s au milieu d'une
phrase et le nombre de mots prononcés. Ces chiffres seront très imprécis, et
la comparaison « moi il y a 4 semaines » perd sa valeur. Le hook
`useAudioRecorder` existe déjà, il suffit de l'utiliser ici, puis :
- d'afficher le lecteur audio pendant la saisie (gain immédiat) ;
- idéalement, de mesurer automatiquement avec la Web Audio API (énergie RMS
  par fenêtres de 50 ms) : **temps avant le premier son**, **nombre de
  silences de plus d'1 s**, **plus long segment sans silence**, **ratio
  parole/silence**. Ce sont exactement les indicateurs « objectifs » de la
  méthode, et ils sont calculables sans serveur.

🟡 La comparaison avec il y a 4 semaines exige un test **exactement** à la
semaine S-4 (`ProgressPage.tsx:55`). Si cette semaine-là a été sautée, aucune
comparaison n'apparaît. Il vaudrait mieux prendre le test le plus proche
de S-4, ou afficher une courbe de tous les tests.

### 2.8 Une fois par semaine : vraie conversation

✅ Il faut au moins 20 min, et le mot manquant, le blocage et l'expression
utile sont réinjectés (trous de mots, corrections, chunks perso). C'est
cohérent avec « la conversation vérifie que le moteur fonctionne ».

🟡 **`conversation-scenarios.json` (30 scénarios avec interruptions et
relances) est chargé dans `contentRepository` mais n'est jamais utilisé dans
l'interface.** Ces scénarios correspondent pourtant exactement à ce que la
méthode dit manquer aux monologues (être interrompu, demander une
clarification, changer de sujet). On pourrait les proposer comme « mission »
pour la conversation hebdomadaire, ou comme exercice de simulation dans
lequel la TTS lit les « events » à des moments aléatoires.

### 2.9 Le tableau « problème → mécanisme » est-il couvert ?

| Problème | Mécanisme | Couvert ? |
|---|---|:---:|
| « Je connais l'expression mais elle ne vient pas » | retrieval + chunks | ✅ |
| « Je réfléchis trop avant de parler » | questions surprises | ✅ |
| « Je construis mes phrases lentement » | 4→3→2 | ✅ |
| « Il me manque un mot et je bloque » | circumlocution | ✅ |
| « Je répète toujours les mêmes erreurs » | feedback différé | ✅ |
| « J'apprends puis j'oublie » | espacement | ✅ (avec un bug pour les chunks, §4.1) |
| « Je suis bon seul mais pas avec quelqu'un » | conversation réelle | 🟡 (déclaratif, scénarios inutilisés) |

---

## 3. Partie B : « Sonner plus naturel »

### 3.0 Le problème central : le modèle est une voix de synthèse

```text
src/data/prosody.json → 30 extraits sur 30 : "modelKind": "tts", "source": "browser-speech-synthesis"
```

- La méthode demande un **extrait de conversation française naturelle** et
  insiste : « copier la personne, pas seulement la phrase… même énergie ». Une
  voix `speechSynthesis` (de qualité très variable selon l'OS et le
  navigateur) ne fournit ni une prosodie naturelle, ni une énergie
  expressive, ni des pauses de conversation. On risque d'apprendre à
  **imiter une voix robotique**, ce qui va à l'encontre du but « sonner plus
  français ».
- **Les marques prosodiques affichées (↑ ↓ —, liaisons, enchaînements) ne
  sont pas garanties dans l'audio produit.** L'apprenant voit « ↑ » alors que
  la voix de synthèse peut rester plate. L'écoute et la lecture du découpage
  se contredisent.
- **Les horodatages sont fictifs** : chaque groupe dure exactement 4 s et
  chaque extrait 12 s, alors que les transcriptions font 15 à 22 mots
  (≈ 5–7 s réelles). Les règles `MIN_FULL_AUDIO_SECONDS = 10` et
  `MIN_IMITATION_SECONDS = 5` passent la validation, mais le segment
  d'imitation réel fait souvent 3–4 s. Le README dit pourtant qu'un extrait
  `ready: true` doit contenir une *vraie voix française naturelle*.
  **Le code et le README ne disent pas la même chose.**

**Conséquence** : le *protocole* prosodique est excellent, mais il est
appliqué à un *matériau* qui ne permet pas d'atteindre le but. C'est le
principal écart entre l'application et les exercices.

**Pistes** (par ordre de valeur) :
1. Enregistrer (soi-même avec un natif, ou avec des sources sous licence
   libre comme Common Voice ou des podcasts CC-BY) **10 à 30 vrais extraits**,
   même en petit nombre. 10 vrais extraits valent mieux que 30 extraits TTS.
2. Permettre à l'utilisateur **d'importer son propre extrait** (fichier
   audio + transcription) et de placer les frontières de groupes lui-même.
   Ça transforme aussi l'exercice d'écoute en exercice actif (voir 3.1).
3. À défaut, utiliser une TTS neuronale de haute qualité, pré-générée et
   stockée en `.mp3` (le script `scripts/generate-prosody-audio.mjs` existe
   déjà), avec des horodatages *mesurés*. Et afficher clairement « voix de
   synthèse » à l'apprenant.

### 3.1 Écoute prosodique + groupes rythmiques

| Exigence | App | ✓ |
|---|---|:---:|
| 1re écoute : comprendre le sens, sans texte | « Écoute 1/2 : Ne lis rien », écoute complète obligatoire | ✅ |
| 2e écoute : pauses, montées, descentes, allongements | Liste de choses à écouter, écoute obligatoire | ✅ |
| **Marquer soi-même** `/ ↑ ↓ —` sur la transcription | **Non** : le découpage est *révélé*, pas produit par l'apprenant | ❌ |
| Copier le découpage *du locuteur* | Découpage fixé dans les données (et pas forcément fidèle à l'audio TTS) | 🟡 |

Le cœur de l'exercice 1 est la **perception active**. On peut le rendre
actif à faible coût : afficher la transcription mot par mot, laisser
l'apprenant toucher entre deux mots pour placer `/` et toucher un groupe pour
choisir ↑ / ↓, *puis* révéler le découpage de référence et surligner les
différences.

### 3.2 Micro-imitation / shadowing analytique

| Exigence | App | ✓ |
|---|---|:---:|
| Passage court (5–15 s) | Annoncé, mais ≈ 3–4 s en réalité (TTS) | 🟡 |
| Écouter 2–3 fois | Au moins 2 écoutes complètes avant de pouvoir enregistrer | ✅ |
| Imitation différée (écouter → pause → reproduire) | Le micro est bloqué pendant la lecture du modèle (`disabled={modelPlaying}`) | ✅ |
| Copier la personne (énergie, durée, mouvement) | Check-list affichée, mais le modèle est synthétique | 🔴 |
| Shadowing presque simultané | Une passe obligatoire | ✅ |

À noter : dans l'application, **le V1 est enregistré *avant* le
shadowing**, donc l'A/B compare l'imitation différée et non le résultat après
shadowing. C'est défendable (le V1 sert de « point zéro »), mais la méthode
place le shadowing *avant* la comparaison. Le README le documente
correctement.

### 3.3 Enregistrement + comparaison A/B/A

**Très bien implémenté** : `AbaPlayer` joue automatiquement natif → moi →
natif dans l'ordre, puis on choisit **un seul** focus parmi 8 (pause,
groupes, rythme, intonation, allongement final, enchaînement, tempo,
énergie), on enregistre le V2 avec cet *unique* objectif, et on compare
V1 ↔ V2. C'est exactement le principe de la méthode (« Ne cherche pas dix
défauts »).

Absent : l'option « Praat / courbe de pitch une fois par semaine ». C'est
optionnel dans la méthode, mais une **courbe de F0** simple (autocorrélation
dans le navigateur) superposant natif et apprenant serait une vraie valeur
ajoutée hebdomadaire.

### 3.4 Retelling prosodique

✅ Audio et transcription cachés, consigne « ne récite pas, garde la façon de
porter les mots », minimum 30 s imposé par le reducer.

🟡 L'idée source tient en une ligne (« Donner un avis positif puis ajouter
une condition ») et le modèle est une seule phrase d'environ 5 s. Exiger
30 s minimum oblige à **inventer beaucoup de contenu**, ce qui déplace
l'effort de la prosodie vers la fluidité. La méthode parle d'un extrait plus
riche (2 phrases sur le télétravail). Il faudrait des extraits plus longs
(vrais 15–30 s) ou un minimum adapté à la longueur du modèle.

🟡 **Aucune progression vers 1–2 min** : `MIN_RETELL_SECONDS = 30` est fixe,
quel que soit le nombre de séances.

### 3.5 Imitation mélodique « la-la-la »

❌ Absente. La méthode la présente comme un échauffement *optionnel* de
1–2 min, donc ce n'est pas bloquant. Elle serait simple à ajouter avant
l'imitation : « Reproduis la mélodie avec *la-la-la* », enregistrement,
puis A/B.

### 3.6 Séance de 12–15 min et convergence des deux blocs

✅ La boucle *entendre → découper → copier → s'écouter → corriger → refaire →
parler seul* est imposée dans le bon ordre.

❌ **Aucune convergence** avec la fluidité, alors que la méthode conclut que
« les deux blocs doivent converger ». Par exemple :
- le focus prosodique choisi (« je coupe au mauvais endroit ») n'est jamais
  rappelé pendant le 4→3→2 ;
- les focus ne sont pas suivis dans le temps (le focus est stocké dans
  `ProsodySessionRecord.focus` mais jamais réutilisé pour choisir le prochain
  extrait) ;
- il n'y a pas d'espacement pour les extraits prosodiques, seulement une
  anti-répétition.

---

## 4. Bugs et incohérences repérés dans le code

### 4.1 L'échec d'un chunk ne réinitialise pas sa progression *(impact pédagogique réel)*

`src/services/progress/progress.ts:225-226`

```ts
const recalled = result === 'failed' ? 0 : 1
const nextTimesRecalled = (existing?.timesRecalled ?? 0) + recalled
```

Scénario : succès à J0, J+1 et J+3 (`timesRecalled = 3`), **échec à J+7** →
retour à J+8 avec `timesRecalled` toujours à 3. Au succès suivant,
`timesRecalled = 4` et le chunk est **marqué maîtrisé** directement, sans
repasser par J+1 → J+3 → J+7.
Les trous de mots, eux, remettent bien `successCount` à 0 en cas d'échec
(`scheduler.ts`). Les deux systèmes ne se comportent pas pareil.
**Correctif** : en cas d'échec, remettre `timesRecalled` à 0, ou utiliser un
compteur de « succès consécutifs » distinct du total historique.

### 4.2 Trous de mots : succès auto-déclaré avant la vérification

`src/features/training/sessionReducer.ts:258` : `GAP_FOUND` enregistre
`found: true` puis révèle la réponse. Il manque le bouton « C'était faux »
après la révélation.

### 4.3 Pivot de niveau 3 : la note est attribuée au pivot, pas à la question d'origine

`sessionReducer.ts:209`. La question d'origine ne peut jamais être choisie
pour la revanche, et l'historique est faussé.

### 4.4 Données inutilisées

- `conversation-scenarios.json` (30 éléments) : chargé, jamais affiché.
- `personalExamples` / `upsertPersonalExample` : stockés et migrés, mais
  jamais écrits par l'interface.

### 4.5 Petites incohérences d'interface

- `Tour 1 / 3` alors qu'il y a 4 passages (`Fluency432Exercise.tsx:78`).
- La pastille « Type : abstract » affiche le type technique en anglais pendant
  la préparation de la question surprise.
- Les données prosodiques déclarent `ready: true` avec des horodatages
  fictifs, contrairement à ce que dit le README (« vraie voix française
  naturelle »).

---

## 5. Recommandations par priorité

### 🔴 Priorité 1 : ce qui conditionne l'efficacité

1. **Vrais modèles audio pour la prosodie** (§3.0) : extraits naturels avec
   horodatages mesurés, ou import d'extraits personnels.
2. **Enregistrer le test hebdomadaire et mesurer automatiquement** les
   silences, le temps avant le premier son et le plus long segment (§2.7).
3. **Corriger le bug d'espacement des chunks** (§4.1).
4. **Ajouter la vérification après révélation** dans les trous de mots (§4.2).

### 🟡 Priorité 2 : ce qui rapproche l'app de la méthode

5. Prosodie : **marquage actif** `/ ↑ ↓` par l'apprenant avant la révélation (§3.1).
6. Chunks : signaler les **nouveaux** chunks, différencier « difficile » de
   « facile » dans l'espacement, ajouter une confirmation « je l'ai utilisé
   aujourd'hui » (§2.1).
7. Mini-feedback 4→3→2 : ajouter « un chunk que j'aurais pu utiliser » et un
   minuteur indicatif de 60 s (§2.2).
8. Questions surprises : parole de 60 à 90 s selon le niveau, revanche
   toujours proposée, niveau qui dépend des performances et pas seulement du
   nombre de séances (§2.3).
9. Trous de mots : compte à rebours de 5 s sur le rappel, et les mots
   génériques ratés rejoignent la base personnelle (§2.4).
10. Utiliser `conversation-scenarios.json` pour la conversation
    hebdomadaire (§2.8).

### 🟢 Priorité 3 : bonus prévus par la méthode

11. Variante **retelling** du 4→3→2 « certains jours ».
12. Échauffement **la-la-la** en prosodie.
13. **Courbe de pitch** hebdomadaire (natif vs moi).
14. **Convergence** : rappeler le dernier focus prosodique pendant le 4→3→2.
15. Retelling prosodique qui progresse de 30 s vers 1–2 min.

---

## 6. Conclusion

- **Fidélité à la méthode « Parler sans bloquer » : environ 85 %.** Les cinq
  blocs, leur ordre, leurs durées, l'espacement et surtout la **boucle de
  feedback personnalisée** sont bien implémentés et imposés par le code. Les
  écarts sont surtout des détails (60 s au lieu de 60–90 s, un champ de
  feedback manquant, la variante retelling) et deux faiblesses de
  vérification (succès auto-déclarés, bug de réinitialisation des chunks).
- **Fidélité à la méthode « Sonner plus naturel » : protocole ≈ 85 %,
  matériau ≈ 30 %.** La séquence est exemplaire (A→B→A automatique, focus
  unique, V1↔V2, retelling sans modèle). Mais elle est appliquée à une voix de
  synthèse avec des horodatages fictifs, ce qui limite fortement le gain réel
  en intonation.
- **Mesure de la progression : faible.** Sans enregistrement, le test
  hebdomadaire ne peut pas fournir les chiffres fiables que la méthode
  demande pour comparer « moi aujourd'hui ↔ moi il y a 4 semaines ».

En résumé, **l'application a la bonne structure**. Pour qu'elle soit aussi
*efficace* que la méthode le promet, il faut surtout de **vrais modèles
audio**, une **mesure objective** de la progression et une **vérification
honnête** des réponses. Le reste relève de l'ajustement.

---

## 7. Corrections appliquées

État après corrections : 160 tests passent (contre 124), `tsc -b` et
`npm run build` sont OK, et le parcours a été vérifié dans un vrai navigateur
(test hebdomadaire avec micro simulé).

| # | Écart relevé | Correction | Fichiers principaux |
|---|---|---|---|
| 4.1 | Un échec ne remettait pas l'espacement du chunk à zéro | Compteur `streak` de succès consécutifs : un échec le remet à 0, J+1 → J+3 → J+7 recommence | `progress.ts:upsertChunkReview` |
| 2.1 | « Facile » = « difficile » | Une récupération difficile ne peut pas terminer le parcours : la maîtrise exige une récupération facile | idem |
| 2.1 | Chunk jamais vu présenté comme une devinette | Mode **« Nouveau »** : proposer, découvrir, puis 1re récupération à J+1 (`discovered`) | `ChunksExercise.tsx`, `selectPlan.ts` |
| 2.1 | Usage des chunks du jour jamais vérifié | Confirmation « Je l'ai placé » au feedback final, stockée dans la séance | `SessionFeedback.tsx` |
| 2.1 | 3 chunks ≈ 2–4 min | **4 chunks** par séance, consigne « 2 ou 3 phrases » | `types.ts` |
| 2.2 | Il manquait « le chunk que j'aurais pu utiliser » | Nouveau champ (avec son intention), rappelé « À placer dans ce tour » aux tours 2 et 3, puis transformé en chunk personnel | `Fluency432Exercise.tsx` |
| 2.2 | Mini-feedback non chronométré | Minuteur indicatif de 60 s | idem |
| 2.2 | « Tour 1 / 3 » | « Tour 1 / 4 » | idem |
| 2.2 | Pas de variante retelling | Une séance sur trois : écoute d'une histoire (12 histoires), 2–3 expressions notées, récit en 4→3→2, transfert sur une expérience proche | `retelling-stories.json`, `selectPlan.ts` |
| 2.3 | 60 s fixes au lieu de 60–90 s | 60 s → 75 s → 90 s selon le niveau (pivot avancé : 60 s puis 30 s) | `SurpriseQuestionsExercise.tsx` |
| 2.3 | Pas de revanche si tout est noté « Non » | La revanche a **toujours** lieu, sur la question la plus mal notée | `sessionReducer.ts` |
| 2.3 / 4.3 | Note du niveau 3 attribuée au pivot | La note revient à la question posée, qui peut donc être reprise en revanche | idem |
| 2.3 | Niveau basé seulement sur le nombre de séances | Le niveau ne monte que si moins de 40 % des réponses des 3 dernières séances ont « beaucoup » bloqué | `progress.ts:trainingLevelForSessions` |
| 4.5 | Type de question en anglais | Libellés français | `types.ts` |
| 4.2 | « Je l'ai trouvé » compté avant vérification | « J'ai une réponse » → réponse affichée → « juste / faux », puis seulement l'enregistrement | `WordGapsExercise.tsx`, `sessionReducer.ts` |
| 2.4 | Pas de limite sur le rappel | 5 s, puis passage automatique à la circumlocution ; le minuteur de paraphrase démarre seul | idem |
| 2.4 | Mots génériques jamais ajoutés aux trous personnels | « Ajouter à mes trous de mots » avec ta propre description de l'idée | idem |
| 2.7 | Test hebdo sans enregistrement | Enregistrement + **mesure automatique** (premier son, pauses > 1 s, plus longue séquence, temps de parole) via Web Audio, puis réécoute pour la saisie | `speechActivity.ts`, `useAudioRecorder.ts`, `WeeklyTest.tsx` |
| 2.7 | Comparaison seulement à S-4 exactement | Test le plus proche de 4 semaines (3 à 6 semaines en arrière) + tableau d'évolution | `progress.ts:findComparisonTest`, `ProgressPage.tsx` |
| 2.8 / 4.4 | Scénarios de conversation inutilisés | Carte « Situation à jouer » + répétition solo de 2 min avec interruptions lues à voix haute | `ConversationPrep.tsx` |
| 3.0 | Horodatages fictifs (4 s par groupe) | Extraits allongés à 2 phrases (10–14 s), durées **estimées par syllabes**, segment d'imitation de 5–7 s ; un test refuse toute durée invraisemblable | `prosody.json`, `prosodyTiming.ts`, `scripts/estimate-prosody-timings.mjs` |
| 3.0 | Voix de synthèse présentée comme un modèle natif | Mention explicite « voix de synthèse » + **import de son propre extrait** (vraie voix, 10–60 s, segment choisi à l'écoute, audio gardé en mémoire) | `CustomExtractForm.tsx`, `customExtract.ts` |
| 3.1 | Découpage révélé, pas produit | Étape **Marquage** : l'apprenant place `/` et ↑ ↓ → puis reçoit un score (frontières, intonations) | `marking.ts`, `ListeningExercise.tsx` |
| 3.4 | Retelling bloqué à 30 s | 30–60 s → 45–90 s → 60–120 s selon le nombre de séances de prosodie | `types.ts:retellingGoalFor` |
| 3.5 | Pas de « la-la-la » | Échauffement mélodique optionnel avec enregistrement | `MelodyWarmup.tsx` |
| 3.6 | Aucune convergence | Le point de prosodie le plus travaillé guide le choix des extraits et est rappelé pendant le 4→3→2 | `progress.ts:recentProsodyFocus`, `selectPlan.ts` |

Une session interrompue enregistrée par l'ancienne version redémarre
proprement (champ `schema`), sans perte de l'historique.

### Ce qui reste volontairement hors du code

- **De vrais enregistrements natifs dans la banque** : ça demande des fichiers
  audio dont on a les droits. L'application les accepte (`modelKind:
  "recording"`, `timing: "measured"`), et l'import personnel permet dès
  maintenant de travailler sur une vraie voix.
- **Courbe de pitch hebdomadaire** (option « Praat » de la méthode) : non
  implémentée, la méthode la juge facultative.
- **Exemples d'usage réels pour les 377 chunks** (`usageTip` reste générique) :
  c'est un travail de contenu, pas de code.
- **Enregistrement des questions surprises** pour la réécoute finale : seul le
  tour 1 du 4→3→2 est enregistré.
- La répartition des pauses (milieu de phrase / entre deux idées) reste
  manuelle : distinguer les deux demande une analyse syntaxique.
