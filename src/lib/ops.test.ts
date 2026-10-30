import { describe, expect, it } from 'vitest'
import { compute } from './compute'
import { exampleBudget } from './defaults'
import {
  addCategory, addCharge, addPerson, chargesIn, ensureFreeParts, equalCustomParts, moveCharge,
  overrideChoice, removeCategory, removeCharge, removePerson, setOverride,
} from './ops'

describe('personnes', () => {
  it('ajoute et retire, en nettoyant les règles de charge', () => {
    const b = exampleBudget()
    const id = addPerson(b)!
    expect(b.people).toHaveLength(3)
    expect(b.people[2].color).toBe(3)
    expect(b.example).toBe(false)
    setOverride(b, 'ex1', `payer:${id}`)
    setOverride(b, 'ex2', 'custom')
    removePerson(b, id)
    expect(b.people).toHaveLength(2)
    expect(b.charges[0].override).toBeNull()
    expect(b.charges[1].override).toEqual({ type: 'custom', parts: { p1: 334, p2: 333 } })
    expect(id in b.freeParts).toBe(false)
  })
  it('garde au moins une personne', () => {
    const b = exampleBudget()
    removePerson(b, 'p1')
    removePerson(b, 'p2')
    expect(b.people).toHaveLength(1)
  })
})

describe('charges', () => {
  it('ajoute dans une catégorie, déplace, supprime', () => {
    const b = exampleBudget()
    const id = addCharge(b, 'transport')!
    expect(chargesIn(b, 'transport').map((c) => c.id)).toEqual([id])
    expect(moveCharge(b, id, 'courses')).toBe(true)
    expect(moveCharge(b, id, 'inexistante')).toBe(false)
    expect(chargesIn(b, 'courses')).toHaveLength(1)
    removeCharge(b, id)
    expect(b.charges).toHaveLength(11)
  })
  it('règles : mode, payée par, sur mesure', () => {
    const b = exampleBudget()
    setOverride(b, 'ex8', 'payer:p2')
    expect(overrideChoice(b.charges[7].override)).toBe('payer:p2')
    setOverride(b, 'ex8', 'payer:fantome')
    expect(b.charges[7].override).toBeNull()
    setOverride(b, 'ex8', 'custom')
    expect(overrideChoice(b.charges[7].override)).toBe('custom')
    setOverride(b, 'ex8', 'mode')
    expect(overrideChoice(b.charges[7].override)).toBe('mode')
  })
})

describe('catégories', () => {
  it('supprimer une catégorie envoie ses charges dans Divers', () => {
    const b = exampleBudget()
    const before = compute(b).total
    const to = removeCategory(b, 'abonnements')
    expect(to?.id).toBe('divers')
    expect(chargesIn(b, 'divers')).toHaveLength(5)
    expect(b.categories.some((k) => k.id === 'abonnements')).toBe(false)
    expect(compute(b).total).toBe(before)
  })
  it('recrée Divers si elle a été supprimée avant', () => {
    const b = exampleBudget()
    removeCategory(b, 'divers')
    expect(b.categories.some((k) => k.id === 'divers')).toBe(false)
    removeCategory(b, 'logement')
    expect(chargesIn(b, 'divers')).toHaveLength(2)
  })
  it('supprimer Divers avec des charges : elles vont dans une autre catégorie', () => {
    const b = exampleBudget()
    moveCharge(b, 'ex1', 'divers')
    const to = removeCategory(b, 'divers')
    expect(to).not.toBeNull()
    expect(b.charges.find((c) => c.id === 'ex1')?.categoryId).toBe(to?.id)
  })
  it('ne supprime pas la dernière catégorie', () => {
    const b = exampleBudget()
    b.categories = b.categories.filter((k) => k.id === 'divers')
    b.charges.forEach((c) => (c.categoryId = 'divers'))
    expect(removeCategory(b, 'divers')).toBeNull()
    expect(b.categories).toHaveLength(1)
  })
  it('ajoute une catégorie avec une couleur de la palette', () => {
    const b = exampleBudget()
    const id = addCategory(b)!
    const k = b.categories.find((x) => x.id === id)!
    expect(k.color).toBeGreaterThanOrEqual(1)
    expect(k.color).toBeLessThanOrEqual(8)
  })
})

describe('parts', () => {
  it('parts égales au pour-mille, somme exacte', () => {
    const b = exampleBudget()
    for (let i = 0; i < 4; i++) addPerson(b)
    const parts = equalCustomParts(b)
    expect(Object.values(parts).reduce((a, x) => a + x, 0)).toBe(1000)
  })
  it('ensureFreeParts ne touche pas des parts déjà saisies', () => {
    const b = exampleBudget()
    ensureFreeParts(b)
    expect(b.freeParts).toEqual({ p1: 450, p2: 550 })
    b.freeParts = {}
    ensureFreeParts(b)
    expect(b.freeParts).toEqual({ p1: 500, p2: 500 })
  })
})
