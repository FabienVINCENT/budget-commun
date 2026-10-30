import { describe, expect, it } from 'vitest'
import { compute, freePartsTotal, isFreePartsValid } from './compute'
import { defaultCategories, emptyBudget, exampleBudget } from './defaults'
import { toMonthly, toYearly } from './frequency'
import type { Budget, Charge, Person } from './types'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

function budgetWith(n: number, opts: Partial<Budget> = {}): Budget {
  const people: Person[] = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, income: 150_000 + i * 37_133, color: (i % 8) + 1 }))
  const cats = defaultCategories()
  let k = 0
  const charges: Charge[] = []
  for (const c of cats) {
    for (let j = 0; j < 3; j++) {
      charges.push({ id: `c${k}`, label: `C${k}`, amount: 1001 + k * 3331, frequency: (['mensuel', 'trimestriel', 'annuel'] as const)[k % 3], categoryId: c.id, override: null })
      k++
    }
  }
  return { v: 1, example: false, mode: 'egal', people, categories: cats, charges, freeParts: {}, ...opts }
}

function expectExact(b: Budget, mode = b.mode) {
  const r = compute(b, mode)
  const expectedTotal = sum(b.charges.map((c) => toMonthly(c.amount, c.frequency)))
  expect(r.total).toBe(expectedTotal)
  expect(sum(r.parts)).toBe(r.total)
  for (const g of r.categories) {
    expect(sum(g.parts)).toBe(g.monthly)
    expect(g.parts.every(Number.isInteger)).toBe(true)
  }
  return r
}

describe('fréquences', () => {
  it('ramène au mois et à l’année', () => {
    expect(toMonthly(151200, 'annuel')).toBe(12600)
    expect(toMonthly(9600, 'trimestriel')).toBe(3200)
    expect(toMonthly(1000, 'annuel')).toBe(83) // 83,33 → 83
    expect(toMonthly(1001, 'trimestriel')).toBe(334) // 333,67 → 334
    expect(toYearly(1349, 'mensuel')).toBe(16188)
    expect(toYearly(9600, 'trimestriel')).toBe(38400)
    expect(toYearly(151200, 'annuel')).toBe(151200)
  })
})

describe('compute : exemple de la maquette', () => {
  const b = exampleBudget()
  it('donne le pot, les sous-totaux et le prorata attendus', () => {
    const r = expectExact(b)
    expect(r.total).toBe(245046)
    expect(r.yearly).toBe(2940552)
    expect(r.parts).toEqual([117558, 127488])
    expect(r.categories.map((g) => g.category.id).slice(0, 5)).toEqual(['logement', 'enfants', 'assurances', 'energie', 'abonnements'])
    const abo = r.categories.find((g) => g.category.id === 'abonnements')!
    expect(abo.monthly).toBe(8146)
    expect(abo.yearly).toBe(97752)
    expect(abo.count).toBe(5)
    const log = r.categories.find((g) => g.category.id === 'logement')!
    expect(log.parts).toEqual([77190, 83710])
  })
  it('à parts égales', () => {
    expect(expectExact(b, 'egal').parts).toEqual([122523, 122523])
  })
  it('trie les catégories vides à la fin, dans l’ordre d’origine', () => {
    const r = compute(b)
    expect(r.categories.slice(-3).map((g) => g.category.id)).toEqual(['transport', 'courses', 'divers'])
  })
})

describe('compute : sommes exactes', () => {
  it.each([2, 3, 6, 20])('pour %i personnes, dans les 3 modes', (n) => {
    const b = budgetWith(n)
    b.freeParts = Object.fromEntries(b.people.map((p, i) => [p.id, i === 0 ? 1000 - Math.floor(1000 / n) * (n - 1) : Math.floor(1000 / n)]))
    expect(isFreePartsValid(b)).toBe(true)
    for (const m of ['egal', 'prorata', 'libre'] as const) expectExact(b, m)
  })
})

describe('compute : règles par charge', () => {
  it('« payée par » met toute la charge sur une personne', () => {
    const b = budgetWith(3)
    b.charges = [{ id: 'x', label: 'Parking', amount: 8000, frequency: 'mensuel', categoryId: 'transport', override: { type: 'payer', personId: 'p2' } }]
    const r = expectExact(b)
    expect(r.parts).toEqual([0, 0, 8000])
  })
  it('« sur mesure » suit les pourcentages de la charge', () => {
    const b = budgetWith(3)
    b.charges = [{ id: 'x', label: 'Netflix', amount: 1349, frequency: 'mensuel', categoryId: 'abonnements', override: { type: 'custom', parts: { p0: 500, p2: 500 } } }]
    const r = expectExact(b)
    expect(r.parts).toEqual([675, 0, 674])
    expect(r.customInvalid).toEqual([])
  })
  it('signale un « sur mesure » qui ne fait pas 100 %', () => {
    const b = budgetWith(2)
    b.charges = [{ id: 'x', label: 'X', amount: 1000, frequency: 'mensuel', categoryId: 'divers', override: { type: 'custom', parts: { p0: 300 } } }]
    const r = expectExact(b)
    expect(r.customInvalid).toEqual(['x'])
  })
  it('un payeur disparu repasse dans le partage général', () => {
    const b = budgetWith(2)
    b.charges = [{ id: 'x', label: 'X', amount: 1001, frequency: 'mensuel', categoryId: 'divers', override: { type: 'payer', personId: 'nobody' } }]
    expect(expectExact(b).parts).toEqual([501, 500])
  })
  it('une catégorie inconnue tombe dans Divers', () => {
    const b = budgetWith(2)
    b.charges = [{ id: 'x', label: 'X', amount: 500, frequency: 'mensuel', categoryId: 'zzz', override: null }]
    const r = compute(b)
    expect(r.categories[0].category.id).toBe('divers')
    expect(r.categories[0].monthly).toBe(500)
  })
})

describe('parts libres', () => {
  it('valide un total de 100 % seulement', () => {
    const b = budgetWith(2, { mode: 'libre', freeParts: { p0: 450, p1: 540 } })
    expect(freePartsTotal(b)).toBe(990)
    expect(compute(b).valid).toBe(false)
    b.freeParts.p1 = 550
    const r = expectExact(b)
    expect(r.valid).toBe(true)
  })
  it('ignore les parts de personnes absentes', () => {
    const b = budgetWith(2, { freeParts: { p0: 500, p1: 500, ghost: 300 } })
    expect(freePartsTotal(b)).toBe(1000)
  })
})

describe('cas vides et revenus nuls', () => {
  it('budget vide : tout à zéro, sans NaN', () => {
    const r = compute(emptyBudget())
    expect(r.total).toBe(0)
    expect(r.parts).toEqual([0, 0])
    expect(r.categories).toHaveLength(8)
    expect(r.categories.every((g) => g.monthly === 0 && g.count === 0)).toBe(true)
  })
  it('aucune personne : le pot existe, sans parts', () => {
    const b = budgetWith(0)
    const r = compute(b)
    expect(r.total).toBeGreaterThan(0)
    expect(r.parts).toEqual([])
  })
  it('prorata sans revenus : partage à parts égales, signalé', () => {
    const b = budgetWith(3)
    b.people.forEach((p) => (p.income = 0))
    const r = expectExact(b, 'prorata')
    expect(r.prorataFallback).toBe(true)
    expect(Math.max(...r.parts) - Math.min(...r.parts)).toBeLessThanOrEqual(8)
  })
  it('prorata avec un revenu nul : cette personne ne paie rien', () => {
    const b = budgetWith(2)
    b.people[0].income = 0
    const r = expectExact(b, 'prorata')
    expect(r.parts[0]).toBe(0)
    expect(r.prorataFallback).toBe(false)
  })
  it('aucune catégorie : rien à compter, pas de plantage', () => {
    const b = budgetWith(2)
    b.categories = []
    const r = compute(b)
    expect(r.total).toBe(0)
  })
})
