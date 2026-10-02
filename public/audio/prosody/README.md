# Banque de prosodie

Les exercices s'appuient sur deux banques.

**La banque publiée** (`src/data/prosody.json`) mélange des modèles synthétiques
et 350 extraits de voix réelles rediffusables sous licence Creative Commons. Les
fichiers audio correspondants sont versionnés dans ce dossier.

**La banque personnelle** contient des extraits dont la licence ne permet pas la
rediffusion. Ignorée par git, elle n'est jamais publiée.

## Sources et licences

Les treize vidéos ci-dessous sont publiées par leurs auteurs sous
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), la licence Creative
Commons que YouTube propose à ses créateurs. Chaque extrait découpé et réencodé
en OGG mono porte cette attribution dans son champ `attribution`.

| Source | Vidéo | Extraits |
| --- | --- | ---: |
| Laetitia Valstar (Français) | [S’entraîner à mieux parler : 5 habitudes quotidiennes](https://youtu.be/yDzKRFn0Oko) | 46 |
| Laetitia Valstar (Français) | [Parlez avec confiance, éloquence et charisme !](https://youtu.be/4CRzTjt54mQ) | 63 |
| m a t t | [Voici pourquoi les français sont si nuls en anglais](https://youtu.be/l8Dg-XQATHY) | 9 |
| French Ministry for Europe and Foreign Affairs | [Leur Génération Égalité — Hala Wardé](https://www.youtube.com/watch?v=kNuOvveSsYg) | 12 |
| French Ministry for Europe and Foreign Affairs | [Leur Génération Égalité — Marie Amélie Le Fur](https://www.youtube.com/watch?v=cCjipeqI8X4) | 12 |
| French Ministry for Europe and Foreign Affairs | [Leur Génération Égalité — Clara Gaymard](https://www.youtube.com/watch?v=_fyQLs5-D68) | 15 |
| French Ministry for Europe and Foreign Affairs | [Leur Génération Égalité — Charlotte Bienaimé](https://www.youtube.com/watch?v=Gc7yhDtBPSg) | 16 |
| French Ministry for Europe and Foreign Affairs | [Leur Génération Égalité — Tatiana et Katia Levha](https://www.youtube.com/watch?v=WmcLmdc6_RE) | 10 |
| French Ministry for Europe and Foreign Affairs | [Leur Génération Égalité — Karine Lacombe](https://www.youtube.com/watch?v=7uG8RJ0SWg4) | 12 |
| French Ministry for Europe and Foreign Affairs | [Stéphane Hessel raconte la déclaration universelle des droits de l'Homme](https://www.youtube.com/watch?v=y6Yk04e-I7U) | 25 |
| Edward wkl | [Ce que vous ne savez pas sur les Avions Présidentiels Français](https://www.youtube.com/watch?v=G0oLnVJB1ew) | 23 |
| France 3 Grand Est | [Immersion au Centre départemental de gymnastique de Troyes](https://www.youtube.com/watch?v=b87denJ3dZw) | 8 |
| Julien Malara | [Ils ont créé un Écolieu en 6 mois ! — Manoir Des Possibles](https://www.youtube.com/watch?v=HFBBxaCYO6Q) | 99 |

Les identifiants vont de `prosody_yt_001` à `prosody_yt_350`. Les métadonnées
correspondantes sont dans `src/data/prosody.json` : `sourceUrl`, `license`,
`attribution`, `sourceRange` (le passage d'origine) et `timing: 'measured'`.

CC BY autorise la redistribution et la modification, y compris commerciale, à
condition de créditer l'auteur, d'indiquer la licence et de signaler les
modifications — c'est exactement ce que contient `attribution`.

## Extraits personnels (hors dépôt)

`npm run prosody:youtube -- build --personal` produit des extraits à partir de
contenus dont la licence ne permet pas la rediffusion, pour un usage privé.
Ils sont écrits dans `src/data/prosody.personal.json` et préfixés
`prosody_perso_`, deux chemins ignorés par git : ils ne peuvent pas être publiés
par accident. `prosodyRepository.ts` les fusionne quand le fichier est présent,
et l'application se comporte à l'identique quand il est absent.

Ces extraits n'entrent pas dans le test de qualité éditoriale, qui ne porte que
sur la banque publiée.

Ils sont encodés avec l'encodeur disponible : `libvorbis` s'il est compilé dans
ffmpeg, sinon `libopus` en 48 kHz — même conteneur Ogg, lu par les mêmes
navigateurs.

## Produire de nouveaux extraits

`npm run prosody:youtube` enchaîne `yt-dlp`, la transcription et `ffmpeg`
(voir `--help`). En mode par défaut, il refuse d'écrire une entrée tant que
`sourceUrl`, `license` et `attribution` ne sont pas remplis dans la sélection
relue. Il lit la licence Creative Commons déclarée par YouTube et remplit ces
champs tout seul quand la vidéo en a une ; aucune licence n'est devinée.

`--retelling "<texte>"` fixe l'idée de restitution pour tous les extraits d'une
vidéo, surchargeable extrait par extrait dans `candidates.json`.

`--url` est répétable : les vidéos sont traitées à la suite et leurs extraits
s'ajoutent au même fichier, les identifiants se continuant sans collision.
Chaque vidéo garde son cache, donc un lot déjà téléchargé n'est pas repris.

`build` est idempotent : un marqueur `.built.json` dans le cache liste les
passages déjà exportés, et les suivants sont ignorés. Sans lui, relancer la
commande dupliquerait tous les extraits sous de nouveaux identifiants, rien
dans l'entrée ne permettant de retrouver la vidéo d'origine.

## Ajouter un enregistrement sous licence à la banque publiée

Une entrée `modelKind: 'recording'` doit pointer vers `audio/prosody/<id>.ogg`
et porter `timing: 'measured'`, `sourceUrl` en `https://`, `license`
(`CC0-1.0`, `CC-BY-3.0`, `CC-BY-SA-3.0` ou `CC-BY-SA-4.0`) et `attribution`.
Les voix humaines sont prioritaires sur les modèles synthétiques quand
l'application choisit un exercice.
