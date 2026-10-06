/**
 * Short explanations shown behind the ⓘ buttons. Sourced from docs/
 * ("Parler sans bloquer" and "Sonner plus naturel").
 */
export interface ExerciseInfo {
  title: string
  /** What the exercise is, in one or two sentences. */
  what: string
  /** The steps, in order. */
  how: string[]
  /** What exactly it improves when speaking French. */
  improves: string[]
  /** Rule or caveat worth remembering. */
  tip?: string
  duration: string
}

export type ExerciseInfoId =
  | 'chunks'
  | 'fluency'
  | 'reprise'
  | 'questions'
  | 'gaps'
  | 'feedback'
  | 'cold'
  | 'listening'
  | 'imitation'
  | 'comparison'
  | 'retelling'
  | 'pairs'
  | 'weeklyTest'
  | 'conversation'
  | 'prosodyCheck'

export const EXERCISE_INFO: Record<ExerciseInfoId, ExerciseInfo> = {
  chunks: {
    title: 'Chunks + récupération',
    what: "Tu apprends des blocs d'expressions immédiatement utilisables (« D'un autre côté… », « Ce que je veux dire, c'est que… ») plutôt que des mots isolés, et tu les retrouves de mémoire, à voix haute.",
    how: [
      "On te donne une intention (par exemple « nuancer une opinion »).",
      "Tu retrouves l'expression et, avant de vérifier, tu dis 2 phrases différentes avec elle.",
      "Tu vérifies, tu écoutes sa forme orale (un natif la dit, quand la banque en contient un exemple) et tu notes honnêtement.",
      "Tu la places le jour même dans le 4 → 3 → 2 ou une question ; elle revient à J+1, J+3 puis J+7.",
    ],
    improves: [
      "Tu construis moins tes phrases mot par mot : un chunk est récupéré d'un seul bloc.",
      "Ta mémoire de travail est libérée pour réfléchir à la suite de ce que tu veux dire.",
      "Les chunks « pour gagner du temps » remplacent le « euh » nu par un marqueur français.",
    ],
    tip: "3 à 5 nouveaux chunks par jour au maximum, et varie-les : la même formule toutes les 20 secondes sonne aussi artificiel qu'un manuel.",
    duration: '5 min',
  },
  fluency: {
    title: '4 → 3 → 2 + transfert',
    what: "Le moteur principal : tu parles du même sujet trois fois de suite, avec de moins en moins de temps (4, 3, 2 min), puis 2 minutes sur une question différente. Une fois par semaine, la version 3/3/3.",
    how: [
      "1 minute de préparation : 3 à 5 mots-clés, jamais de phrases.",
      "Tour 1 (4 min), enregistré.",
      "Réécoute courte (1–2 min) : seulement 2 ou 3 trous (un mot, une erreur, un chunk oublié) ; trouve la bonne formulation.",
      "Tours 2 (3 min) et 3 (2 min) : reformule en intégrant les corrections, avec une seule consigne de prosodie par tour.",
      "Transfert (2 min) : une question différente qui demande un raisonnement proche.",
    ],
    improves: [
      "Au 1er passage, tu cherches quoi dire ; ensuite les idées sont prêtes et tu peux te concentrer sur comment le dire.",
      "Ta formulation devient plus rapide et plus automatique : c'est le seul exercice dont l'effet durable et transférable a été montré.",
      "La version 3/3/3 laisse plus de place à la précision.",
    ],
    tip: "Ne te corrige jamais pendant que tu parles : termine, corrige 2 ou 3 choses entre deux tours, puis recommence.",
    duration: '15 min',
  },
  reprise: {
    title: "Reprise d'un sujet",
    what: "Un sujet du 4 → 3 → 2 travaillé il y a 2 à 7 jours revient, pour 3 minutes sans préparation.",
    how: [
      "Le sujet s'affiche : tu commences sans noter de mots-clés.",
      "Tu parles 3 minutes, enregistré si l'enregistrement est activé.",
      "Chaque sujet ne revient qu'une fois.",
    ],
    improves: [
      "La répétition consolide, la nouveauté seule ne consolide pas : sans retour, l'effet du 4 → 3 → 2 se dilue.",
      "Tu vérifies que l'automatisation tient sans le contexte frais de la séance.",
    ],
    tip: "Même sujet dans la séance, retour quelques jours plus tard : ni le lendemain seulement, ni un mois après.",
    duration: '3 min',
  },
  questions: {
    title: 'Questions surprises',
    what: "Tu réponds à une question inconnue presque tout de suite, puis tu la refais aussitôt en mieux. Un zapping final enchaîne 4 questions sans lien.",
    how: [
      "Quelques secondes (10 s, puis 5 s, puis 3 s selon ton niveau) pour choisir la structure : position → raison → exemple → nuance → conclusion.",
      "Démarre par un tremplin (« Alors, ça dépend de ce qu'on entend par… ») et parle 60 à 90 secondes.",
      "30 secondes pour noter ce qui a manqué, puis tu refais la même question en 60 secondes.",
      "Zapping : 4 questions de 45 secondes, reliées par une transition (« Rien à voir, mais… »).",
      "Une question où tu as beaucoup bloqué revient quelques jours plus tard.",
    ],
    improves: [
      "Tu t'entraînes à penser et parler en même temps, au lieu de réfléchir entièrement puis de fabriquer ta phrase.",
      "Le tremplin transforme la pause de réflexion en parole, à une frontière, là où une pause est naturelle.",
      "La reprise consolide la solution au lieu de pratiquer seulement le blocage.",
    ],
    tip: "Des questions toutes différentes, chacune faite une seule fois, ne conservent pas leurs gains : c'est la reprise qui compte.",
    duration: '10 min',
  },
  gaps: {
    title: 'Trous de mots + monologue tabou',
    what: "Tu retravailles les mots que tu as vraiment cherchés, puis tu décris un sujet pendant 90 secondes sans ses mots évidents.",
    how: [
      "Trous de mots : l'idée s'affiche ; retrouve le mot en 5 secondes, sinon contourne-le tout de suite.",
      "Tu vérifies le vrai mot et tu fais 2 ou 3 phrases avec lui ; il revient à J+1, J+3, J+7.",
      "Monologue tabou : 90 secondes sur un sujet, sans les 3 à 5 mots interdits.",
      "Règle d'une seconde : tu ne t'arrêtes jamais plus d'une seconde sur un mot.",
    ],
    improves: [
      "Tu accélères la route idée → mot français.",
      "Tu automatises une voie de secours en plein discours, là où le blocage arrive vraiment.",
      "Tu bloques moins longtemps quand un mot t'échappe.",
    ],
    tip: "Automatise 8 à 10 formules de contournement plutôt que d'en connaître 40.",
    duration: '5 min',
  },
  feedback: {
    title: 'Feedback final',
    what: "Deux minutes pour transformer les difficultés de la séance en matière de travail pour les prochaines.",
    how: [
      "Écoute environ une minute de ton enregistrement.",
      "Note un mot cherché, une phrase abandonnée ou une formulation maladroite.",
      "Indique les chunks que tu as vraiment placés.",
    ],
    improves: [
      "Un mot manquant rejoint tes trous de mots ; une formulation utile devient un chunk ; une erreur fréquente revient comme correction à réutiliser.",
      "Ton entraînement de demain vient de tes vraies difficultés d'aujourd'hui.",
    ],
    tip: "Ne corrige pas vingt choses. Seul, on ne repère qu'environ une erreur sur quatre : un regard extérieur (tuteur, IA) aide régulièrement.",
    duration: '2 min',
  },
  cold: {
    title: 'Test à froid',
    what: "Tu reprends un extrait déjà travaillé : avant toute écoute, tu le redis de mémoire et tu t'enregistres.",
    how: [
      "Lis l'idée de l'extrait, sans l'écouter.",
      "Redis le segment comme tu t'en souviens, avec sa mélodie, et enregistre-toi.",
      "Cette version à froid devient ta V1 : tu la compares ensuite au modèle.",
    ],
    improves: [
      "Tu mesures ce qui est vraiment retenu, pas ce que tu réussis juste après vingt répétitions.",
      "Les révisions espacées (J+1, J+3, J+7) consolident la mélodie.",
    ],
    tip: "C'est le test à froid qui compte.",
    duration: '1 min',
  },
  listening: {
    title: 'Écoute prosodique',
    what: "Avant d'imiter, tu apprends à entendre comment une phrase française est organisée en groupes rythmiques.",
    how: [
      "1re écoute : comprends seulement le sens.",
      "2e écoute : repère les pauses, les syllabes allongées, les montées et les descentes, les réductions (« y a », « chais pas »).",
      "Marque le texte d'après l'audio avec / (frontière) et ↑ ↓ →, puis compare avec le découpage et la courbe du locuteur.",
    ],
    improves: [
      "Tu parles moins mot par mot : le français devient moins haché.",
      "Tu entends des blocs sonores, terminés par une syllabe plus longue, plutôt qu'une suite de mots.",
    ],
    tip: "Utilise la transcription pour préparer, mais plus pendant les répétitions finales : l'écrit réactive le « français lu ».",
    duration: '2–4 min',
  },
  imitation: {
    title: 'Imitation et chorusing',
    what: "Tu reproduis un très court passage en copiant le mouvement de la voix : d'abord en différé, puis en même temps que le locuteur, puis de mémoire.",
    how: [
      "Écoute le segment 2 ou 3 fois (ralenti à 0,75× seulement les premiers jours).",
      "V1 : écoute → petite pause → reproduis, enregistré.",
      "Chorusing : le segment tourne en boucle ; une passe à mi-voix, puis voix pleine avec une seule dimension par passe (découpage, allongement, montées/descentes, réductions).",
      "De mémoire : une écoute, 2 secondes de silence, tu le redis ; puis tu changes un mot en gardant la mélodie.",
    ],
    improves: [
      "Tu relies directement une phrase française à son mouvement de voix, jusqu'à ce que ça devienne automatique.",
      "La compréhensibilité et la fluidité sonore progressent (l'accent, lui, bouge peu).",
      "Changer un mot transforme l'extrait en moule réutilisable.",
    ],
    tip: "Mieux vaut moins de répétitions précises que beaucoup de répétitions bâclées.",
    duration: '5–7 min',
  },
  comparison: {
    title: 'Comparaison A/B et courbe',
    what: "Tu compares ta version au modèle, à l'oreille puis sur la courbe de hauteur de voix, et tu corriges un seul point.",
    how: [
      "Écoute A (l'original), B (toi), puis A à nouveau.",
      "Regarde ta courbe superposée à celle du modèle (en demi-tons) : la forme, pas la hauteur.",
      "Choisis un seul défaut : découpage, puis allongements, puis contours, puis réductions.",
      "Refais la phrase en corrigeant ce seul point, puis compare V1 et V2.",
    ],
    improves: [
      "Tu entends, et tu vois, tes propres écarts : c'est le feedback qui fait progresser, pas l'imitation seule.",
      "La courbe rend visibles une montée absente ou une mélodie trop plate que l'oreille ne capte pas.",
    ],
    tip: "Oreille d'abord, courbe pour vérifier. On copie une forme, pas des hertz.",
    duration: '3 min',
  },
  retelling: {
    title: 'Retelling prosodique',
    what: "Tu coupes l'audio et tu redis la même idée avec tes propres mots, en réutilisant 1 à 3 « moules » de l'extrait.",
    how: [
      "Le modèle et la transcription sont cachés : tu ne récites pas.",
      "Tu expliques l'idée autrement, 30 à 60 secondes pour commencer, puis 1 à 2 minutes.",
      "Tu replaces les moules proposés : une montée de continuation, une finale qui descend net, un marqueur…",
    ],
    improves: [
      "Tu transfères la façon de porter les mots, pas les mots du natif : c'est ce qui sert en conversation.",
      "Tu évites de bien sonner seulement quand tu répètes quelqu'un.",
    ],
    duration: '2–3 min',
  },
  pairs: {
    title: "Paires d'intonation",
    what: "La même phrase dans plusieurs attitudes (constat, question, surprise, hésitation), vérifiées sur ta courbe de voix.",
    how: [
      "Dis la phrase dans l'attitude demandée et enregistre-toi.",
      "Regarde ta courbe : une affirmation finit en bas, une question fermée monte.",
      "Refais celles dont la courbe ne correspond pas.",
    ],
    improves: [
      "Tes contours deviennent fonctionnels : on entend si tu affirmes, demandes ou hésites.",
      "Ta mélodie gagne en ampleur.",
    ],
    duration: '3 min · 2 fois par semaine',
  },
  weeklyTest: {
    title: 'Test de fluidité hebdomadaire',
    what: "Une fois par semaine, dans les mêmes conditions : une tâche connue, trois questions inconnues et un test de contournement.",
    how: [
      "Tâche connue : 3 minutes sur un sujet travaillé cette semaine.",
      "Tâche inconnue : 3 questions jamais vues, 90 secondes chacune, démarrage immédiat.",
      "Contournement : 10 mots à faire deviner sans les dire, 20 secondes chacun.",
      "La première fois, une question dans ta langue maternelle donne ton plafond réaliste.",
      "Tu réécoutes pour classer tes pauses (milieu de phrase ou entre deux idées) et compter les phrases abandonnées.",
    ],
    improves: [
      "L'écart entre tâche connue et inconnue montre si tu automatises la langue ou seulement des discours.",
      "Les pauses au milieu d'une phrase révèlent ce qui bloque vraiment ta formulation.",
    ],
    tip: "Les silences diminuent plus lentement que le débit : juge sur 4 à 6 semaines.",
    duration: '≈ 20 min',
  },
  conversation: {
    title: 'Vraie conversation',
    what: "2 à 3 fois par semaine, 20 à 30 minutes avec une vraie personne (ou une IA vocale) : le test en conditions réelles.",
    how: [
      "Consigne au partenaire : ne pas te corriger pendant, noter 5 reformulations, changer brusquement de sujet 2 ou 3 fois.",
      "Enregistre la conversation.",
      "Transcris la minute la plus difficile, marque pauses, abandons et mots cherchés, puis réécris-la.",
      "Les mots, formulations et erreurs retournent dans tes exercices.",
    ],
    improves: [
      "Aucun monologue ne reproduit écouter, être interrompu, clarifier, changer de sujet et répondre immédiatement.",
      "Tu vérifies que le travail des exercices fonctionne vraiment quand quelqu'un te répond.",
    ],
    duration: '20–30 min',
  },
  prosodyCheck: {
    title: 'Bilan prosodique S0 / S4 / S8',
    what: "Trois bilans identiques (au départ, après 4 semaines et après 8) pour mesurer la prosodie sur des phrases jamais travaillées et en parole spontanée.",
    how: [
      "Imitation différée : 5 phrases jamais travaillées, une écoute chacune.",
      "Lecture du même texte à chaque bilan.",
      "Parole spontanée : 90 s de récit, puis 60 s d'argumentation.",
      "À la fin, des natifs notent à l'aveugle tes enregistrements mélangés.",
    ],
    improves: [
      "Les mesures automatiques (pauses, plage de voix, écart au modèle) montrent la forme.",
      "Seule la notation à l'aveugle de parole spontanée montre le naturel.",
    ],
    duration: '15 min',
  },
}
