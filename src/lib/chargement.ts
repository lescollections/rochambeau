import {
  FORMAT_ATTENDU,
  type Image,
  type Manifeste,
  type Objet,
  type ObjetIndexe,
} from '@/types'
import { aplatir, normaliserPourIndex } from '@/lib/texte'

/**
 * Les fichiers de la collection sont déposés à côté de l'application : on résout
 * tout relativement à la base de déploiement (`/`, `/vitrines/augustins/`…).
 */
export function urlDonnees(nomFichier: string): string {
  return new URL(nomFichier, new URL(import.meta.env.BASE_URL, location.href)).href
}

export class ErreurFormat extends Error {}

export async function chargerManifeste(signal?: AbortSignal): Promise<Manifeste> {
  const reponse = await fetch(urlDonnees('collection.json'), { signal })
  if (!reponse.ok) {
    throw new ErreurFormat(`collection.json : réponse ${reponse.status}`)
  }

  const manifeste = (await reponse.json()) as Manifeste
  if (manifeste?.format !== FORMAT_ATTENDU) {
    throw new ErreurFormat(
      `format « ${String(manifeste?.format)} » non reconnu (attendu « ${FORMAT_ATTENDU} »)`,
    )
  }
  if (!Array.isArray(manifeste.champs) || !manifeste.collection) {
    throw new ErreurFormat('collection.json incomplet : « champs » ou « collection » manquant')
  }

  return manifeste
}

/** Choisit l'image de couverture : la principale, à défaut la première disponible. */
function couvertureDe(images: Image[] | undefined): Image | undefined {
  if (!Array.isArray(images) || images.length === 0) return undefined
  return images.find((image) => image.principale) ?? images[0]
}

/**
 * Prépare l'objet une fois pour toutes : couverture et texte de recherche sont
 * calculés au chargement, jamais pendant la frappe.
 */
export function indexer(objet: Objet, rang: number): ObjetIndexe {
  const morceaux = [objet.id, objet.titre]
  for (const valeur of Object.values(objet.champs ?? {})) {
    morceaux.push(aplatir(valeur))
  }

  return {
    ...objet,
    champs: objet.champs ?? {},
    images: Array.isArray(objet.images) ? objet.images : [],
    rang,
    couverture: couvertureDe(objet.images),
    texteRecherche: normaliserPourIndex(morceaux.filter(Boolean).join(' ')),
  }
}

export interface OptionsFlux {
  signal?: AbortSignal
  /** Appelé à chaque lot d'objets décodés, pour faire avancer la barre de progression. */
  surLot?: (objets: ObjetIndexe[], totalRecus: number) => void
  /** Taille d'un lot. Assez grand pour ne pas saturer le rendu, assez petit pour rester vivant. */
  tailleLot?: number
}

/**
 * Lit `objets.ndjson` ligne par ligne, sans jamais matérialiser le fichier entier.
 * Le NDJSON se découpe sur « \n » : la progression est donc gratuite, le manifeste
 * ayant déjà donné le total.
 */
export async function chargerObjets(
  nomFichier: string,
  options: OptionsFlux = {},
): Promise<ObjetIndexe[]> {
  const { signal, surLot, tailleLot = 200 } = options

  const reponse = await fetch(urlDonnees(nomFichier), { signal })
  if (!reponse.ok || !reponse.body) {
    throw new ErreurFormat(`${nomFichier} : réponse ${reponse.status}`)
  }

  const tous: ObjetIndexe[] = []
  let lot: ObjetIndexe[] = []
  let reste = ''

  const viderLot = () => {
    if (lot.length === 0) return
    tous.push(...lot)
    surLot?.(lot, tous.length)
    lot = []
  }

  const ajouterLigne = (ligne: string) => {
    const contenu = ligne.trim()
    if (!contenu) return
    let objet: Objet
    try {
      objet = JSON.parse(contenu) as Objet
    } catch {
      // Une ligne corrompue ne doit pas emporter toute la vitrine.
      console.warn('Rochambeau : ligne NDJSON illisible, ignorée')
      return
    }
    if (!objet?.id) return
    lot.push(indexer(objet, tous.length + lot.length))
    if (lot.length >= tailleLot) viderLot()
  }

  const lecteur = reponse.body.pipeThrough(new TextDecoderStream()).getReader()
  try {
    for (;;) {
      const { done, value } = await lecteur.read()
      if (done) break

      const morceaux = (reste + value).split('\n')
      reste = morceaux.pop() ?? ''
      for (const ligne of morceaux) ajouterLigne(ligne)
    }
  } finally {
    lecteur.releaseLock()
  }

  if (reste) ajouterLigne(reste)
  viderLot()

  return tous
}
