/** Actions « données » : lien de partage, fichier JSON. Tout reste local. */
import { reactive } from 'vue'
import { parseBudgetJson } from './lib/schema'
import { shareUrl } from './lib/share'
import { exportJson } from './lib/storage'
import { replaceBudget, state, toast } from './store'
import { askConfirm } from './ui'

export const shareState = reactive({ open: false, url: '' })

/** Prépare le lien, ouvre la fenêtre de partage (le QR code s'y trouve). */
export function openShare(): void {
  if (!state.budget) return
  shareState.url = shareUrl(state.budget, location.href)
  shareState.open = true
}

export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url)
    toast('Lien copié')
    return true
  } catch {
    toast('Copie impossible : sélectionne le lien et copie-le à la main')
    return false
  }
}

export const canNativeShare = (): boolean => typeof navigator.share === 'function'

export async function nativeShare(url: string): Promise<void> {
  try {
    await navigator.share({ title: 'Budget commun', text: 'Notre budget commun', url })
  } catch (e) {
    if ((e as DOMException)?.name !== 'AbortError') toast('Partage impossible, copie le lien à la place')
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function exportFile(): void {
  if (!state.budget) return
  const blob = new Blob([exportJson(state.budget)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `budget-commun-${today()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  toast('Fichier enregistré')
}

const MAX_FILE = 2 * 1024 * 1024

/** Lit un fichier choisi par l'utilisateur ; demande avant d'écraser. */
export async function importFile(file: File): Promise<void> {
  if (file.size > MAX_FILE) {
    state.loadError = 'Ce fichier est trop gros pour être un budget.'
    return
  }
  let text: string
  try {
    text = await file.text()
  } catch {
    state.loadError = 'Impossible de lire ce fichier.'
    return
  }
  const r = parseBudgetJson(text)
  if (!r.ok) {
    state.loadError = `Ce fichier ne contient pas de budget lisible : ${r.error}.`
    return
  }
  if (state.budget && !state.budget.example) {
    const ok = await askConfirm({
      title: 'Remplacer mon budget ?',
      body: 'Le fichier va remplacer le budget enregistré sur cet appareil.',
      ok: 'Remplacer',
      cancel: 'Annuler',
    })
    if (!ok) return
  }
  state.loadError = ''
  replaceBudget(r.budget)
  toast('Budget importé')
}
