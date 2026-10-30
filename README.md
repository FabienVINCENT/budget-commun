# Budget commun

Une petite application web, gratuite et libre, pour savoir **combien chacun verse sur le compte commun** : couple, colocation, famille recomposée…

Tu notes qui participe et ce que chacun gagne, puis les charges du foyer (prêt ou loyer, énergie, assurances, abonnements…). Tu choisis comment partager, et l’app te dit tout de suite combien chacun doit virer chaque mois.

## Ce que fait l’app

- **Personnes** : autant que tu veux, avec leur revenu net par mois.
- **Charges** rangées par catégorie (Logement, Énergie, Assurances, Enfants, Abonnements, Transport, Courses, Divers). Tu peux renommer les catégories, changer leur emoji, en ajouter, en supprimer (leurs charges vont dans « Divers ») et déplacer une charge d’une catégorie à l’autre.
- Chaque charge peut être **mensuelle, trimestrielle ou annuelle** : elle est ramenée au mois.
- Une charge peut avoir sa propre règle : **payée par** une seule personne, ou **sur mesure** (tes propres pourcentages).
- **Trois façons de partager** : à parts égales, au prorata des revenus, ou parts libres (qui doivent faire 100 %).
- **Résultat** : le pot commun par mois et par an, ce que chacun vire, ce qu’il lui reste, et le détail catégorie par catégorie.
- **Comparer deux modes** : qui paierait plus ou moins avec une autre règle.

Les montants sont comptés en centimes entiers. Les partages utilisent la méthode du plus fort reste : la somme des parts tombe toujours juste, au centime près, catégorie par catégorie et au total.

## Vie privée

**Aucune donnée ne quitte ton navigateur.** Pas de compte, pas de serveur, pas de pistage, pas de statistiques. La police est servie avec l’app. Une politique de sécurité (CSP) interdit toute requête réseau depuis la page.

Ton budget est enregistré automatiquement dans ton navigateur (`localStorage`). Si tu vides les données de ton navigateur, il disparaît : pense à l’exporter.

## Comment s’en servir

1. Ouvre l’app, puis choisis **Commencer** (budget vide) ou **Voir un exemple**.
2. Remplis les personnes, puis les charges.
3. Choisis le mode de partage.
4. Lis le résultat : ce que chacun vire chaque mois.

## Partager avec l’autre

- **Lien** : le bouton « Partager » crée un lien qui contient tout le budget, compressé après le `#`. La partie après le `#` n’est jamais envoyée au serveur. La personne qui ouvre le lien retrouve le même budget. Si elle en a déjà un, l’app lui demande : « Remplacer mon budget ou garder le mien ? ».
- **QR code** : le même lien, à scanner avec un autre téléphone. Si le budget est trop grand pour un QR code, l’app le dit : envoie alors le lien ou un fichier.
- **Fichier** : « Exporter » enregistre un fichier `.json`, « Importer » le relit. Les liens et fichiers sont vérifiés avant d’être chargés : un lien abîmé affiche un message, sans rien casser.

Le lien est une copie : les changements faits ensuite ne suivent pas. Renvoie un nouveau lien après une modification.

## Développement

Il faut Node.js 22 ou plus récent.

```bash
npm ci
npm run dev        # serveur de développement
npm test           # tests unitaires (Vitest)
npm run lint       # ESLint
npm run typecheck  # vue-tsc
npm run build      # version de production dans dist/
npm run preview    # sert dist/ en local
```

Organisation :

- `src/lib/` : la logique pure, testée (calculs en centimes, fréquences, partage, validation des données, lien de partage, stockage).
- `src/components/` : l’interface en Vue 3, en CSS simple avec des variables (thèmes sombre et clair).
- `.github/workflows/` : vérifications à chaque pull request, et déploiement sur GitHub Pages à chaque push sur `main`.

Le build utilise `base: './'` : l’app marche aussi bien à la racine d’un domaine que sous `/budget-commun/`.

## Licence

[MIT](LICENSE) © 2026 Fabien Vincent
