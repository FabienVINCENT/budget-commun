/**
 * Validation stricte et migration des données venues de l'extérieur
 * (localStorage, lien partagé, fichier importé). Ne lève jamais d'exception :
 * renvoie soit un budget propre, soit un message d'erreur lisible.
 */
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY_ID, defaultCategories } from './defaults'
import { MAX_CENTS, PERMILLE } from './money'
import { FREQUENCIES, SCHEMA_VERSION, SPLIT_MODES } from './types'
import type { Budget, Category, Charge, Frequency, Override, Person, SplitMode } from './types'

export const LIMITS = { people: 100, categories: 60, charges: 1000, text: 80, id: 40 } as const

export type ParseResult = { ok: true; budget: Budget } | { ok: false; error: string }

type Obj = Record<string, unknown>
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)

class Invalid extends Error {}
const fail = (msg: string): never => {
  throw new Invalid(msg)
}

const ID_RE = /^[A-Za-z0-9_-]+$/
function id(x: unknown, what: string): string {
  if (typeof x !== 'string' || x.length === 0 || x.length > LIMITS.id || !ID_RE.test(x)) fail(`identifiant de ${what} invalide`)
  return x as string
}
function text(x: unknown, fallback: string): string {
  if (typeof x !== 'string') return fallback
  const s = x.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, LIMITS.text)
  return s || fallback
}
function cents(x: unknown, what: string): number {
  if (typeof x !== 'number' || !Number.isInteger(x) || x < 0 || x > MAX_CENTS) fail(`montant invalide (${what})`)
  return x as number
}
function permille(x: unknown): number {
  if (typeof x !== 'number' || !Number.isInteger(x) || x < 0 || x > PERMILLE) fail('pourcentage invalide')
  return x as number
}
function color(x: unknown, i: number): number {
  return typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 99 ? x : (i % 8) + 1
}
function list(x: unknown, max: number, what: string): unknown[] {
  if (!Array.isArray(x)) fail(`liste des ${what} manquante`)
  if ((x as unknown[]).length > max) fail(`trop de ${what}`)
  return x as unknown[]
}
function parts(x: unknown, personIds: Set<string>): Record<string, number> {
  const out: Record<string, number> = {}
  if (!isObj(x)) return out
  for (const [k, v] of Object.entries(x)) if (personIds.has(k)) out[k] = permille(v)
  return out
}
function unique<T extends { id: string }>(xs: T[], what: string): T[] {
  if (new Set(xs.map((x) => x.id)).size !== xs.length) fail(`${what} en double`)
  return xs
}

/** Valide un budget au format v1. */
function fromV1(d: Obj): Budget {
  const people = unique(
    list(d.people, LIMITS.people, 'personnes').map((p, i): Person => {
      if (!isObj(p)) fail('personne invalide')
      const o = p as Obj
      return { id: id(o.id, 'personne'), name: text(o.name, `Personne ${i + 1}`), income: cents(o.income, 'revenu'), color: color(o.color, i) }
    }),
    'personnes',
  )
  const pIds = new Set(people.map((p) => p.id))

  let categories = unique(
    list(d.categories, LIMITS.categories, 'catégories').map((c, i): Category => {
      if (!isObj(c)) fail('catégorie invalide')
      const o = c as Obj
      return { id: id(o.id, 'catégorie'), name: text(o.name, 'Sans nom'), emoji: emoji(o.emoji), color: color(o.color, i) }
    }),
    'catégories',
  )
  if (categories.length === 0) categories = defaultCategories()
  const cIds = new Set(categories.map((c) => c.id))

  const rawCharges = list(d.charges, LIMITS.charges, 'charges')
  const needsFallback = rawCharges.some((c) => isObj(c) && !cIds.has(String(c.categoryId)))
  if (needsFallback && !cIds.has(FALLBACK_CATEGORY_ID)) {
    categories.push({ ...DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1] })
    cIds.add(FALLBACK_CATEGORY_ID)
  }

  const charges = unique(
    rawCharges.map((c): Charge => {
      if (!isObj(c)) fail('charge invalide')
      const o = c as Obj
      const frequency = FREQUENCIES.includes(o.frequency as Frequency) ? (o.frequency as Frequency) : fail('fréquence invalide')
      const categoryId = typeof o.categoryId === 'string' && cIds.has(o.categoryId) ? o.categoryId : FALLBACK_CATEGORY_ID
      return {
        id: id(o.id, 'charge'),
        label: text(o.label, 'Sans nom'),
        amount: cents(o.amount, 'charge'),
        frequency,
        categoryId,
        override: override(o.override, pIds),
      }
    }),
    'charges',
  )

  const mode = SPLIT_MODES.includes(d.mode as SplitMode) ? (d.mode as SplitMode) : 'egal'
  return { v: SCHEMA_VERSION, example: d.example === true, mode, people, categories, charges, freeParts: parts(d.freeParts, pIds) }
}

function override(x: unknown, pIds: Set<string>): Override {
  if (!isObj(x)) return null
  if (x.type === 'payer') return typeof x.personId === 'string' && pIds.has(x.personId) ? { type: 'payer', personId: x.personId } : null
  if (x.type === 'custom') return { type: 'custom', parts: parts(x.parts, pIds) }
  return null
}

function emoji(x: unknown): string {
  if (typeof x !== 'string') return '🏷️'
  const s = x.trim()
  return s.length > 0 && s.length <= 16 ? s : '🏷️'
}

/**
 * Format sans version (maquette, premiers essais) :
 * personnes/revenu/charges/montant/freq m|t|a/cat/ov/cats/libres.
 */
function fromLegacy(d: Obj): Obj {
  const freq: Record<string, Frequency> = { m: 'mensuel', t: 'trimestriel', a: 'annuel' }
  const arr = (x: unknown): Obj[] => (Array.isArray(x) ? x.filter(isObj) : [])
  return {
    mode: d.mode,
    example: false,
    people: arr(d.personnes).map((p) => ({ id: p.id, name: p.nom, income: p.revenu, color: p.c })),
    categories: arr(d.cats).map((k) => ({ id: k.id, name: k.n, emoji: k.e, color: k.c })),
    charges: arr(d.charges).map((c) => {
      const ov = isObj(c.ov) ? c.ov : null
      return {
        id: c.id,
        label: c.label,
        amount: c.montant,
        frequency: freq[String(c.freq)] ?? c.freq,
        categoryId: c.cat,
        override: ov?.type === 'payeur' ? { type: 'payer', personId: ov.pid } : ov?.type === 'parts' ? { type: 'custom', parts: ov.parts } : null,
      }
    }),
    freeParts: d.libres,
  }
}

/** Transforme une valeur inconnue en budget valide, ou explique pourquoi c'est impossible. */
export function parseBudget(data: unknown): ParseResult {
  try {
    if (!isObj(data)) fail("ce n'est pas un budget")
    const d = data as Obj
    let src: Obj
    if (d.v === undefined && Array.isArray(d.personnes)) src = fromLegacy(d)
    else if (d.v === 1) src = d
    else if (typeof d.v === 'number' && d.v > SCHEMA_VERSION) return { ok: false, error: 'ce budget vient d’une version plus récente de l’app' }
    else return { ok: false, error: "ce n'est pas un budget" }
    return { ok: true, budget: fromV1(src) }
  } catch (e) {
    return { ok: false, error: e instanceof Invalid ? e.message : 'données illisibles' }
  }
}

/** Parse du JSON puis valide. */
export function parseBudgetJson(json: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: "ce n'est pas un fichier JSON lisible" }
  }
  return parseBudget(data)
}
