import { describe, expect, it } from 'vitest'
import { emptyBudget, exampleBudget } from './defaults'
import { parseBudget, parseBudgetJson } from './schema'
import { decodeBudget, encodeBudget, readHash, shareUrl, QR_MAX_LENGTH } from './share'
import { STORAGE_KEY, exportJson, loadBudget, saveBudget, type KV } from './storage'

function memoryKV(init: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...init }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  }
}

describe('parseBudget', () => {
  it('accepte un budget valide tel quel', () => {
    const b = exampleBudget()
    const r = parseBudget(JSON.parse(JSON.stringify(b)))
    expect(r).toEqual({ ok: true, budget: b })
  })

  it.each([
    ['null', null],
    ['un nombre', 42],
    ['un tableau', []],
    ['une version inconnue', { v: 0 }],
    ['sans personnes', { v: 1, categories: [], charges: [] }],
  ])('refuse %s', (_, data) => {
    expect(parseBudget(data).ok).toBe(false)
  })

  it('refuse une version plus récente avec un message clair', () => {
    const r = parseBudget({ v: 99 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/plus récente/)
  })

  it('refuse les montants non entiers, négatifs ou géants', () => {
    for (const amount of [12.5, -1, 1e15, '100', Number.NaN]) {
      const b = JSON.parse(JSON.stringify(exampleBudget()))
      b.charges[0].amount = amount
      expect(parseBudget(b).ok).toBe(false)
    }
  })

  it('refuse les identifiants suspects ou en double', () => {
    const b = JSON.parse(JSON.stringify(exampleBudget()))
    b.people[0].id = '<script>'
    expect(parseBudget(b).ok).toBe(false)
    const c = JSON.parse(JSON.stringify(exampleBudget()))
    c.charges[1].id = c.charges[0].id
    expect(parseBudget(c).ok).toBe(false)
  })

  it('nettoie les textes, corrige les détails sans gravité', () => {
    const b = JSON.parse(JSON.stringify(exampleBudget()))
    b.people[0].name = '  ' + 'A'.repeat(500) + '\u0000'
    b.mode = 'n_importe_quoi'
    b.charges[0].categoryId = 'inconnue'
    b.charges[1].override = { type: 'payer', personId: 'fantome' }
    b.charges[2].override = { type: 'custom', parts: { p1: 500, fantome: 500 } }
    const r = parseBudget(b)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.budget.people[0].name).toHaveLength(80)
    expect(r.budget.mode).toBe('egal')
    expect(r.budget.charges[0].categoryId).toBe('divers')
    expect(r.budget.charges[1].override).toBeNull()
    expect(r.budget.charges[2].override).toEqual({ type: 'custom', parts: { p1: 500 } })
  })

  it('recrée Divers si une charge n’a plus de catégorie', () => {
    const b = JSON.parse(JSON.stringify(exampleBudget()))
    b.categories = b.categories.filter((k: { id: string }) => k.id !== 'divers' && k.id !== 'logement')
    const r = parseBudget(b)
    expect(r.ok && r.budget.categories.some((k) => k.id === 'divers')).toBe(true)
    expect(r.ok && r.budget.charges[0].categoryId).toBe('divers')
  })

  it('migre l’ancien format sans version (maquette)', () => {
    const legacy = {
      mode: 'prorata',
      personnes: [{ id: 'p1', nom: 'Inès', revenu: 215000, c: 1 }, { id: 'p2', nom: 'Hugo', revenu: 178000, c: 2 }],
      cats: [{ id: 'logement', n: 'Logement', e: '🏠', c: 1 }],
      charges: [
        { id: 'c1', label: 'Loyer', montant: 165000, freq: 'm', cat: 'logement', ov: null },
        { id: 'c2', label: 'Eau', montant: 9600, freq: 't', cat: 'energie', ov: { type: 'payeur', pid: 'p2' } },
      ],
      libres: { p1: 500, p2: 500 },
    }
    const r = parseBudget(legacy)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.budget.v).toBe(1)
    expect(r.budget.people[0]).toEqual({ id: 'p1', name: 'Inès', income: 215000, color: 1 })
    expect(r.budget.charges[1]).toMatchObject({ frequency: 'trimestriel', categoryId: 'divers', override: { type: 'payer', personId: 'p2' } })
  })

  it('JSON illisible : message, pas d’exception', () => {
    expect(parseBudgetJson('{oups').ok).toBe(false)
    expect(parseBudgetJson('"texte"').ok).toBe(false)
  })
})

describe('lien de partage', () => {
  it('aller-retour exact', () => {
    for (const b of [exampleBudget(), emptyBudget()]) {
      const url = shareUrl(b, 'https://exemple.fr/budget-commun/#ancien')
      expect(url.startsWith('https://exemple.fr/budget-commun/#b=')).toBe(true)
      const r = readHash(new URL(url).hash)
      expect(r).toEqual({ ok: true, budget: b })
    }
  })
  it('l’exemple tient dans un QR code', () => {
    expect(shareUrl(exampleBudget(), 'https://fabienvincent.github.io/budget-commun/').length).toBeLessThan(QR_MAX_LENGTH)
  })
  it('un fragment sans budget est ignoré', () => {
    expect(readHash('')).toBeNull()
    expect(readHash('#sec-charges')).toBeNull()
  })
  it.each(['#b=', '#b=n%C3%A9importe', '#b=AAAA', '#b=' + 'x'.repeat(300_000)])('lien abîmé %# : erreur lisible', (h) => {
    const r = readHash(h)
    expect(r?.ok).toBe(false)
  })
  it('un lien tronqué ne plante pas', () => {
    const p = encodeBudget(exampleBudget())
    for (const cut of [5, 50, p.length - 3]) expect(decodeBudget(p.slice(0, cut)).ok).toBe(false)
  })
})

describe('stockage local', () => {
  it('vide puis sauvegarde puis relecture', () => {
    const kv = memoryKV()
    expect(loadBudget(kv)).toEqual({ status: 'empty' })
    const b = exampleBudget()
    expect(saveBudget(kv, b)).toBe(true)
    expect(loadBudget(kv)).toEqual({ status: 'ok', budget: b })
  })
  it('met de côté des données abîmées au lieu de les écraser', () => {
    const kv = memoryKV({ [STORAGE_KEY]: '{pas du json' })
    const r = loadBudget(kv)
    expect(r.status).toBe('corrupt')
    expect(Object.keys(kv.data).some((k) => k.startsWith(STORAGE_KEY + '-sauvegarde-'))).toBe(true)
  })
  it('sans localStorage : ne plante pas', () => {
    expect(loadBudget(null)).toEqual({ status: 'empty' })
    expect(saveBudget(null, exampleBudget())).toBe(false)
    const broken: KV = { getItem: () => { throw new Error('interdit') }, setItem: () => { throw new Error('plein') }, removeItem: () => {} }
    expect(loadBudget(broken)).toEqual({ status: 'empty' })
    expect(saveBudget(broken, exampleBudget())).toBe(false)
  })
  it('export puis import redonne le même budget', () => {
    const b = exampleBudget()
    expect(parseBudgetJson(exportJson(b))).toEqual({ ok: true, budget: b })
  })
})
