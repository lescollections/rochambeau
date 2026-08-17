import type { Field, IndexedObject } from '@/types'
import { locale } from '@/lib/i18n'

/**
 * Filtering by field value. The format flags `facette` on a few fields but
 * never lists their values: the options are read from the collection itself,
 * which also keeps the dropdowns honest — only values that exist are offered.
 */

/** Query parameters carrying a filter, so a filtered view can be shared. */
export const FILTER_PREFIX = 'f.'

/**
 * Beyond that, a dropdown stops being browsable and the search bar is the tool.
 * Data fragmented into hundreds of free-text values is unmanageable as a list,
 * however faithfully it describes the collection.
 */
const MAX_OPTIONS = 1000

/**
 * A filter is only useful when values repeat. A field whose values are almost
 * all distinct — dimensions, an inventory note — describes a single work rather
 * than a category, and would produce a dropdown as long as the collection.
 */
const MAX_DISTINCT_SHARE = 0.5

/**
 * Chosen values, keyed by field code. Several values of the same field widen
 * the selection ("in oak or in walnut"), where two fields narrow it.
 */
export type Selection = Readonly<Record<string, readonly string[]>>

export interface FacetOption {
  value: string
  /** Number of matching works, given the search and the other filters. */
  count: number
}

export interface Facet {
  code: string
  libelle: string
  options: FacetOption[]
}

/** The values of a field, a multi-valued one counting once per entry. */
function valuesOf(object: IndexedObject, code: string): string[] {
  const raw = object.champs[code]
  if (raw === undefined) return []
  const list = Array.isArray(raw) ? raw : [raw]
  return list.map((value) => value.trim()).filter(Boolean)
}

/**
 * Fields worth offering as a dropdown, in schema order (which is display
 * order). Computed from the whole collection, so the list of filters stays put
 * as the visitor narrows things down.
 */
export function filterableFields(
  objects: readonly IndexedObject[],
  fields: readonly Field[],
): Field[] {
  return fields.filter((field) => {
    const distinct = new Set<string>()
    let filled = 0

    for (const object of objects) {
      const values = valuesOf(object, field.code)
      if (values.length === 0) continue
      filled += 1
      for (const value of values) distinct.add(value)
    }

    // A single value filters nothing at all.
    if (distinct.size < 2 || distinct.size > MAX_OPTIONS) return false
    // The cataloguer's flag outranks the heuristic: they know their fields.
    return field.facette === true || distinct.size <= filled * MAX_DISTINCT_SHARE
  })
}

function matches(object: IndexedObject, selection: Selection): boolean {
  for (const code in selection) {
    const chosen = selection[code]
    if (!chosen || chosen.length === 0) continue
    const values = valuesOf(object, code)
    if (!chosen.some((value) => values.includes(value))) return false
  }
  return true
}

export function isEmpty(selection: Selection): boolean {
  return !Object.values(selection).some((values) => values.length > 0)
}

export function applyFilters(
  objects: readonly IndexedObject[],
  selection: Selection,
): IndexedObject[] {
  if (isEmpty(selection)) return objects as IndexedObject[]
  return objects.filter((object) => matches(object, selection))
}

function without(selection: Selection, code: string): Selection {
  const { [code]: _omitted, ...rest } = selection
  return rest
}

/**
 * Builds one dropdown per filterable field, counted against the works already
 * matching the search.
 *
 * A field's own filter is left out of its own counts: a list must keep offering
 * the siblings of the ticked values, otherwise widening a choice would mean
 * clearing it first. The other filters do apply, so a combination that leads
 * nowhere is never offered.
 */
export function buildFacets(
  objects: readonly IndexedObject[],
  fields: readonly Field[],
  selection: Selection,
): Facet[] {
  const collator = new Intl.Collator(locale.value, { numeric: true, sensitivity: 'base' })

  const facets: Facet[] = []
  for (const field of fields) {
    const others = without(selection, field.code)
    const counts = new Map<string, number>()

    for (const object of objects) {
      if (!matches(object, others)) continue
      // A value repeated within one object still counts for one work.
      for (const value of new Set(valuesOf(object, field.code))) {
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
    }

    // The search may have swept away everything a chosen value stood for; it
    // still has to show, or it could no longer be unticked.
    for (const chosen of selection[field.code] ?? []) {
      if (!counts.has(chosen)) counts.set(chosen, 0)
    }

    // A field left without any value by the current narrowing keeps its empty
    // dropdown rather than disappearing: the row of filters would otherwise
    // reflow under the pointer between two choices.
    const options = [...counts].map(([value, count]) => ({ value, count }))
    options.sort((a, b) => collator.compare(a.value, b.value))
    facets.push({ code: field.code, libelle: field.libelle, options })
  }

  return facets
}
