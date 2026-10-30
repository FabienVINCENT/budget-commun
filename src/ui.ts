/** Petits utilitaires d'affichage partagés par les composants. */
import { reactive } from 'vue'
import type { Category, Person } from './lib/types'

export const personStyle = (p: Pick<Person, 'color'>): string => `--pc:var(--p${((p.color - 1) % 8) + 1})`
export const catStyle = (k: Pick<Category, 'color'>): string => `--cc:var(--k${((k.color - 1) % 8) + 1})`

export const plural = (n: number, one: string, many = one + 's'): string => `${n} ${n > 1 ? many : one}`

/** Initiale, ou deux lettres si deux personnes commencent pareil. */
export function initials(p: Person, all: readonly Person[]): string {
  const name = (p.name || '?').trim()
  const first = name.charAt(0).toUpperCase() || '?'
  const dup = all.some((q) => q.id !== p.id && (q.name || '').trim().charAt(0).toUpperCase() === first)
  return dup ? first + (name.charAt(1) || '').toLowerCase() : first
}

/** Largeur en % pour une barre ; 0 si rien. */
export const widthPct = (part: number, whole: number): string =>
  `${whole > 0 ? Math.min(100, (part / whole) * 100).toFixed(2) : '0'}%`

/** Dernière charge ajoutée : sa ligne s'ouvre directement (mobile). */
export const justAdded = { chargeId: '' }

/* ---------- Boîte de confirmation (une seule pour toute l'app) ---------- */
export interface ConfirmRequest {
  title: string
  body: string
  ok: string
  cancel: string
  danger?: boolean
  resolve: (v: boolean) => void
}
export const confirmState = reactive({ current: null as ConfirmRequest | null })

export function askConfirm(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  confirmState.current?.resolve(false)
  return new Promise((resolve) => {
    confirmState.current = { ...opts, resolve }
  })
}
export function answerConfirm(v: boolean): void {
  const c = confirmState.current
  confirmState.current = null
  c?.resolve(v)
}

/** Défile jusqu'à une section en tenant compte du menu collant. */
export function scrollToId(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  const h = el.querySelector<HTMLElement>('h2')
  if (h) {
    h.setAttribute('tabindex', '-1')
    h.focus({ preventScroll: true })
  }
}
