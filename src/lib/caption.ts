import type { CollectionObject } from '@/types'
import { flatten } from '@/lib/text'

/**
 * Editorial caption, following the usual museum convention:
 *
 *   Eugène Delacroix, La Liberté guidant le peuple, 1830, huile sur toile,
 *   Paris, musée du Louvre.
 *
 * The showcase is otherwise schema-driven and hard-codes no field name, but a
 * caption has a fixed reading order, so the field codes below act as a
 * convention of the format: any that is missing is simply skipped.
 */
const CAPTION_ORDER = [
  'auteur',
  // titre is inserted here, it is not a field
  'datation',
  'technique',
  'materiaux',
  'ville',
  'localisation',
] as const

export function editorialCaption(object: CollectionObject): string {
  const parts: string[] = []

  const author = flatten(object.champs.auteur).trim()
  if (author) parts.push(author)
  if (object.titre) parts.push(object.titre)

  for (const code of CAPTION_ORDER) {
    if (code === 'auteur') continue
    const value = flatten(object.champs[code]).trim()
    if (value) parts.push(value)
  }

  if (parts.length === 0) return ''
  return `${parts.join(', ')}.`
}
