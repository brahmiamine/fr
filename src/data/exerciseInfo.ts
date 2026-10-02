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
  | 'questions'
  | 'gaps'
  | 'feedback'
  | 'listening'
  | 'imitation'
  | 'comparison'
  | 'retelling'
  | 'weeklyTest'
  | 'conversation'

export const EXERCISE_INFO: Record<ExerciseInfoId, ExerciseInfo> = {
  chunks: {
    title: 'Chunks + récupération',
    what: "Tu apprends des blocs d'expressions immédiatement utilisables (« D'un autre côté… », « Ce que je veux dire, c'est que… ») plutôt que des mots isolés.",
    how: [
      "On te donne une intention (par exemple « nuancer une opinion »).",
      "Tu essaies de retrouver toi-même l'expression avant de la voir.",
      "Tu fais tout de suite 2 ou 3 phrases différentes avec elle.",
      "Tu la réutilises dans les autres exercices du jour ; elle revient ensuite à J+1, J+3 puis J+7.",
    ],
    improves: [
      "Tu construis moins tes phrases mot par mot : un chunk est récupéré d'un seul bloc.",
      "Ta mémoire de travail est libérée pour réfléchir à la suite de ce que tu veux dire.",
      "Les expressions viennent quand tu en as besoin, au lieu de rester « connues mais introuvables ».",
    ],
    tip: "Ne relis pas passivement : essayer de retrouver l'expression la renforce bien plus que la relire.",
    duration: '5–7 min',
  },
  fluency: {
    title: '4 → 3 → 2 + transfert',
    what: "Tu parles du même sujet trois fois de suite, avec un temps de plus en plus court : 4 min, 3 min, 2 min. Puis 1 minute sur un nouveau sujet proche.",
    how: [
      "Note seulement 3 mots-clés, jamais un texte préparé.",
      "Tour 1 (4 min) : développe librement ; tu peux t'enregistrer.",
      "Mini-feedback (30–60 s) : une erreur importante, un mot manquant, éventuellement un chunk oublié.",
      "Tours 2 (3 min) et 3 (2 min) : reformule en réutilisant ce que tu viens de corriger, sans réciter.",
      "Transfert (1 min) : un nouveau sujet qui demande un raisonnement proche.",
    ],
    improves: [
      "Au 1er passage, tu cherches quoi dire ; ensuite les idées sont prêtes et tu peux te concentrer sur comment le dire.",
      "Ta formulation devient plus rapide et plus automatique (moins d'hésitations et de pauses).",
      "Le transfert vérifie que le progrès ne dépend pas d'un seul sujet.",
    ],
    tip: "Ne te corrige pas pendant que tu parles : termine ton discours, puis corrige brièvement avant de recommencer. Sinon tu automatises tes erreurs.",
    duration: '12–15 min',
  },
  questions: {
    title: 'Questions surprises',
    what: "Tu tires une question que tu ne connais pas et tu y réponds presque tout de suite, comme dans une vraie conversation.",
    how: [
      "Tu as quelques secondes seulement (10 s, puis 5 s, puis 3 s selon ton niveau) pour décider : position → raison → exemple.",
      "Tu parles ensuite 60 à 90 secondes, sans préparer de discours complet.",
      "Tu notes si tu as bloqué ; la question la plus difficile est refaite une deuxième fois (revanche).",
      "À un niveau avancé, un pivot te fait changer de sujet en plein milieu.",
    ],
    improves: [
      "Tu t'entraînes à penser et parler en même temps, au lieu de réfléchir entièrement puis de fabriquer ta phrase.",
      "Tu apprends à démarrer avec une structure connue pendant que tu cherches l'idée suivante.",
      "Refaire la pire réponse combine l'imprévu et la répétition.",
    ],
    tip: "Les amorces sont une bouée de secours, pas un texte à lire à chaque fois.",
    duration: '8–10 min',
  },
  gaps: {
    title: 'Mes trous de mots',
    what: "Tu retravailles les mots que tu as vraiment cherchés à l'oral. L'exercice te donne l'idée, pas le mot.",
    how: [
      "Essaie de retrouver le mot en quelques secondes.",
      "S'il ne vient pas, tu n'attends pas : tu décris l'idée avec d'autres mots (fonction, catégorie, synonyme).",
      "Tu vérifies ensuite le vrai mot et tu fais 2 ou 3 phrases avec lui.",
      "Le mot sera réutilisé dans un prochain 4 → 3 → 2 ou une question surprise.",
    ],
    improves: [
      "Tu accélères la route idée → mot français.",
      "Tu construis une solution de secours : si le mot manque, tu décris et la conversation continue.",
      "Tu bloques moins longtemps quand un mot t'échappe.",
    ],
    tip: "La circumlocution est avant tout un outil anti-blocage, pas le moteur principal de la fluidité.",
    duration: '5 min',
  },
  feedback: {
    title: 'Feedback final',
    what: "Deux minutes pour transformer les difficultés de la séance en matière de travail pour les prochaines.",
    how: [
      "Écoute environ une minute de ton enregistrement si tu en as un.",
      "Note un mot cherché, une phrase abandonnée ou une formulation maladroite.",
      "Indique les chunks que tu as vraiment placés.",
    ],
    improves: [
      "Un mot manquant rejoint tes trous de mots ; une formulation utile devient un chunk ; une erreur fréquente revient comme correction à réutiliser.",
      "Ton entraînement de demain vient de tes vraies difficultés d'aujourd'hui.",
    ],
    tip: "Ne corrige pas vingt choses : seulement les problèmes les plus importants.",
    duration: '2 min',
  },
  listening: {
    title: 'Écoute prosodique',
    what: "Avant d'imiter, tu apprends à entendre comment une phrase française est organisée en groupes rythmiques.",
    how: [
      "1re écoute : comprends seulement le sens, sans lire.",
      "2e écoute : repère où le locuteur fait une pause, où il continue, où la voix monte ou descend.",
      "Marque le texte avec / (frontière de groupe) et ↑ ↓ → pour la mélodie, puis compare avec le modèle.",
    ],
    improves: [
      "Tu parles moins mot par mot : le français devient moins haché.",
      "Tu entends des blocs sonores plutôt qu'une suite de mots.",
      "Tu repères les pauses, l'allongement des syllabes finales et la mélodie qui font le rythme français.",
    ],
    tip: "Le découpage varie selon la personne : le but est de copier son découpage, pas d'appliquer une règle mécanique.",
    duration: '2–4 min',
  },
  imitation: {
    title: 'Micro-imitation et shadowing',
    what: "Tu reproduis un très court passage (5 à 15 secondes) en copiant le mouvement de la voix, pas seulement les mots.",
    how: [
      "Écoute le passage plusieurs fois : vitesse, pauses, montées, descentes, syllabes finales.",
      "Écoute, fais une petite pause, puis reproduis et enregistre-toi.",
      "Quand tu connais bien le passage, parle presque en même temps que le locuteur (shadowing).",
      "Optionnel : l'échauffement « la-la-la » isole la mélodie sans les mots.",
    ],
    improves: [
      "Tu relies directement une phrase française à son mouvement de voix, jusqu'à ce que ça devienne automatique.",
      "Ton rythme, ton intonation et tes enchaînements se rapprochent du modèle.",
      "Une voix trop plate gagne en mélodie.",
    ],
    tip: "Mieux vaut très bien reproduire 10 secondes que mal en reproduire 60.",
    duration: '5–7 min',
  },
  comparison: {
    title: 'Comparaison A/B et correction',
    what: "Tu compares ton enregistrement au modèle pour entendre la différence entre ce que tu crois produire et ce que tu produis réellement.",
    how: [
      "Écoute A (l'original), puis B (toi), puis A à nouveau.",
      "Choisis un seul défaut (une mauvaise coupure, une voix plate, une syllabe finale trop courte).",
      "Refais immédiatement la phrase en corrigeant ce seul point, puis compare ta 1re et ta dernière version.",
    ],
    improves: [
      "Tu entends enfin tes propres écarts : c'est le feedback qui fait progresser, pas l'imitation seule.",
      "En ne corrigeant qu'un point à la fois, tu l'intègres vraiment au lieu de te disperser.",
    ],
    tip: "Oreille d'abord : un graphique de hauteur n'est utile qu'occasionnellement.",
    duration: '2–3 min',
  },
  retelling: {
    title: 'Retelling prosodique',
    what: "Tu coupes l'audio et tu redis la même idée avec tes propres mots, en gardant le rythme et la mélodie du modèle.",
    how: [
      "Le modèle est caché : tu ne récites pas la phrase.",
      "Tu expliques l'idée autrement, 30 à 60 secondes pour commencer.",
      "Tu gardes les mêmes types de groupes, de pauses et de mélodie.",
    ],
    improves: [
      "Tu transfères la façon de porter les mots, pas les mots du natif : c'est ce qui sert en conversation.",
      "Tu évites de bien sonner seulement quand tu répètes quelqu'un.",
      "Tu inventes le contenu tout en gardant la prosodie, comme dans une vraie conversation.",
    ],
    duration: '2–3 min',
  },
  weeklyTest: {
    title: 'Test de fluidité hebdomadaire',
    what: "Une fois par semaine, tu parles 3 minutes sur un sujet inconnu, toujours dans les mêmes conditions, pour mesurer ta progression.",
    how: [
      "Tu reçois un sujet que tu n'as pas préparé et tu parles 3 minutes.",
      "L'application mesure le délai avant le premier mot, les pauses de plus d'une seconde et ta plus longue séquence continue.",
      "Tu réécoutes pour distinguer une pause entre deux idées d'une pause au milieu d'une phrase, puis tu notes phrases abandonnées et hésitations.",
    ],
    improves: [
      "Tu compares toi cette semaine à toi il y a quatre semaines, au lieu de deviner si tu progresses.",
      "Les pauses au milieu d'une phrase révèlent ce qui bloque vraiment ta formulation.",
    ],
    tip: "Pas de chiffre universel parfait : compare-toi à toi-même.",
    duration: '3 min + écoute',
  },
  conversation: {
    title: 'Vraie conversation',
    what: "Au moins 20 à 30 minutes par semaine avec une vraie personne en français : le test en conditions réelles.",
    how: [
      "Prépare la situation proposée et son objectif.",
      "Parle avec quelqu'un, accepte les interruptions et demande des clarifications.",
      "Note ensuite les mots, formulations et erreurs à retravailler : ils retournent dans tes exercices.",
    ],
    improves: [
      "Aucun monologue ne reproduit écouter, être interrompu, clarifier, changer de sujet et répondre immédiatement.",
      "Tu vérifies que le travail des exercices fonctionne vraiment quand quelqu'un te répond.",
    ],
    duration: '20–30 min',
  },
}
