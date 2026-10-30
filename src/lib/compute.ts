import { monthlyOf, yearlyOf } from './frequency'
import { PERMILLE, splitLargestRemainder } from './money'
import type { Budget, Category, Charge, Person, SplitMode } from './types'

export interface CategoryResult {
  category: Category
  /** Ordre d'origine (départage des égalités). */
  order: number
  /** Sous-total mensuel, en centimes. */
  monthly: number
  /** Sous-total annuel exact, en centimes. */
  yearly: number
  count: number
  /** Part de chaque personne pour cette catégorie (même ordre que budget.people). */
  parts: number[]
}

export interface Result {
  mode: SplitMode
  /** Pot commun mensuel. */
  total: number
  /** Pot commun annuel (somme des montants annuels exacts). */
  yearly: number
  /** Versement mensuel de chaque personne. */
  parts: number[]
  /** Catégories triées par sous-total décroissant (vides comprises, à la fin). */
  categories: CategoryResult[]
  /** Somme des revenus mensuels. */
  incomes: number
  /** false si le mode « parts libres » ne fait pas 100 %. */
  valid: boolean
  /** Prorata demandé mais aucun revenu saisi : partage à parts égales. */
  prorataFallback: boolean
  /** Charges « sur mesure » dont les % ne font pas 100 (partagées au prorata des % saisis). */
  customInvalid: string[]
}

export const freePartsTotal = (b: Pick<Budget, 'people' | 'freeParts'>): number =>
  b.people.reduce((s, p) => s + (b.freeParts[p.id] ?? 0), 0)

export const isFreePartsValid = (b: Pick<Budget, 'people' | 'freeParts'>): boolean =>
  freePartsTotal(b) === PERMILLE

export const customPartsTotal = (people: readonly Person[], parts: Record<string, number>): number =>
  people.reduce((s, p) => s + (parts[p.id] ?? 0), 0)

/** Poids de partage de chaque personne selon le mode. */
export function weightsFor(b: Pick<Budget, 'people' | 'freeParts'>, mode: SplitMode): number[] {
  if (mode === 'prorata') return b.people.map((p) => Math.max(0, p.income))
  if (mode === 'libre') return b.people.map((p) => Math.max(0, b.freeParts[p.id] ?? 0))
  return b.people.map(() => 1)
}

/**
 * Le partage se fait catégorie par catégorie : chaque ligne
 * (catégorie × personnes) tombe juste au centime près, donc le total aussi.
 */
export function compute(b: Budget, mode: SplitMode = b.mode): Result {
  const people = b.people
  const n = people.length
  const index = new Map(people.map((p, i) => [p.id, i]))
  const weights = weightsFor(b, mode)
  const incomes = people.reduce((s, p) => s + Math.max(0, p.income), 0)
  const fallbackCat = b.categories.find((c) => c.id === 'divers') ?? b.categories[b.categories.length - 1]

  const acc = b.categories.map((category, order) => ({
    category,
    order,
    monthly: 0,
    yearly: 0,
    count: 0,
    general: 0,
    parts: new Array<number>(n).fill(0),
  }))
  const byId = new Map(acc.map((a) => [a.category.id, a]))
  const fallback = fallbackCat ? byId.get(fallbackCat.id) : undefined

  for (const c of b.charges) {
    const g = byId.get(c.categoryId) ?? fallback
    if (!g) continue
    const m = monthlyOf(c)
    g.monthly += m
    g.yearly += yearlyOf(c)
    g.count++
    if (n === 0) continue
    assignCharge(c, m, people, index, g)
  }

  if (n > 0) {
    for (const g of acc) {
      splitLargestRemainder(g.general, weights).forEach((v, i) => (g.parts[i] += v))
    }
  }

  const categories: CategoryResult[] = acc
    .map(({ category, order, monthly, yearly, count, parts }) => ({ category, order, monthly, yearly, count, parts }))
    .sort((a, b2) => b2.monthly - a.monthly || a.order - b2.order)

  return {
    mode,
    total: categories.reduce((s, g) => s + g.monthly, 0),
    yearly: categories.reduce((s, g) => s + g.yearly, 0),
    parts: people.map((_, i) => categories.reduce((s, g) => s + g.parts[i], 0)),
    categories,
    incomes,
    valid: mode !== 'libre' || isFreePartsValid(b),
    prorataFallback: mode === 'prorata' && n > 0 && incomes === 0,
    customInvalid: b.charges
      .filter((c) => c.override?.type === 'custom' && customPartsTotal(people, c.override.parts) !== PERMILLE)
      .map((c) => c.id),
  }
}

function assignCharge(
  c: Charge,
  monthly: number,
  people: readonly Person[],
  index: Map<string, number>,
  g: { general: number; parts: number[] },
): void {
  const ov = c.override
  if (ov?.type === 'payer') {
    const i = index.get(ov.personId)
    if (i !== undefined) {
      g.parts[i] += monthly
      return
    }
  } else if (ov?.type === 'custom') {
    const w = people.map((p) => Math.max(0, ov.parts[p.id] ?? 0))
    splitLargestRemainder(monthly, w).forEach((v, i) => (g.parts[i] += v))
    return
  }
  g.general += monthly
}
