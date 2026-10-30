import { describe, expect, it } from 'vitest'
import { formatEuros, formatPct, parseEuros, parsePermille, permilleToInput, centsToInput, ratio, splitLargestRemainder } from './money'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('splitLargestRemainder', () => {
  it('partage 1 centime entre 3 sans en perdre', () => {
    expect(splitLargestRemainder(1, [1, 1, 1])).toEqual([1, 0, 0])
    expect(splitLargestRemainder(100, [1, 1, 1])).toEqual([34, 33, 33])
  })

  it('donne le reste aux plus gros restes, puis dans l’ordre', () => {
    // 1000 × 1/6 = 166,67 ; 1000 × 2/6 = 333,33 ; 1000 × 3/6 = 500
    expect(splitLargestRemainder(1000, [1, 2, 3])).toEqual([167, 333, 500])
  })

  it('respecte un prorata', () => {
    const r = splitLargestRemainder(245046, [296000, 321000])
    expect(sum(r)).toBe(245046)
    // 245046 × 2960/6170 = 117558,6… → 117559
    expect(r).toEqual([117559, 127487])
  })

  it('ne donne rien à un poids nul et partage à parts égales si tout est nul', () => {
    expect(splitLargestRemainder(1001, [0, 1, 1])).toEqual([0, 501, 500])
    expect(splitLargestRemainder(1001, [0, 0])).toEqual([501, 500])
  })

  it('ignore les poids négatifs ou non finis', () => {
    expect(splitLargestRemainder(10, [-5, Number.NaN, 2])).toEqual([0, 0, 10])
  })

  it('gère zéro, une seule personne et aucune personne', () => {
    expect(splitLargestRemainder(0, [3, 4])).toEqual([0, 0])
    expect(splitLargestRemainder(999, [7])).toEqual([999])
    expect(splitLargestRemainder(999, [])).toEqual([])
  })

  it('reste exact avec de très gros nombres', () => {
    const r = splitLargestRemainder(9_999_999_999, [9_999_999_999, 1, 7_777_777_777])
    expect(sum(r)).toBe(9_999_999_999)
  })

  it('refuse un total non entier', () => {
    expect(() => splitLargestRemainder(1.5, [1, 1])).toThrow(RangeError)
  })

  it.each([2, 3, 6, 20])('la somme tombe juste pour %i personnes (1000 tirages)', (n) => {
    let seed = n * 7919
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
    for (let k = 0; k < 1000; k++) {
      const total = Math.floor(rnd() * 1_000_000)
      const w = Array.from({ length: n }, () => Math.floor(rnd() * 600_000))
      const r = splitLargestRemainder(total, w)
      expect(sum(r)).toBe(total)
      expect(r.every(Number.isInteger)).toBe(true)
      // Personne ne s'écarte de plus d'un centime de sa part exacte.
      const W = sum(w)
      r.forEach((v, i) => expect(Math.abs(v - (W ? (total * w[i]) / W : total / n))).toBeLessThan(1))
    }
  })
})

describe('saisie', () => {
  it('lit les euros à la française', () => {
    expect(parseEuros('13,49')).toBe(1349)
    expect(parseEuros('1 234,5 €')).toBe(123450)
    expect(parseEuros('1\u202f483')).toBe(148300)
    expect(parseEuros('9.99')).toBe(999)
    expect(parseEuros(',5')).toBe(50)
  })
  it('arrondit le 3e chiffre sans erreur de flottant', () => {
    expect(parseEuros('1.005')).toBe(101)
    expect(parseEuros('0,004')).toBe(0)
  })
  it('refuse le texte, le négatif, les doublons de séparateur et l’absurde', () => {
    for (const s of ['', 'abc', '-3', '1,2,3', '1e5', '.', '99999999999']) expect(parseEuros(s)).toBeNull()
  })
  it('lit les pourcentages en pour-mille', () => {
    expect(parsePermille('33,3')).toBe(333)
    expect(parsePermille('50 %')).toBe(500)
    expect(parsePermille('100')).toBe(1000)
    expect(parsePermille('100,1')).toBeNull()
    expect(parsePermille('x')).toBeNull()
  })
})

describe('formatage', () => {
  const clean = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ')
  it('affiche les décimales seulement si utiles', () => {
    expect(clean(formatEuros(148300))).toBe('1 483 €')
    expect(clean(formatEuros(1349))).toBe('13,49 €')
    expect(clean(formatEuros(148300, true))).toBe('1 483,00 €')
    expect(clean(formatEuros(-500))).toBe('−5 €')
    expect(clean(formatEuros(Number.NaN))).toBe('0 €')
  })
  it('formate les pourcentages et les valeurs de champ', () => {
    expect(clean(formatPct(0.3968))).toBe('39,7 %')
    expect(clean(formatPct(Number.POSITIVE_INFINITY))).toBe('0 %')
    expect(permilleToInput(333)).toBe('33,3')
    expect(clean(centsToInput(296000))).toBe('2 960')
    expect(ratio(5, 0)).toBe(0)
  })
})
