import {
  EXPECTED_FORMAT,
  type CollectionObject,
  type IndexedObject,
  type Manifest,
  type Picture,
} from '@/types'
import { flatten, normalizeForIndex } from '@/lib/text'

/**
 * Collection files sit next to the application, so everything resolves against
 * the deployment base ("/", "/vitrines/augustins/"…).
 */
export function dataUrl(fileName: string): string {
  return new URL(fileName, new URL(import.meta.env.BASE_URL, location.href)).href
}

export class FormatError extends Error {}

export async function loadManifest(signal?: AbortSignal): Promise<Manifest> {
  const response = await fetch(dataUrl('collection.json'), { signal })
  if (!response.ok) {
    throw new FormatError(`collection.json: HTTP ${response.status}`)
  }

  const manifest = (await response.json()) as Manifest
  if (manifest?.format !== EXPECTED_FORMAT) {
    throw new FormatError(
      `unknown format "${String(manifest?.format)}" (expected "${EXPECTED_FORMAT}")`,
    )
  }
  if (!Array.isArray(manifest.champs) || !manifest.collection) {
    throw new FormatError('incomplete collection.json: missing "champs" or "collection"')
  }

  return manifest
}

/** Picks the cover image: the one flagged as main, or the first one available. */
function coverOf(images: Picture[] | undefined): Picture | undefined {
  if (!Array.isArray(images) || images.length === 0) return undefined
  return images.find((image) => image.principale) ?? images[0]
}

/**
 * Prepares an object once and for all: cover and search text are computed at
 * load time, never while the visitor is typing.
 */
export function index(object: CollectionObject, rank: number): IndexedObject {
  const parts = [object.id, object.titre]
  for (const value of Object.values(object.champs ?? {})) {
    parts.push(flatten(value))
  }

  return {
    ...object,
    champs: object.champs ?? {},
    images: Array.isArray(object.images) ? object.images : [],
    rank,
    cover: coverOf(object.images),
    searchText: normalizeForIndex(parts.filter(Boolean).join(' ')),
  }
}

export interface StreamOptions {
  signal?: AbortSignal
  /** Called for each decoded batch, to advance the progress bar. */
  onBatch?: (objects: IndexedObject[], totalReceived: number) => void
  /** Batch size. Large enough not to thrash rendering, small enough to stay lively. */
  batchSize?: number
}

/**
 * Reads objets.ndjson line by line, never materializing the whole file.
 * NDJSON splits on "\n", so progress comes for free: the manifest already
 * provided the total.
 */
export async function loadObjects(
  fileName: string,
  options: StreamOptions = {},
): Promise<IndexedObject[]> {
  const { signal, onBatch, batchSize = 200 } = options

  const response = await fetch(dataUrl(fileName), { signal })
  if (!response.ok || !response.body) {
    throw new FormatError(`${fileName}: HTTP ${response.status}`)
  }

  const all: IndexedObject[] = []
  let batch: IndexedObject[] = []
  let remainder = ''

  const flushBatch = () => {
    if (batch.length === 0) return
    all.push(...batch)
    onBatch?.(batch, all.length)
    batch = []
  }

  const pushLine = (line: string) => {
    const content = line.trim()
    if (!content) return
    let object: CollectionObject
    try {
      object = JSON.parse(content) as CollectionObject
    } catch {
      // A single corrupt line must not take the whole showcase down.
      console.warn('Rochambeau: unreadable NDJSON line, skipped')
      return
    }
    if (!object?.id) return
    batch.push(index(object, all.length + batch.length))
    if (batch.length >= batchSize) flushBatch()
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      const chunks = (remainder + value).split('\n')
      remainder = chunks.pop() ?? ''
      for (const line of chunks) pushLine(line)
    }
  } finally {
    reader.releaseLock()
  }

  if (remainder) pushLine(remainder)
  flushBatch()

  return all
}
