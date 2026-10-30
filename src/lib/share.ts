import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { parseBudget, type ParseResult } from './schema'
import type { Budget } from './types'

/** Clé du fragment : https://…/#b=<budget compressé>. Le fragment n'est jamais envoyé au serveur. */
export const HASH_KEY = 'b'

/** Au-delà, un QR code reste lisible difficilement (QR version 40, niveau L ≈ 2 950 octets). */
export const QR_MAX_LENGTH = 2900

/** Longueur maximale acceptée à la lecture d'un lien (protection mémoire). */
const MAX_HASH_LENGTH = 200_000

export function encodeBudget(b: Budget): string {
  return compressToEncodedURIComponent(JSON.stringify(b))
}

export function decodeBudget(payload: string): ParseResult {
  if (!payload || payload.length > MAX_HASH_LENGTH) return { ok: false, error: 'le lien est vide ou trop long' }
  let json: string | null = null
  try {
    json = decompressFromEncodedURIComponent(payload)
  } catch {
    json = null
  }
  if (!json) return { ok: false, error: 'le lien est incomplet ou abîmé' }
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: 'le lien est incomplet ou abîmé' }
  }
  return parseBudget(data)
}

/** Lien complet à partir de l'adresse actuelle (sans son fragment). */
export function shareUrl(b: Budget, base: string): string {
  const clean = base.split('#')[0]
  return `${clean}#${HASH_KEY}=${encodeBudget(b)}`
}

/**
 * Lit le fragment d'URL. Renvoie null s'il n'y a pas de budget dedans,
 * sinon le résultat de la validation (jamais d'exception).
 */
export function readHash(hash: string): ParseResult | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  const prefix = HASH_KEY + '='
  if (!h.startsWith(prefix)) return null
  return decodeBudget(h.slice(prefix.length))
}
