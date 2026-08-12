# Format « lescollections-vitrine/1 »

Le **contrat** entre la source (un plugin d'export CollectiveAccess, à écrire) et la
**vitrine publique** (application PWA, développée à part). Objectif : une collection publiée
= un petit ensemble de fichiers **statiques**, **streamables**, servis **sans réveiller
Providence**.

> Statut : format figé v1 (2026-08-11). Le jeu de démonstration de Toulouse (108 œuvres,
> opendata) est produit dans ce format exact — il sert de référence concrète et de corpus de
> test pour la PWA, avant même l'existence du plugin.

## 1. Vue d'ensemble

Une collection publiée produit, à chaque passe d'export, ces fichiers côte à côte :

| Fichier            | Rôle                                                        |
|--------------------|-------------------------------------------------------------|
| `collection.json`  | Le **manifeste** : schéma des champs + métadonnées + total. |
| `objets.ndjson`    | Les objets, **un par ligne** (NDJSON), pour le streaming.   |
| `objets.csv`       | La même vue, **tabulaire** — téléchargement « Ma vitrine ». |
| `objets.xlsx`      | Idem, classeur.                                             |

Les images ne sont **pas** dans ces fichiers : elles sont **référencées par URL** (versions
d'affichage, jamais les originaux).

Ces fichiers sont **statiques** : produits par la passe d'export (objets **publiés**
seulement), déposés dans un emplacement servi sans Providence. La PWA lit le JSON, la tuile
« Ma vitrine publique » de /compte pointe le CSV/XLSX — **aucun réveil de pod** dans les deux
cas. Le pod ne se réveille que pour **éditer** (`/gestion`).

## 2. `collection.json` — le manifeste

Petit, chargé en premier : il donne le **total** (barre de progression) et le **schéma**.

```json
{
  "format": "lescollections-vitrine/1",
  "genere_le": "2026-08-11T00:00:00Z",
  "collection": {
    "slug": "augustins",
    "titre": "Œuvres déposées au musée des Augustins",
    "description": "…",
    "langue": "fr",
    "nb_objets": 108
  },
  "champs": [
    { "code": "denomination", "libelle": "Dénomination", "type": "texte" },
    { "code": "auteur",       "libelle": "Auteur",       "type": "texte", "facette": true },
    { "code": "datation",     "libelle": "Datation",     "type": "texte", "facette": true }
  ],
  "objets": "objets.ndjson"
}
```

- **`champs[]`** : le schéma. **L'ordre est l'ordre d'affichage.** `code` = clé technique
  (référencée par les objets), `libelle` = intitulé montré, `type` = `texte` en v1 (extensible :
  `date`, `nombre`, `liste`…), `facette: true` = champ proposé comme filtre. La PWA rend
  **n'importe quelle** collection à partir de ce schéma, sans rien coder en dur.

## 3. `objets.ndjson` — les objets

**Un objet JSON par ligne**, séparés par `\n` (NDJSON). Format **trivialement incrémental**
en JavaScript (découpage sur `\n`), donc la progression au premier chargement est gratuite :
le manifeste donne le total, on compte les lignes reçues.

```json
{"id":"D 1888 1","titre":"Bords du Touch","champs":{"denomination":"tableau","auteur":"YARZ, Edmond","datation":"1888 avant"},"images":[{"plein":"…/files/e31b…","apercu":"…/files/e31b…","l":550,"h":800,"legende":"Bords du Touch","principale":true}],"credit":"© Bernard Delorme"}
```

Par objet :

| Clé       | Type            | Sens                                                           |
|-----------|-----------------|----------------------------------------------------------------|
| `id`      | chaîne          | Identifiant stable (n° d'inventaire). Unique dans la collection.|
| `titre`   | chaîne          | Le titre affiché en tête de fiche.                             |
| `champs`  | objet `code→valeur` | Les métadonnées, par `code` du schéma. **Seuls les champs non vides sont présents.** Valeur = chaîne, ou tableau de chaînes pour un champ multi-valué. |
| `images`  | tableau         | Voir ci-dessous. Vide si l'objet n'a pas d'image.             |
| `credit`  | chaîne          | Mention de crédit / copyright (facultatif).                    |

Une image :

| Clé          | Sens                                                              |
|--------------|------------------------------------------------------------------|
| `plein`      | URL de la version **d'affichage pleine** (grande, pas l'original TIFF). |
| `apercu`     | URL de la **vignette** (liste, grille). Peut égaler `plein` s'il n'y a qu'une taille. |
| `l`, `h`     | Largeur / hauteur en pixels de `plein` (pour réserver la place, éviter le reflow). |
| `legende`    | Légende de l'image (facultatif).                                 |
| `principale` | `true` pour l'image de couverture de l'objet (une seule).        |

## 4. `objets.csv` / `objets.xlsx` — la vue tabulaire

La **même** donnée, à plat : colonnes = `id`, `titre`, puis les `champs` dans l'ordre du
schéma, puis `credit` et l'URL de l'image principale. En-tête = **libellés lisibles**. C'est
ce que « Ma vitrine publique » offre en téléchargement — un export **réversibilité** pratique
des objets **publiés** (à distinguer de la **sauvegarde** complète SQL+médias de « Mes
sauvegardes », qui contient TOUT, publié ou non).

## 5. Correspondance Providence → format (pour le plugin)

Le plugin d'export parcourt les objets **publiés** (`ca_objects`, accès public) et produit :

| Sortie              | Source Providence                                             |
|---------------------|--------------------------------------------------------------|
| `id`                | `ca_objects.idno` (n° d'inventaire)                          |
| `titre`             | libellé préféré de l'objet (`preferred_labels`)             |
| `champs`            | attributs (éléments de métadonnées) sélectionnés par le profil d'affichage — `code` = code de l'élément, `libelle` = son intitulé, ordre = ordre du profil |
| `champs[].facette`  | éléments configurés comme filtres dans le profil            |
| `images[]`          | `ca_object_representations` → **dérivés d'affichage** (`large`, `thumbnail`), jamais l'original |
| `credit`            | l'attribut de crédit média, si présent                      |

Le même parcours alimente NDJSON, CSV et XLSX **en une passe**.

## 6. Jeu de démonstration (Toulouse, Augustins)

108 œuvres en opendata (Toulouse Métropole), transformées dans ce format par
`scripts/…/transform.py` (voir le scratchpad de la session du 2026-08-11). Sert de corpus de
test à la PWA. Les URL d'images pointent l'hébergement opendata de Toulouse (versions ~550×800).
