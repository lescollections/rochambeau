/**
 * Random display order for the showcase.
 *
 * The order is drawn once per visit and kept in sessionStorage: coming back
 * from a record must not reshuffle the mosaic under the visitor, while a new
 * visit gets a fresh look at the collection. A seeded generator is what makes
 * that possible — Math.random() alone could not be replayed.
 */

const SEED_KEY = 'rochambeau:seed'

/** mulberry32: small, fast, and good enough to shuffle a few thousand items. */
function makeGenerator(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state)
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296
  }
}

function visitSeed(): number {
  try {
    const stored = sessionStorage.getItem(SEED_KEY)
    if (stored) {
      const parsed = Number(stored)
      if (Number.isFinite(parsed)) return parsed
    }
    const seed = Math.floor(Math.random() * 2 ** 32)
    sessionStorage.setItem(SEED_KEY, String(seed))
    return seed
  } catch {
    // Private browsing: the order simply changes on every navigation.
    return Math.floor(Math.random() * 2 ** 32)
  }
}

/** Fisher-Yates on a copy: the caller's array is left untouched. */
export function shuffle<T>(items: readonly T[]): T[] {
  const random = makeGenerator(visitSeed())
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j] as T, result[i] as T]
  }
  return result
}
