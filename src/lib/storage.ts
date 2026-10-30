import { parseBudget } from './schema'
import type { Budget } from './types'

export const STORAGE_KEY = 'budget-commun'
export const THEME_KEY = 'budget-commun-theme'

/** Stockage minimal (window.localStorage ou un faux en test). */
export interface KV {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; budget: Budget }
  /** Données présentes mais illisibles : on les met de côté au lieu de les écraser. */
  | { status: 'corrupt'; error: string }

export function loadBudget(kv: KV | null): LoadResult {
  if (!kv) return { status: 'empty' }
  let raw: string | null
  try {
    raw = kv.getItem(STORAGE_KEY)
  } catch {
    return { status: 'empty' }
  }
  if (raw === null) return { status: 'empty' }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    backup(kv, raw)
    return { status: 'corrupt', error: 'données locales illisibles' }
  }
  const r = parseBudget(data)
  if (!r.ok) {
    backup(kv, raw)
    return { status: 'corrupt', error: r.error }
  }
  return { status: 'ok', budget: r.budget }
}

function backup(kv: KV, raw: string): void {
  try {
    kv.setItem(`${STORAGE_KEY}-sauvegarde-${Date.now()}`, raw)
  } catch {
    /* plein ou interdit : tant pis */
  }
}

export function saveBudget(kv: KV | null, b: Budget): boolean {
  if (!kv) return false
  try {
    kv.setItem(STORAGE_KEY, JSON.stringify(b))
    return true
  } catch {
    return false
  }
}

export function clearBudget(kv: KV | null): void {
  try {
    kv?.removeItem(STORAGE_KEY)
  } catch {
    /* rien */
  }
}

/** localStorage peut être absent ou interdit (navigation privée, iframe). */
export function browserStorage(): KV | null {
  try {
    const s = window.localStorage
    const k = '__bc_test__'
    s.setItem(k, '1')
    s.removeItem(k)
    return s
  } catch {
    return null
  }
}

/** Contenu du fichier exporté (même schéma que le stockage local). */
export function exportJson(b: Budget): string {
  return JSON.stringify({ app: 'budget-commun', ...b }, null, 2)
}
