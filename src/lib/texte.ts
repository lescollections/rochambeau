/**
 * Normalisation de texte partagée par la recherche et les tris.
 * Sans diacritiques, sans casse, ponctuation réduite à des espaces : « Maître de Rieux »
 * et « maitre  de rieux, » produisent la même chaîne.
 */

const DIACRITIQUES = /[\u0300-\u036f]/g
const NON_ALPHANUM = /[^\p{L}\p{N}]+/gu

export function normaliser(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .toLowerCase()
    .replace(NON_ALPHANUM, ' ')
    .trim()
}

/**
 * Normalise en gardant un espace en tête et en queue, de sorte qu'une recherche
 * de ` mot` teste un début de mot par simple `indexOf`.
 */
export function normaliserPourIndex(valeur: string): string {
  const normalise = normaliser(valeur)
  return normalise ? ` ${normalise} ` : ''
}

export function decouperEnTermes(requete: string): string[] {
  const normalise = normaliser(requete)
  return normalise ? normalise.split(' ').filter(Boolean) : []
}

/** Aplatit une valeur de champ (chaîne ou tableau) en une chaîne affichable. */
export function aplatir(valeur: string | string[] | undefined): string {
  if (valeur === undefined) return ''
  return Array.isArray(valeur) ? valeur.join(' — ') : valeur
}

/** Comparateur de chaînes respectant l'ordre alphabétique français. */
const collateur = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' })

export function comparerTextes(a: string, b: string): number {
  return collateur.compare(a, b)
}
