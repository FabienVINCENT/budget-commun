import type { Budget, Category, Charge, Frequency, Override, Person } from './types'

export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'logement', name: 'Logement', emoji: '🏠', color: 1 },
  { id: 'energie', name: 'Énergie', emoji: '⚡️', color: 2 },
  { id: 'assurances', name: 'Assurances', emoji: '🛡️', color: 3 },
  { id: 'enfants', name: 'Enfants', emoji: '🧸', color: 4 },
  { id: 'abonnements', name: 'Abonnements', emoji: '📺', color: 5 },
  { id: 'transport', name: 'Transport', emoji: '🚗', color: 6 },
  { id: 'courses', name: 'Courses', emoji: '🛒', color: 7 },
  { id: 'divers', name: 'Divers', emoji: '📦', color: 8 },
]

export const EMOJIS: readonly string[] = [
  '🏠', '⚡️', '🛡️', '🧸', '📺', '🚗', '🛒', '📦', '💧', '🍽️', '🐾', '💊', '🎓', '🏋️', '✈️', '🎁', '📱', '🏷️',
]

export const FALLBACK_CATEGORY_ID = 'divers'

export const defaultCategories = (): Category[] => DEFAULT_CATEGORIES.map((c) => ({ ...c }))

let counter = 0
/** Identifiant court, unique dans la session. */
export function newId(prefix: string): string {
  counter = (counter + 1) % 1_000_000
  const rand = Math.floor(Math.random() * 36 ** 4).toString(36).padStart(4, '0')
  return `${prefix}${Date.now().toString(36).slice(-4)}${rand}${counter.toString(36)}`
}

/** Budget vide : deux personnes, aucune charge, partage à parts égales. */
export function emptyBudget(): Budget {
  const a = newId('p')
  const b = newId('p')
  return {
    v: 1,
    example: false,
    mode: 'egal',
    people: [
      { id: a, name: 'Personne 1', income: 0, color: 1 },
      { id: b, name: 'Personne 2', income: 0, color: 2 },
    ],
    categories: defaultCategories(),
    charges: [],
    freeParts: { [a]: 500, [b]: 500 },
  }
}

const eur = (x: number): number => Math.round(x * 100)

/** L'exemple de la maquette : un couple avec enfants. */
export function exampleBudget(): Budget {
  const people: Person[] = [
    { id: 'p1', name: 'Madame', income: eur(2960), color: 1 },
    { id: 'p2', name: 'Monsieur', income: eur(3210), color: 2 },
  ]
  let i = 0
  const C = (label: string, euros: number, frequency: Frequency, categoryId: string, override: Override = null): Charge => ({
    id: `ex${++i}`,
    label,
    amount: eur(euros),
    frequency,
    categoryId,
    override,
  })
  return {
    v: 1,
    example: true,
    mode: 'prorata',
    people,
    categories: defaultCategories(),
    charges: [
      C('Prêt immobilier', 1483, 'mensuel', 'logement'),
      C('Taxe foncière', 1512, 'annuel', 'logement'),
      C('Électricité', 100, 'mensuel', 'energie'),
      C('Assurances', 230, 'mensuel', 'assurances'),
      C('Cantine', 160, 'mensuel', 'enfants'),
      C('Centre de loisirs', 270, 'mensuel', 'enfants'),
      C('Internet', 36, 'mensuel', 'abonnements'),
      C('Netflix', 13.49, 'mensuel', 'abonnements'),
      C('Disney+', 9.99, 'mensuel', 'abonnements'),
      C('Deezer', 10.99, 'mensuel', 'abonnements'),
      C('Spotify', 10.99, 'mensuel', 'abonnements'),
    ],
    freeParts: { p1: 450, p2: 550 },
  }
}

/** Couleur libre (1..8) pour une nouvelle personne. */
export function nextColor(used: readonly number[]): number {
  for (let c = 1; c <= 8; c++) if (!used.includes(c)) return c
  return (used.length % 8) + 1
}
