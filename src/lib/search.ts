import type { IndexedObject } from '@/types'
import { splitTerms } from '@/lib/text'

/**
 * In-memory full-text search over the normalized text computed at load time.
 *
 * Rules: every term must be present (AND), each one matching at a **word start**
 * — "rieu" finds "Rieux", "ieux" finds nothing. At 2,500 objects a linear scan
 * costs well under a millisecond, so there is no inverted index to maintain.
 */

interface ScoredMatch {
  object: IndexedObject
  score: number
}

const TITLE_WEIGHT = 8
const ID_WEIGHT = 5
const FIELD_WEIGHT = 1
const WHOLE_WORD_BONUS = 2

function scoreTerm(object: IndexedObject, term: string): number {
  const position = object.searchText.indexOf(` ${term}`)
  if (position === -1) return 0

  // searchText concatenates id, then titre, then the fields, in that order:
  // the match position alone tells us what was hit.
  const idEnd = 1 + object.id.length
  const titleEnd = idEnd + 1 + object.titre.length

  let score = position < idEnd ? ID_WEIGHT : position < titleEnd ? TITLE_WEIGHT : FIELD_WEIGHT

  const next = object.searchText[position + 1 + term.length]
  if (next === ' ' || next === undefined) score += WHOLE_WORD_BONUS

  return score
}

export function search(objects: readonly IndexedObject[], query: string): IndexedObject[] {
  const terms = splitTerms(query)
  if (terms.length === 0) return objects as IndexedObject[]

  const matches: ScoredMatch[] = []
  for (const object of objects) {
    let total = 0
    let complete = true
    for (const term of terms) {
      const score = scoreTerm(object, term)
      if (score === 0) {
        complete = false
        break
      }
      total += score
    }
    if (complete) matches.push({ object, score: total })
  }

  // On equal scores the file order wins: it carries the cataloguer's intent.
  matches.sort((a, b) => b.score - a.score || a.object.rank - b.object.rank)
  return matches.map((match) => match.object)
}

/**
 * Splits a text for highlighting the matched terms.
 * Returns a sequence of fragments, each either marked or not.
 */
export interface Fragment {
  text: string
  marked: boolean
}

const ALPHANUMERIC = /[\p{L}\p{N}]/u

/**
 * Normalizes character by character, guaranteeing a string of the same length as
 * the original: this is what lets matched positions be applied to the displayed
 * text. The rare characters whose lowercase or decomposition changes length
 * (İ, ﬁ…) are left as-is rather than shifting everything after them.
 */
function alignedNormalize(text: string): string {
  let output = ''
  for (let i = 0; i < text.length; i += 1) {
    const character = text[i] as string
    const base = character.normalize('NFD')[0] ?? character
    const lower = base.toLowerCase()
    output += lower.length === 1 ? lower : character
  }
  return output
}

function isWordStart(text: string, position: number): boolean {
  if (position === 0) return true
  return !ALPHANUMERIC.test(text[position - 1] as string)
}

export function highlight(text: string, query: string): Fragment[] {
  const terms = splitTerms(query)
  if (terms.length === 0 || !text) return [{ text, marked: false }]

  const probe = alignedNormalize(text)

  const marks = new Array<boolean>(text.length).fill(false)
  for (const term of terms) {
    let from = 0
    for (;;) {
      const position = probe.indexOf(term, from)
      if (position === -1) break
      from = position + 1
      if (!isWordStart(probe, position)) continue
      for (let i = 0; i < term.length; i += 1) marks[position + i] = true
    }
  }

  const fragments: Fragment[] = []
  let start = 0
  for (let i = 1; i <= text.length; i += 1) {
    if (i === text.length || marks[i] !== marks[start]) {
      fragments.push({ text: text.slice(start, i), marked: marks[start] === true })
      start = i
    }
  }
  return fragments
}
