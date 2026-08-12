/**
 * Text normalization shared by search and sorting.
 * No diacritics, no case, punctuation collapsed to spaces: "Maître de Rieux"
 * and "maitre  de rieux," produce the same string.
 */

const DIACRITICS = /[\u0300-\u036f]/g
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]+/gu

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, ' ')
    .trim()
}

/**
 * Normalizes while keeping a leading and trailing space, so that searching for
 * " word" tests a word boundary with a plain indexOf.
 */
export function normalizeForIndex(value: string): string {
  const normalized = normalize(value)
  return normalized ? ` ${normalized} ` : ''
}

export function splitTerms(query: string): string[] {
  const normalized = normalize(query)
  return normalized ? normalized.split(' ').filter(Boolean) : []
}

/** Flattens a field value (string or array) into a displayable string. */
export function flatten(value: string | string[] | undefined): string {
  if (value === undefined) return ''
  return Array.isArray(value) ? value.join(' — ') : value
}
