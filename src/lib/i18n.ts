import { computed, ref } from 'vue'

/**
 * Minimal internationalization: two languages, about sixty strings.
 * Small enough not to warrant a dependency, centralized enough that adding a
 * language means adding one entry to MESSAGES.
 */

export const LOCALES = ['fr', 'en'] as const
export type Locale = (typeof LOCALES)[number]

const STORAGE_KEY = 'rochambeau:locale'

type Messages = Record<string, string>

const MESSAGES: Record<Locale, Messages> = {
  fr: {
    'app.title': 'Vitrine de collection',
    'app.skip_to_content': 'Aller au contenu',
    'app.back_to_collection': 'Retour à la collection',

    'loading.manifest': 'Ouverture de la collection…',
    'loading.objects': 'Chargement des œuvres',
    'loading.count': '{received} sur {total}',

    'error.title': 'La collection n’a pas pu être ouverte',
    'error.retry': 'Réessayer',
    'error.detail': 'Détail technique :',

    'search.label': 'Rechercher dans la collection',
    'search.placeholder': 'Rechercher un titre, un auteur, une matière…',
    'search.clear': 'Effacer la recherche',
    'search.empty': 'Aucune œuvre ne correspond à cette recherche.',
    'search.empty_hint': 'Essayez avec moins de mots, ou une autre orthographe.',

    'list.results': 'Aucune œuvre | {n} œuvre | {n} œuvres',
    'list.of_total': 'sur {total}',
    'list.no_image': 'Sans image',

    'object.not_found': 'Cette œuvre est introuvable dans la collection.',
    'object.previous': 'Œuvre précédente',
    'object.next': 'Œuvre suivante',
    'object.position': '{position} sur {total}',
    'object.identifier': 'N° d’inventaire',
    'object.credit': 'Crédit',
    'object.enlarge': 'Agrandir l’image',

    'viewer.title': 'Visionneuse',
    'viewer.close': 'Fermer',
    'viewer.previous': 'Image précédente',
    'viewer.next': 'Image suivante',
    'viewer.counter': '{position} / {total}',

    'locale.label': 'Langue',
    'locale.fr': 'Français',
    'locale.en': 'English',

    'pwa.update_available': 'Une nouvelle version de la vitrine est disponible.',
    'pwa.update': 'Mettre à jour',
    'pwa.offline_ready': 'La vitrine est prête à fonctionner hors connexion.',
    'pwa.dismiss': 'Ignorer',

    'footer.generated_on': 'Données mises à jour le {date}',
    'footer.objects': 'Catalogue vide | {n} œuvre au catalogue | {n} œuvres au catalogue',
  },
  en: {
    'app.title': 'Collection showcase',
    'app.skip_to_content': 'Skip to content',
    'app.back_to_collection': 'Back to the collection',

    'loading.manifest': 'Opening the collection…',
    'loading.objects': 'Loading works',
    'loading.count': '{received} of {total}',

    'error.title': 'The collection could not be opened',
    'error.retry': 'Try again',
    'error.detail': 'Technical detail:',

    'search.label': 'Search the collection',
    'search.placeholder': 'Search a title, an artist, a material…',
    'search.clear': 'Clear search',
    'search.empty': 'No work matches this search.',
    'search.empty_hint': 'Try fewer words, or a different spelling.',

    'list.results': 'No work | {n} work | {n} works',
    'list.of_total': 'of {total}',
    'list.no_image': 'No image',

    'object.not_found': 'This work cannot be found in the collection.',
    'object.previous': 'Previous work',
    'object.next': 'Next work',
    'object.position': '{position} of {total}',
    'object.identifier': 'Accession no.',
    'object.credit': 'Credit',
    'object.enlarge': 'Enlarge image',

    'viewer.title': 'Viewer',
    'viewer.close': 'Close',
    'viewer.previous': 'Previous image',
    'viewer.next': 'Next image',
    'viewer.counter': '{position} / {total}',

    'locale.label': 'Language',
    'locale.fr': 'Français',
    'locale.en': 'English',

    'pwa.update_available': 'A new version of the showcase is available.',
    'pwa.update': 'Update',
    'pwa.offline_ready': 'The showcase is ready to work offline.',
    'pwa.dismiss': 'Dismiss',

    'footer.generated_on': 'Data updated on {date}',
    'footer.objects': 'Empty catalogue | {n} work in the catalogue | {n} works in the catalogue',
  },
}

function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

function readStoredLocale(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function initialLocale(): Locale {
  const stored = readStoredLocale()
  if (isLocale(stored)) return stored

  for (const preferred of navigator.languages ?? []) {
    const code = preferred.split('-')[0]
    if (isLocale(code)) return code
  }
  return 'fr'
}

const current = ref<Locale>(initialLocale())

export const locale = computed<Locale>(() => current.value)

export function setLocale(next: Locale): void {
  current.value = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Private browsing: the preference holds for the session, which is enough.
  }
  document.documentElement.lang = next
}

/**
 * Applies the locale declared by the manifest, unless the visitor already made
 * a choice: their preference outranks the collection's.
 */
export function suggestLocale(code: string | undefined): void {
  if (!isLocale(readStoredLocale())) {
    const suggested = code?.split('-')[0]
    if (isLocale(suggested)) current.value = suggested
  }
  document.documentElement.lang = current.value
}

type Params = Record<string, string | number>

function interpolate(template: string, params: Params): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  )
}

/**
 * Translates a key. Pluralized templates separate their forms with "|" in the
 * order zero | singular | plural, selected from the `n` parameter.
 */
export function t(key: string, params: Params = {}): string {
  const messages = MESSAGES[current.value]
  const template = messages[key] ?? MESSAGES.fr[key] ?? key

  const forms = template.split('|')
  if (forms.length === 1) return interpolate(template, params)

  const n = Number(params.n ?? 0)
  const index = n === 0 ? 0 : n === 1 ? 1 : 2
  // `n` drives the plural form and is displayed, so it is formatted on the way out.
  const form = (forms[index] ?? forms[forms.length - 1] ?? template).trim()
  return interpolate(form, { ...params, n: formatNumber(n) })
}

/** Formats an ISO date in the current locale; returns the raw string if unparsable. */
export function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(current.value, { dateStyle: 'long' }).format(date)
}

/** Formats a number in the current locale (thousands separators). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(current.value).format(value)
}
