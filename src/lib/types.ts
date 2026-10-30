/** Montants en centimes entiers ; parts en pour-mille (1000 = 100 %). */

export type Frequency = 'mensuel' | 'trimestriel' | 'annuel'
export const FREQUENCIES: readonly Frequency[] = ['mensuel', 'trimestriel', 'annuel']

export type SplitMode = 'egal' | 'prorata' | 'libre'
export const SPLIT_MODES: readonly SplitMode[] = ['egal', 'prorata', 'libre']

export interface Person {
  id: string
  name: string
  /** Revenu net mensuel, en centimes. */
  income: number
  /** Couleur 1..8 (palette des personnes). */
  color: number
}

export interface Category {
  id: string
  name: string
  emoji: string
  /** Couleur 1..8 (palette des catégories, distincte de celle des personnes). */
  color: number
}

export type Override =
  | null
  | { type: 'payer'; personId: string }
  | { type: 'custom'; parts: Record<string, number> }

export interface Charge {
  id: string
  label: string
  /** Montant par période, en centimes. */
  amount: number
  frequency: Frequency
  categoryId: string
  override: Override
}

export interface Budget {
  v: 1
  /** Données d'exemple non modifiées. */
  example: boolean
  mode: SplitMode
  people: Person[]
  categories: Category[]
  charges: Charge[]
  /** Parts libres, en pour-mille, par personne. */
  freeParts: Record<string, number>
}

export const SCHEMA_VERSION = 1 as const
