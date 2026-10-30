import type { Charge, Frequency } from './types'

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  mensuel: 'mensuel',
  trimestriel: 'trimestriel',
  annuel: 'annuel',
}

const PER_YEAR: Record<Frequency, number> = { mensuel: 12, trimestriel: 4, annuel: 1 }

/** Montant ramené au mois, arrondi au centime le plus proche. */
export function toMonthly(amount: number, frequency: Frequency): number {
  if (frequency === 'mensuel') return amount
  const months = 12 / PER_YEAR[frequency]
  return Math.round(amount / months)
}

/** Montant sur un an (exact : multiplication entière). */
export function toYearly(amount: number, frequency: Frequency): number {
  return amount * PER_YEAR[frequency]
}

export const monthlyOf = (c: Pick<Charge, 'amount' | 'frequency'>): number =>
  toMonthly(c.amount, c.frequency)
export const yearlyOf = (c: Pick<Charge, 'amount' | 'frequency'>): number =>
  toYearly(c.amount, c.frequency)
