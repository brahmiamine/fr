# Modèles d'IA

Le Worker (`worker/`) n'utilise que des modèles **gratuits**. Pour chaque fournisseur,
`worker/models.ts` liste les modèles candidats dans l'ordre : le premier qui répond
est utilisé, les suivants servent de secours.

## Tester tous les modèles

```sh
node scripts/test-ai-models.mjs                       # site déployé
node scripts/test-ai-models.mjs --provider=groq,mistral
node scripts/test-ai-models.mjs --list                # + modèles visibles par chaque clé
```

Le script appelle `GET /api/diagnose`, qui envoie la vraie tâche « question » à chaque
modèle de texte et une seconde de silence à chaque modèle de transcription, puis
affiche la réponse ou **l'erreur exacte du fournisseur** (404 modèle retiré, 403 clé
refusée, 429 quota…). Une exécution complète par minute au plus
(`AI_ACCESS_CODE` dans l'environnement si le Worker en exige un).

Quand un modèle disparaît : lancer le diagnostic avec `--list`, choisir un modèle
gratuit présent dans la liste, le mettre dans `worker/models.ts`, relancer.

## Économie de requêtes

- Un fournisseur dont la clé est refusée (401/403) est ignoré 30 min, un fournisseur
  limité (429) 1 min, un modèle retiré (400/404/410) 6 h, une autre erreur 2 min.
  Sans ça, chaque appel repayait une requête perdue par fournisseur en panne.
- Chaque appel abandonne après 20 s (30 s pour l'audio) pour passer au suivant.
- Les questions surprises d'une série sont demandées en une seule requête.
- Les modèles qui « réfléchissent » ont la réflexion coupée ou réduite.
- Une transcription de silence (« Sous-titrage… » inventé par Whisper) est vide :
  aucune analyse n'est demandée dessus.
- La vérification d'un mot n'est demandée qu'une fois par visite pour la même saisie.
