# Banque de prosodie — enregistrements humains

Ces fichiers sont des modèles de **voix humaines** destinés aux exercices d'écoute,
d'imitation et de shadowing. Ils sont conservés localement dans l'application pour
éviter de dépendre d'un service audio externe.

## Sources et licences

| Fichier | Source | Passage | Licence | Attribution / modifications |
| --- | --- | ---: | --- | --- |
| `prosody_real_001.ogg` | [French Dialogue - A Formal Conversation](https://commons.wikimedia.org/wiki/File:French_Dialogue_-_A_Formal_Conversation.ogg) | 0–15,418 s | CC BY-SA 3.0 | Hagindaz / Jonojet (French Wikibook), via Wikimedia Commons. Réencodé en OGG mono. |
| `prosody_real_002.ogg` | [Sophie Adenot — Wikimania 2026](https://commons.wikimedia.org/wiki/File:Sophie_Adenot_addresses_for_the_Opening_Ceremony_of_Wikimania_2026_from_the_International_Space_Station.webm) | 0–14,9 s | CC BY-SA 4.0 | Sophie Adenot, via Wikimedia Commons. Audio extrait de la vidéo et réencodé en OGG mono. |
| `prosody_real_003.ogg` | même source Sophie Adenot | 15–29,9 s | CC BY-SA 4.0 | Même attribution. Extrait découpé et réencodé. |
| `prosody_real_004.ogg` | même source Sophie Adenot | 30–44,9 s | CC BY-SA 4.0 | Même attribution. Extrait découpé et réencodé. |
| `prosody_real_005.ogg` | même source Sophie Adenot | 45–59,9 s | CC BY-SA 4.0 | Même attribution. Extrait découpé et réencodé. |
| `prosody_real_006.ogg` | [Interview du Dr Jean-Pierre Hubert](https://commons.wikimedia.org/wiki/File:Dr-Jean-Pierre-Hubert-Interview-de-8mn-r%C3%A9alis%C3%A9-en-2006-.ogg) | 0–29,8 s | CC0 1.0 | Ghylaine Manet (enregistrement), avec Jean-Pierre Hubert, via Wikimedia Commons. Extrait découpé et réencodé. |

Les métadonnées correspondantes sont également stockées dans
`src/data/prosody.json` (`sourceUrl`, `license`, `attribution`, `sourceRange`).

### Liens des licences

- CC BY-SA 3.0 : https://creativecommons.org/licenses/by-sa/3.0/
- CC BY-SA 4.0 : https://creativecommons.org/licenses/by-sa/4.0/
- CC0 1.0 : https://creativecommons.org/publicdomain/zero/1.0/

## Reproductibilité

`scripts/import-prosody-recordings.sh` télécharge les fichiers sources depuis
Wikimedia Commons, découpe les passages retenus avec ffmpeg et les normalise en
OGG mono 44,1 kHz.

Le script n'ajoute aucune source dont la licence n'a pas été explicitement
vérifiée.
