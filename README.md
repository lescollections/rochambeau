![](documentation/rochambeau_small.png)

# Rochambeau

![img](documentation/english.png) US English, french version at the bottom

Rochambeau is a PWA, a public frontend for collections display, based on an export plugin format for CollectiveAccess.

Rochambeau is being developed for the lescollections.fr project as a lightweight alternative to Pawtucket for small collections: collections are streamed from Apache (JSON plus images), and most interactions are handled directly in the browser's memory.

## I'd prefer a theme for Pawtucket

Have a look at [github.com/deploiement-ideesculture/onePagePawtucket](https://github.com/deploiement-ideesculture/onePagePawtucket)

## Why this name... ?

Rochambeau is the connecting thread. Born in Vendôme in 1725, an hour's drive from Le Mans, the marshal landed at Newport in 1780 with 6,000 men, on the very shore that now holds his monument. His family château still overlooks the Loir at Thoré-la-Rochette, while an avenue and a public library in Providence carry his name — two territories, a single place name, and an unbroken round trip spanning two and a half centuries.

The nod is all the more fitting because CollectiveAccess has made Rhode Island its internal toponymy: Providence for the cataloging back office, Pawtucket for the public-facing interface, Tiverton and Pascoag for other variants. Working on these tools from the Sarthe already means handling, day in and day out, the map of the state where Rochambeau first set foot. This name is both a connecting thread and a living hommage to the work done by Seth Kaufman et l'équipe de Whirl-i-Gig.

## Stack

Vue 3, TypeScript, Vite, vue-router, Tailwind CSS, `vite-plugin-pwa`. Nothing else: search,
image viewer and translations are a few dozen lines each, and are kept in-tree rather than
pulled from libraries that may not outlive the collections they serve.

## Getting started

```sh
npm install
npm run dev        # http://localhost:5173 — serves example/ as the collection
npm run build      # produces dist/
npm run typecheck
```

In development, the files from `example/` (`collection.json`, `objets.ndjson`, `objets.csv`,
`objets.xlsx`) are served at the server root, exactly where the app expects them in production.

### Versioning

Every commit ships its own version. A `pre-commit` hook raises the patch number in
`package.json` (and in `package-lock.json`) and takes it along in the commit. Hooks live in the
repository, so each clone activates them once:

```sh
git config core.hooksPath .githooks
```

The version is frozen into the bundle as `__APP_VERSION__`, shown in the footer. That is what
makes a bump reach the visitor: the precached files change, the service worker sees a new build,
and the update banner offers it — a code change alone would do the same, but a version bump makes
it deliberate. Amending a commit runs the hook again, so amend with `--no-verify`. The dev server
reads the version at startup: bump it and restart to see it change.

### Demo sets

`example/` holds the Toulouse set (108 works, 40 of them without a picture). `example/cleveland/`
holds a load-testing set of 2,500 CC0 works from the Cleveland Museum of Art, all with pictures —
the ceiling of the lescollections.fr plans. Serve either one:

```sh
npm run dev                    # Toulouse, 108 works
DEMO=cleveland npm run dev     # Cleveland, 2 500 works
```

The Cleveland set is regenerated with `python3 scripts/fetch-cleveland.py [count]`. The script
needs no dependency, but picks up `openpyxl` when it is available to produce a nicer workbook:

```sh
python3 -m venv .venv && .venv/bin/pip install openpyxl
.venv/bin/python3 scripts/fetch-cleveland.py 2500
```

## Deployment

A showcase is the contents of `dist/` plus the collection files, side by side in one directory
served by Apache. `public/.htaccess` ships with the rewrite rule for clean URLs, the MIME type
for NDJSON, compression and cache headers.

For a subdirectory deployment, the build must know its base path, and `RewriteBase` in
`.htaccess` must match it:

```sh
VITE_BASE=/vitrines/augustins/ npm run build
```

## How it works

`collection.json` is read first: it gives the total (for the progress bar) and the field schema.
`objets.ndjson` is then streamed line by line, so progress is exact without loading the file
twice. Everything stays in memory afterwards — searching, filtering and browsing never hit the
network again. The whole interface is driven by the schema: no field name is hard-coded, so any
collection in the `lescollections-vitrine/1` format renders as-is.

Images are never bundled: they are referenced by URL and cached by the service worker as the
visitor browses.

## Screen captures of the interface

See [interface.md](https://github.com/lescollections/rochambeau/blob/main/documentation/interface.md)

---

# Rochambeau

![img](documentation/french.png) French, US English version at the top

Rochambeau est une application PWA, une interface publique destinée à la présentation des collections, qui s'appuie sur un plugin d'exportation pour CollectiveAccess.

Rochambeau est développé pour le projet lescollections.fr, afin de fournir une alternative légère à Pawtucket pour des petites collections : les collections y sont streamées depuis Apache (JSON + images) et l'essentiel des interactions est géré directement depuis la mémoire du navigateur.

## Pourquoi ce nom ?

Rochambeau fait le lien : né à Vendôme en 1725, à une heure de route du Mans, le maréchal débarque en 1780 à Newport avec 6 000 hommes, sur le rivage qui porte aujourd'hui son monument. Son château familial domine toujours le Loir à Thoré-la-Rochette, tandis qu'une avenue et une bibliothèque de Providence portent son nom — deux territoires, un seul toponyme, et un aller-retour ininterrompu depuis deux siècles et demi.

Le clin d'œil est d'autant plus juste que CollectiveAccess a fait du Rhode Island sa toponymie interne : Providence pour le back-office de catalogage, Pawtucket pour l'interface publique, Tiverton et Pascoag pour d'anciennes déclinaisons. Travailler sur ces outils depuis la Sarthe, c'est déjà manipuler au quotidien la carte de l'État où Rochambeau a posé le pied. C'est autant un trait d'union qu'un hommage au travail réalisé par Seth Kaufman et l'équipe de Whirl-i-Gig.

## Socle technique

Vue 3, TypeScript, Vite, vue-router, Tailwind CSS, `vite-plugin-pwa`. Rien d'autre : la
recherche, la visionneuse et les traductions font quelques dizaines de lignes chacune et
restent dans le dépôt, plutôt que de dépendre de bibliothèques qui pourraient ne pas survivre
aux collections qu'elles servent.

## Démarrage

```sh
npm install
npm run dev        # http://localhost:5173 — sert example/ comme collection
npm run build      # produit dist/
npm run typecheck
```

En développement, les fichiers d'`example/` (`collection.json`, `objets.ndjson`, `objets.csv`,
`objets.xlsx`) sont servis à la racine, exactement là où l'application les attend en production.

### Versionnage

Chaque commit porte sa propre version. Un hook `pre-commit` incrémente le numéro de correctif
dans `package.json` (et dans `package-lock.json`) et l'emporte dans le commit. Les hooks sont
versionnés dans le dépôt, chaque clone les active une fois :

```sh
git config core.hooksPath .githooks
```

La version est figée dans le bundle sous `__APP_VERSION__` et affichée dans le pied de page.
C'est ce qui fait qu'une incrémentation atteint le visiteur : les fichiers préchargés changent,
le service worker voit une nouvelle version et le bandeau de mise à jour la propose — une
modification de code produirait le même effet, mais l'incrément le rend délibéré. Un
`git commit --amend` rejoue le hook : amender avec `--no-verify`. Le serveur de développement lit
la version au démarrage, il faut le relancer pour la voir changer.

### Jeux de démonstration

`example/` contient le jeu toulousain (108 œuvres, dont 40 sans image). `example/cleveland/`
contient un jeu de montée en charge : 2 500 œuvres CC0 du Cleveland Museum of Art, toutes avec
image — le plafond des formules de lescollections.fr. Pour servir l'un ou l'autre :

```sh
npm run dev                    # Toulouse, 108 œuvres
DEMO=cleveland npm run dev     # Cleveland, 2 500 œuvres
```

Le jeu Cleveland se régénère avec `python3 scripts/fetch-cleveland.py [nombre]`. Le script ne
requiert aucune dépendance, mais utilise `openpyxl` s'il est disponible pour produire un
classeur plus soigné :

```sh
python3 -m venv .venv && .venv/bin/pip install openpyxl
.venv/bin/python3 scripts/fetch-cleveland.py 2500
```

## Déploiement

Une vitrine, c'est le contenu de `dist/` et les fichiers de la collection, côte à côte dans un
répertoire servi par Apache. `public/.htaccess` fournit la règle de réécriture pour les URL
propres, le type MIME du NDJSON, la compression et les en-têtes de cache.

Pour un déploiement en sous-répertoire, la construction doit connaître son chemin de base, et
`RewriteBase` dans `.htaccess` doit correspondre :

```sh
VITE_BASE=/vitrines/augustins/ npm run build
```

## Fonctionnement

`collection.json` est lu en premier : il donne le total (pour la barre de progression) et le
schéma des champs. `objets.ndjson` est ensuite streamé ligne par ligne, ce qui rend la
progression exacte sans lire le fichier deux fois. Tout reste ensuite en mémoire : rechercher,
filtrer et naviguer ne touchent plus au réseau. L'interface entière est pilotée par le schéma —
aucun nom de champ n'est écrit en dur, donc toute collection au format
`lescollections-vitrine/1` s'affiche telle quelle.

Les images ne sont jamais empaquetées : elles sont référencées par URL et mises en cache par le
service worker au fil de la consultation.

## Captures d'écran de l'interface

Voir [documentation/interface.md](https://github.com/lescollections/rochambeau/blob/main/documentation/interface.md)
