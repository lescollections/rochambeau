/**
 * Types for the "lescollections-vitrine/1" format.
 * Contract frozen on 2026-08-11 — see example/formatvitrine.md.
 *
 * Property names below are the actual JSON keys, which the format defines in
 * French: they are part of the contract and must not be translated.
 */

export const EXPECTED_FORMAT = 'lescollections-vitrine/1'

/** Field type. "texte" is the only v1 type; the others are reserved. */
export type FieldType = 'texte' | 'date' | 'nombre' | 'liste'

export interface Field {
  /** Technical key, referenced by objects. */
  code: string
  /** Displayed label. */
  libelle: string
  type: FieldType
  /** Field offered as a filter. Unused in v1 of the showcase, but preserved. */
  facette?: boolean
}

export interface CollectionInfo {
  slug: string
  titre: string
  description?: string
  /** Collection language code ("fr", "en"…). */
  langue?: string
  nb_objets: number
}

export interface Manifest {
  format: string
  genere_le?: string
  collection: CollectionInfo
  /** Field schema. **Order is display order.** */
  champs: Field[]
  /** NDJSON file name, relative to the manifest. */
  objets: string
}

export interface Picture {
  /** URL of the full display version (never the original). */
  plein: string
  /** Thumbnail URL. May be identical to `plein`. */
  apercu: string
  /** Width of `plein` in pixels, used to reserve layout space. */
  l?: number
  /** Height of `plein` in pixels. */
  h?: number
  legende?: string
  /** Cover image of the object — only one per object. */
  principale?: boolean
}

/** A field value: a string, or an array of strings when the field is multi-valued. */
export type FieldValue = string | string[]

export interface CollectionObject {
  /** Stable identifier (accession number), unique within the collection. */
  id: string
  titre: string
  /** Metadata keyed by schema `code`. Only non-empty fields are present. */
  champs: Record<string, FieldValue>
  images: Picture[]
  credit?: string
}

/** An object enriched with derived data computed once at load time. */
export interface IndexedObject extends CollectionObject {
  /** Position in the file, which defines display order. */
  rank: number
  /** Cover image: the one flagged as main, or the first one available. */
  cover?: Picture
  /** Concatenated, normalized text of the object, used for search. */
  searchText: string
}
