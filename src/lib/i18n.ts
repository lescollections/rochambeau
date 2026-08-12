import { computed, ref } from 'vue'

/**
 * Internationalisation minimale : deux langues, une soixantaine de chaînes.
 * Assez petit pour ne pas justifier une dépendance, assez centralisé pour qu'ajouter
 * une langue consiste à ajouter une entrée dans `TRADUCTIONS`.
 */

export const LANGUES = ['fr', 'en'] as const
export type Langue = (typeof LANGUES)[number]

const CLE_STOCKAGE = 'rochambeau:langue'

type Dictionnaire = Record<string, string>

const TRADUCTIONS: Record<Langue, Dictionnaire> = {
  fr: {
    'app.titre': 'Vitrine de collection',
    'app.aller_contenu': 'Aller au contenu',
    'app.retour_accueil': 'Retour à la collection',

    'chargement.manifeste': 'Ouverture de la collection…',
    'chargement.objets': 'Chargement des œuvres',
    'chargement.compte': '{recus} sur {total}',

    'erreur.titre': 'La collection n’a pas pu être ouverte',
    'erreur.reessayer': 'Réessayer',
    'erreur.detail': 'Détail technique :',

    'recherche.libelle': 'Rechercher dans la collection',
    'recherche.marque': 'Rechercher un titre, un auteur, une matière…',
    'recherche.effacer': 'Effacer la recherche',
    'recherche.aucun': 'Aucune œuvre ne correspond à cette recherche.',
    'recherche.aucun_conseil': 'Essayez avec moins de mots, ou une autre orthographe.',

    'liste.resultats': '{n} œuvre | {n} œuvre | {n} œuvres',
    'liste.sur_total': 'sur {total}',
    'liste.sans_image': 'Sans image',
    'liste.voir': 'Voir la fiche',

    'objet.introuvable': 'Cette œuvre est introuvable dans la collection.',
    'objet.precedent': 'Œuvre précédente',
    'objet.suivant': 'Œuvre suivante',
    'objet.position': '{position} sur {total}',
    'objet.identifiant': 'N° d’inventaire',
    'objet.credit': 'Crédit',
    'objet.images': 'Images',
    'objet.agrandir': 'Agrandir l’image',

    'visionneuse.titre': 'Visionneuse',
    'visionneuse.fermer': 'Fermer',
    'visionneuse.precedente': 'Image précédente',
    'visionneuse.suivante': 'Image suivante',
    'visionneuse.compteur': '{position} / {total}',

    'langue.libelle': 'Langue',
    'langue.fr': 'Français',
    'langue.en': 'English',

    'pwa.disponible': 'Une nouvelle version de la vitrine est disponible.',
    'pwa.recharger': 'Mettre à jour',
    'pwa.hors_ligne': 'La vitrine est prête à fonctionner hors connexion.',
    'pwa.ignorer': 'Ignorer',

    'pied.genere_le': 'Données mises à jour le {date}',
    'pied.objets': '{n} œuvre au catalogue | {n} œuvre au catalogue | {n} œuvres au catalogue',
  },
  en: {
    'app.titre': 'Collection showcase',
    'app.aller_contenu': 'Skip to content',
    'app.retour_accueil': 'Back to the collection',

    'chargement.manifeste': 'Opening the collection…',
    'chargement.objets': 'Loading works',
    'chargement.compte': '{recus} of {total}',

    'erreur.titre': 'The collection could not be opened',
    'erreur.reessayer': 'Try again',
    'erreur.detail': 'Technical detail:',

    'recherche.libelle': 'Search the collection',
    'recherche.marque': 'Search a title, an artist, a material…',
    'recherche.effacer': 'Clear search',
    'recherche.aucun': 'No work matches this search.',
    'recherche.aucun_conseil': 'Try fewer words, or a different spelling.',

    'liste.resultats': '{n} work | {n} work | {n} works',
    'liste.sur_total': 'of {total}',
    'liste.sans_image': 'No image',
    'liste.voir': 'View record',

    'objet.introuvable': 'This work cannot be found in the collection.',
    'objet.precedent': 'Previous work',
    'objet.suivant': 'Next work',
    'objet.position': '{position} of {total}',
    'objet.identifiant': 'Accession no.',
    'objet.credit': 'Credit',
    'objet.images': 'Images',
    'objet.agrandir': 'Enlarge image',

    'visionneuse.titre': 'Viewer',
    'visionneuse.fermer': 'Close',
    'visionneuse.precedente': 'Previous image',
    'visionneuse.suivante': 'Next image',
    'visionneuse.compteur': '{position} / {total}',

    'langue.libelle': 'Language',
    'langue.fr': 'Français',
    'langue.en': 'English',

    'pwa.disponible': 'A new version of the showcase is available.',
    'pwa.recharger': 'Update',
    'pwa.hors_ligne': 'The showcase is ready to work offline.',
    'pwa.ignorer': 'Dismiss',

    'pied.genere_le': 'Data updated on {date}',
    'pied.objets': '{n} work in the catalogue | {n} work in the catalogue | {n} works in the catalogue',
  },
}

function estLangue(valeur: string | null | undefined): valeur is Langue {
  return typeof valeur === 'string' && (LANGUES as readonly string[]).includes(valeur)
}

function langueInitiale(): Langue {
  const memorisee = typeof localStorage !== 'undefined' ? localStorage.getItem(CLE_STOCKAGE) : null
  if (estLangue(memorisee)) return memorisee

  for (const preferee of navigator.languages ?? []) {
    const code = preferee.split('-')[0]
    if (estLangue(code)) return code
  }
  return 'fr'
}

const langueCourante = ref<Langue>(langueInitiale())

export const langue = computed<Langue>(() => langueCourante.value)

export function definirLangue(nouvelle: Langue): void {
  langueCourante.value = nouvelle
  try {
    localStorage.setItem(CLE_STOCKAGE, nouvelle)
  } catch {
    // Navigation privée : la préférence vaut pour la session, c'est suffisant.
  }
  document.documentElement.lang = nouvelle
}

/**
 * Applique la langue déclarée par le manifeste, sauf si le visiteur a déjà
 * exprimé un choix : sa préférence prime sur celle de la collection.
 */
export function proposerLangue(code: string | undefined): void {
  const memorisee = typeof localStorage !== 'undefined' ? localStorage.getItem(CLE_STOCKAGE) : null
  if (estLangue(memorisee)) return
  const propose = code?.split('-')[0]
  if (estLangue(propose)) langueCourante.value = propose
  document.documentElement.lang = langueCourante.value
}

type Parametres = Record<string, string | number>

function interpoler(gabarit: string, parametres: Parametres): string {
  return gabarit.replace(/\{(\w+)\}/g, (entier, cle: string) =>
    cle in parametres ? String(parametres[cle]) : entier,
  )
}

/**
 * Traduit une clé. Les gabarits à pluriel séparent leurs formes par « | » dans
 * l'ordre zéro | singulier | pluriel, et sont choisis d'après le paramètre `n`.
 */
export function t(cle: string, parametres: Parametres = {}): string {
  const dictionnaire = TRADUCTIONS[langueCourante.value]
  const gabarit = dictionnaire[cle] ?? TRADUCTIONS.fr[cle] ?? cle

  const formes = gabarit.split('|')
  if (formes.length === 1) return interpoler(gabarit, parametres)

  const n = Number(parametres.n ?? 0)
  const index = n === 0 ? 0 : n === 1 ? 1 : 2
  return interpoler((formes[index] ?? formes[formes.length - 1] ?? gabarit).trim(), parametres)
}

/** Formate une date ISO dans la langue courante ; renvoie la chaîne brute si illisible. */
export function formaterDate(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(langueCourante.value, { dateStyle: 'long' }).format(date)
}

/** Formate un nombre dans la langue courante (séparateurs de milliers). */
export function formaterNombre(valeur: number): string {
  return new Intl.NumberFormat(langueCourante.value).format(valeur)
}
