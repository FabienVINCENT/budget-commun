/**
 * État de l'app : un seul budget, enregistré automatiquement dans ce navigateur.
 * Rien n'est envoyé nulle part.
 */
import { computed, reactive, ref, watch } from 'vue'
import { compute } from './lib/compute'
import { emptyBudget, exampleBudget } from './lib/defaults'
import { readHash } from './lib/share'
import { browserStorage, clearBudget, loadBudget, saveBudget, THEME_KEY } from './lib/storage'
import type { Budget } from './lib/types'

const kv = browserStorage()

export const state = reactive({
  /** null : premier passage, rien d'enregistré (écran d'accueil). */
  budget: null as Budget | null,
  /** Budget reçu par lien alors qu'un budget local existe : on demande quoi faire. */
  incoming: null as Budget | null,
  /** Erreur de lien ou de fichier à afficher (message lisible). */
  loadError: '',
  /** Données locales illisibles mises de côté au démarrage. */
  storageWarning: '',
  storageOk: kv !== null,
})

export const result = computed(() => (state.budget ? compute(state.budget) : null))

/* ---------- Petits messages ---------- */
export const toasts = ref<{ id: number; text: string }[]>([])
let toastId = 0
export function toast(text: string): void {
  const id = ++toastId
  toasts.value.push({ id, text })
  setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), 2800)
}

/* ---------- Démarrage ---------- */
function clearHash(): void {
  history.replaceState(null, '', location.pathname + location.search)
}

/** Lit le budget local puis, s'il y en a un, celui du lien. */
export function boot(): void {
  const local = loadBudget(kv)
  if (local.status === 'ok') state.budget = local.budget
  if (local.status === 'corrupt') state.storageWarning = `Ton budget enregistré n'a pas pu être relu (${local.error}). Une copie a été gardée de côté.`
  handleHash()
}

export function handleHash(): void {
  const r = readHash(location.hash)
  if (r === null) return
  clearHash()
  if (!r.ok) {
    state.loadError = `Ce lien ne contient pas de budget lisible : ${r.error}. Demande à la personne de te le renvoyer.`
    return
  }
  if (state.budget && !state.budget.example) state.incoming = r.budget
  else {
    state.budget = r.budget
    toast('Budget ouvert depuis le lien')
  }
}

/** Réponse à « Remplacer mon budget ou garder le mien ? ». */
export function resolveIncoming(replace: boolean): void {
  if (replace && state.incoming) {
    state.budget = state.incoming
    toast('Budget remplacé par celui du lien')
  } else toast('Ton budget est gardé')
  state.incoming = null
}

export function startEmpty(): void {
  state.budget = emptyBudget()
}
export function loadExample(): void {
  state.budget = exampleBudget()
}
/** Tout effacer de ce navigateur et revenir à l'accueil. */
export function eraseAll(): void {
  clearBudget(kv)
  state.budget = null
}

/** Remplace le budget (import de fichier déjà validé). */
export function replaceBudget(b: Budget): void {
  state.budget = b
}

/* ---------- Enregistrement automatique ---------- */
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => state.budget,
  (b, old) => {
    clearTimeout(timer)
    if (!b) return
    const save = (): void => {
      if (!saveBudget(kv, b) && state.storageOk) {
        state.storageOk = false
        toast("Impossible d'enregistrer dans ce navigateur : pense à exporter")
      }
    }
    // Nouveau budget (départ, exemple, lien, fichier) : tout de suite. Simple saisie : un court délai.
    if (b !== old) save()
    else timer = setTimeout(save, 250)
  },
  { deep: true },
)
/** Enregistre tout de suite (avant de quitter la page). */
export function flush(): void {
  clearTimeout(timer)
  if (state.budget) saveBudget(kv, state.budget)
}

/* ---------- Thème ---------- */
export type Theme = 'sombre' | 'clair'
function initialTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'sombre' || t === 'clair') return t
  } catch {
    /* rien */
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'clair' : 'sombre'
}
export const theme = ref<Theme>(initialTheme())
watch(
  theme,
  (t) => {
    document.documentElement.dataset.theme = t
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'clair' ? '#f4f6fa' : '#09090b')
  },
  { immediate: true },
)
export function toggleTheme(): void {
  theme.value = theme.value === 'sombre' ? 'clair' : 'sombre'
  try {
    localStorage.setItem(THEME_KEY, theme.value)
  } catch {
    /* rien */
  }
}
