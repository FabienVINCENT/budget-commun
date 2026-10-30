/**
 * Argent en CENTIMES ENTIERS uniquement.
 * Le partage utilise la méthode du plus fort reste : la somme des parts
 * est toujours exactement égale au total, au centime près.
 */

/** Plafond raisonnable d'un montant saisi (100 millions d'euros). */
export const MAX_CENTS = 10_000_000_000

/** Plafond pour une part en pour-mille (1000 = 100 %). */
export const PERMILLE = 1000

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

/**
 * Répartit `total` centimes selon des poids entiers (plus fort reste).
 * - Les poids négatifs, non finis ou nuls ne reçoivent rien.
 * - Si tous les poids sont nuls, on partage à parts égales.
 * - Égalités de reste : la première personne de la liste passe avant.
 */
export function splitLargestRemainder(total: number, weights: readonly number[]): number[] {
  const n = weights.length
  if (n === 0) return []
  if (!Number.isSafeInteger(total)) throw new RangeError('total doit être un entier (centimes)')
  if (total < 0) return splitLargestRemainder(-total, weights).map((v) => (v === 0 ? 0 : -v))

  let w = weights.map((x) => (Number.isFinite(x) && x > 0 ? Math.round(x) : 0))
  let W = sum(w)
  if (W === 0) {
    w = w.map(() => 1)
    W = n
  }
  // BigInt : total × poids peut dépasser 2^53 avec de gros revenus.
  const T = BigInt(total)
  const WB = BigInt(W)
  const base: number[] = []
  const rem: bigint[] = []
  for (let i = 0; i < n; i++) {
    const p = T * BigInt(w[i])
    base.push(Number(p / WB))
    rem.push(p % WB)
  }
  const rest = total - sum(base)
  const order = w
    .map((_, i) => i)
    .filter((i) => w[i] > 0)
    .sort((a, b) => (rem[a] === rem[b] ? a - b : rem[a] > rem[b] ? -1 : 1))
  // Le reste est toujours < nombre de poids positifs.
  for (let k = 0; k < rest; k++) base[order[k]]++
  return base
}

/* ---------- Formatage (fr-FR) ---------- */

const NBSP = '\u00a0'
const NNBSP = '\u202f'
const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const noBreak = (s: string): string => s.replace(/[\u202f\u00a0 ]/g, NBSP)

/** Nombre d'euros sans symbole : « 1 234 » ou « 13,49 ». */
export function centsToInput(cents: number): string {
  const v = Number.isFinite(cents) ? cents : 0
  return noBreak((v % 100 === 0 ? nf0 : nf2).format(v / 100))
}

/**
 * « 1 234 € », « 13,49 € » (décimales seulement si besoin),
 * ou toujours 2 décimales avec `fixed`.
 */
export function formatEuros(cents: number, fixed = false): string {
  const v = Number.isFinite(cents) ? cents : 0
  const a = Math.abs(v)
  const s = (fixed || a % 100 !== 0 ? nf2 : nf0).format(a / 100) + NNBSP + '€'
  return noBreak(v < 0 ? '−' + s : s)
}

/** Ratio (0,397) → « 39,7 % ». Les valeurs non finies donnent « 0 % ». */
export function formatPct(ratio: number): string {
  const r = Number.isFinite(ratio) ? ratio : 0
  return noBreak(nf1.format(Math.round(r * 1000) / 10) + NBSP + '%')
}

/** Pour-mille (333) → « 33,3 ». */
export function permilleToInput(pm: number): string {
  return noBreak(nf1.format((Number.isFinite(pm) ? pm : 0) / 10))
}

/** Ratio sûr : 0 si le dénominateur est nul. */
export const ratio = (part: number, whole: number): number => (whole > 0 ? part / whole : 0)

/* ---------- Saisie ---------- */

/**
 * Lit un nombre décimal positif saisi à la française ou à l'anglaise
 * et le convertit en entier de 10^digits unités, sans passer par les flottants.
 * Renvoie null si la saisie n'est pas un nombre.
 */
function parseDecimal(input: string, digits: number): number | null {
  const s = String(input)
    .replace(/[\s\u00a0\u202f€%]/g, '')
    .replace(',', '.')
  const m = /^(\d*)(?:\.(\d*))?$/.exec(s)
  if (!m || (m[1] === '' && (m[2] ?? '') === '')) return null
  const intPart = m[1] === '' ? 0 : Number(m[1])
  const frac = (m[2] ?? '').padEnd(digits + 1, '0')
  const kept = Number(frac.slice(0, digits) || '0')
  const roundUp = Number(frac.charAt(digits)) >= 5 ? 1 : 0
  const v = intPart * 10 ** digits + kept + roundUp
  return Number.isSafeInteger(v) ? v : null
}

/** « 1 234,56 € » → 123456. null si illisible ou trop grand. */
export function parseEuros(input: string): number | null {
  const v = parseDecimal(input, 2)
  return v === null || v > MAX_CENTS ? null : v
}

/** « 33,3 % » → 333 (pour-mille). null si illisible ou > 100 %. */
export function parsePermille(input: string): number | null {
  const v = parseDecimal(input, 1)
  return v === null || v > PERMILLE ? null : v
}
