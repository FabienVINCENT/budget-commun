/**
 * Opérations sur un budget (mutations en place, sur l'objet réactif).
 * Gardées hors des composants pour être testées.
 */
import { FALLBACK_CATEGORY_ID, DEFAULT_CATEGORIES, newId, nextColor } from './defaults'
import { LIMITS } from './schema'
import { PERMILLE, splitLargestRemainder } from './money'
import type { Budget, Category, Charge, Override } from './types'

export function addPerson(b: Budget): string | null {
  if (b.people.length >= LIMITS.people) return null
  const id = newId('p')
  b.people.push({ id, name: `Personne ${b.people.length + 1}`, income: 0, color: nextColor(b.people.map((p) => p.color)) })
  b.freeParts[id] = 0
  b.example = false
  return id
}

/** Retire une personne et nettoie ses parts et les charges qu'elle payait seule. */
export function removePerson(b: Budget, personId: string): void {
  if (b.people.length <= 1) return
  b.people = b.people.filter((p) => p.id !== personId)
  delete b.freeParts[personId]
  for (const c of b.charges) {
    if (c.override?.type === 'payer' && c.override.personId === personId) c.override = null
    if (c.override?.type === 'custom') delete c.override.parts[personId]
  }
  b.example = false
}

export function addCharge(b: Budget, categoryId: string): string | null {
  if (b.charges.length >= LIMITS.charges) return null
  const id = newId('c')
  b.charges.push({ id, label: 'Nouvelle charge', amount: 0, frequency: 'mensuel', categoryId, override: null })
  b.example = false
  return id
}

export function removeCharge(b: Budget, chargeId: string): void {
  b.charges = b.charges.filter((c) => c.id !== chargeId)
  b.example = false
}

export function moveCharge(b: Budget, chargeId: string, categoryId: string): boolean {
  const c = b.charges.find((x) => x.id === chargeId)
  if (!c || !b.categories.some((k) => k.id === categoryId)) return false
  c.categoryId = categoryId
  b.example = false
  return true
}

export function addCategory(b: Budget): string | null {
  if (b.categories.length >= LIMITS.categories) return null
  const id = newId('k')
  const color = (Math.max(8, ...b.categories.map((k) => k.color)) % 8) + 1
  b.categories.push({ id, name: 'Nouvelle catégorie', emoji: '🏷️', color })
  b.example = false
  return id
}

/** Catégorie qui recevra les charges d'une catégorie supprimée. */
export function fallbackFor(b: Budget, removedId: string): Category | null {
  const rest = b.categories.filter((k) => k.id !== removedId)
  return rest.find((k) => k.id === FALLBACK_CATEGORY_ID) ?? null
}

export const chargesIn = (b: Budget, categoryId: string): Charge[] => b.charges.filter((c) => c.categoryId === categoryId)

/**
 * Supprime une catégorie ; ses charges vont dans « Divers »
 * (recréée si besoin). Renvoie la catégorie d'accueil.
 */
export function removeCategory(b: Budget, categoryId: string): Category | null {
  if (categoryId === FALLBACK_CATEGORY_ID && !b.categories.some((k) => k.id !== categoryId)) return null
  if (!b.categories.some((k) => k.id === categoryId)) return null
  const moving = chargesIn(b, categoryId)
  let target = fallbackFor(b, categoryId)
  if (!target && categoryId !== FALLBACK_CATEGORY_ID) {
    target = { ...DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1] }
    b.categories.push(target)
  }
  if (!target) {
    // On supprime « Divers » elle-même : ses charges vont dans la plus grosse restante.
    target = b.categories.find((k) => k.id !== categoryId) ?? null
    if (!target) return null
  }
  for (const c of moving) c.categoryId = target.id
  b.categories = b.categories.filter((k) => k.id !== categoryId)
  b.example = false
  return target
}

/** Parts « sur mesure » de départ : égales, au pour-mille, somme exacte. */
export function equalCustomParts(b: Budget): Record<string, number> {
  const sp = splitLargestRemainder(PERMILLE, b.people.map(() => 1))
  return Object.fromEntries(b.people.map((p, i) => [p.id, sp[i]]))
}

export type OverrideChoice = 'mode' | 'custom' | `payer:${string}`

export const overrideChoice = (o: Override): OverrideChoice =>
  !o ? 'mode' : o.type === 'payer' ? `payer:${o.personId}` : 'custom'

export function setOverride(b: Budget, chargeId: string, choice: string): void {
  const c = b.charges.find((x) => x.id === chargeId)
  if (!c) return
  if (choice === 'custom') c.override = { type: 'custom', parts: equalCustomParts(b) }
  else if (choice.startsWith('payer:') && b.people.some((p) => p.id === choice.slice(6)))
    c.override = { type: 'payer', personId: choice.slice(6) }
  else c.override = null
  b.example = false
}

/** Passe en parts libres : on part de parts égales si rien n'est saisi. */
export function ensureFreeParts(b: Budget): void {
  const t = b.people.reduce((s, p) => s + (b.freeParts[p.id] ?? 0), 0)
  if (t === 0) b.freeParts = equalCustomParts(b)
}
