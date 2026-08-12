import type { ObjetIndexe } from '@/types'
import { decouperEnTermes } from '@/lib/texte'

/**
 * Recherche plein texte, en mémoire, sur le texte normalisé calculé au chargement.
 *
 * Règles : tous les termes doivent être présents (ET), chacun en **début de mot**
 * — « rieu » trouve « Rieux », « ieux » ne trouve rien. À 2 500 objets, un balayage
 * linéaire coûte moins d'une milliseconde : pas d'index inversé à maintenir.
 */

export interface Resultat {
  objet: ObjetIndexe
  score: number
}

const POIDS_TITRE = 8
const POIDS_ID = 5
const POIDS_CHAMP = 1
const BONUS_MOT_ENTIER = 2

function scoreTerme(objet: ObjetIndexe, terme: string): number {
  const position = objet.texteRecherche.indexOf(` ${terme}`)
  if (position === -1) return 0

  // `texteRecherche` concatène id, titre puis les champs, dans cet ordre :
  // la position de la correspondance suffit à savoir ce qui a été touché.
  const finId = 1 + objet.id.length
  const finTitre = finId + 1 + objet.titre.length

  let score = position < finId ? POIDS_ID : position < finTitre ? POIDS_TITRE : POIDS_CHAMP

  const suivant = objet.texteRecherche[position + 1 + terme.length]
  if (suivant === ' ' || suivant === undefined) score += BONUS_MOT_ENTIER

  return score
}

export function rechercher(objets: readonly ObjetIndexe[], requete: string): ObjetIndexe[] {
  const termes = decouperEnTermes(requete)
  if (termes.length === 0) return objets as ObjetIndexe[]

  const resultats: Resultat[] = []
  for (const objet of objets) {
    let total = 0
    let complet = true
    for (const terme of termes) {
      const score = scoreTerme(objet, terme)
      if (score === 0) {
        complet = false
        break
      }
      total += score
    }
    if (complet) resultats.push({ objet, score: total })
  }

  // À score égal, l'ordre du fichier fait foi : il porte l'intention du catalogueur.
  resultats.sort((a, b) => b.score - a.score || a.objet.rang - b.objet.rang)
  return resultats.map((resultat) => resultat.objet)
}

/**
 * Découpe un texte pour le surlignage des termes trouvés.
 * Renvoie une suite de fragments, chacun marqué ou non.
 */
export interface Fragment {
  texte: string
  marque: boolean
}

const ALPHANUM = /[\p{L}\p{N}]/u

/**
 * Normalise caractère par caractère, en garantissant une chaîne de même longueur
 * que l'original : indispensable pour reporter les positions trouvées sur le texte
 * affiché. Les rares caractères dont la minuscule ou la décomposition change de
 * longueur (İ, ﬁ…) sont laissés tels quels plutôt que de décaler tout le reste.
 */
function normaliserAligne(texte: string): string {
  let sortie = ''
  for (let i = 0; i < texte.length; i += 1) {
    const caractere = texte[i] as string
    const base = caractere.normalize('NFD')[0] ?? caractere
    const minuscule = base.toLowerCase()
    sortie += minuscule.length === 1 ? minuscule : caractere
  }
  return sortie
}

function debutDeMot(texte: string, position: number): boolean {
  if (position === 0) return true
  return !ALPHANUM.test(texte[position - 1] as string)
}

export function surligner(texte: string, requete: string): Fragment[] {
  const termes = decouperEnTermes(requete)
  if (termes.length === 0 || !texte) return [{ texte, marque: false }]

  // `normaliserAligne` conserve les positions, contrairement à la normalisation
  // de l'index : ce qu'on trouve dans la copie se découpe tel quel dans l'original.
  const repere = normaliserAligne(texte)

  const marques = new Array<boolean>(texte.length).fill(false)
  for (const terme of termes) {
    let depuis = 0
    for (;;) {
      const position = repere.indexOf(terme, depuis)
      if (position === -1) break
      depuis = position + 1
      if (!debutDeMot(repere, position)) continue
      for (let i = 0; i < terme.length; i += 1) marques[position + i] = true
    }
  }

  const fragments: Fragment[] = []
  let debut = 0
  for (let i = 1; i <= texte.length; i += 1) {
    if (i === texte.length || marques[i] !== marques[debut]) {
      fragments.push({ texte: texte.slice(debut, i), marque: marques[debut] === true })
      debut = i
    }
  }
  return fragments
}
