/**
 * Types du format « lescollections-vitrine/1 ».
 * Contrat figé le 2026-08-11 — voir example/formatvitrine.md.
 */

export const FORMAT_ATTENDU = 'lescollections-vitrine/1'

/** Type d'un champ du schéma. `texte` est le seul type de la v1 ; les autres sont réservés. */
export type TypeChamp = 'texte' | 'date' | 'nombre' | 'liste'

export interface Champ {
  /** Clé technique, référencée par les objets. */
  code: string
  /** Intitulé affiché. */
  libelle: string
  type: TypeChamp
  /** Champ proposé comme filtre. Non exploité en v1 de la vitrine, mais conservé. */
  facette?: boolean
}

export interface InfosCollection {
  slug: string
  titre: string
  description?: string
  /** Code de langue de la collection (« fr », « en »…). */
  langue?: string
  nb_objets: number
}

export interface Manifeste {
  format: string
  genere_le?: string
  collection: InfosCollection
  /** Schéma des champs. **L'ordre est l'ordre d'affichage.** */
  champs: Champ[]
  /** Nom du fichier NDJSON, relatif au manifeste. */
  objets: string
}

export interface Image {
  /** URL de la version d'affichage pleine (jamais l'original). */
  plein: string
  /** URL de la vignette. Peut être identique à `plein`. */
  apercu: string
  /** Largeur en pixels de `plein`, pour réserver la place. */
  l?: number
  /** Hauteur en pixels de `plein`. */
  h?: number
  legende?: string
  /** Image de couverture de l'objet — une seule par objet. */
  principale?: boolean
}

/** Une valeur de champ : chaîne, ou tableau de chaînes si le champ est multi-valué. */
export type ValeurChamp = string | string[]

export interface Objet {
  /** Identifiant stable (n° d'inventaire), unique dans la collection. */
  id: string
  titre: string
  /** Métadonnées par `code` du schéma. Seuls les champs non vides sont présents. */
  champs: Record<string, ValeurChamp>
  images: Image[]
  credit?: string
}

/** Un objet enrichi des données dérivées calculées une fois au chargement. */
export interface ObjetIndexe extends Objet {
  /** Position dans le fichier, qui fait foi pour l'ordre d'affichage. */
  rang: number
  /** Image de couverture : la principale, à défaut la première. */
  couverture?: Image
  /** Texte concaténé et normalisé de l'objet, pour la recherche. */
  texteRecherche: string
}
