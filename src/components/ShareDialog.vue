<script setup lang="ts">
/** Lien de partage + QR code, rendu ici même (aucune requête externe). */
import { onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import { QR_MAX_LENGTH } from '../lib/share'
import { canNativeShare, copyLink, nativeShare, shareState } from '../actions'
import ModalDialog from './ModalDialog.vue'

const qr = ref('')
const qrError = ref('')
const tooLong = shareState.url.length > QR_MAX_LENGTH
const input = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  if (tooLong) return
  try {
    // Toujours noir sur blanc, même en thème sombre : c'est ce que les lecteurs lisent le mieux.
    qr.value = await QRCode.toString(shareState.url, {
      type: 'svg',
      errorCorrectionLevel: 'L',
      margin: 2,
      color: { dark: '#0b0b0f', light: '#ffffff' },
    })
  } catch {
    qrError.value = 'Le QR code n’a pas pu être créé. Le lien, lui, marche.'
  }
})
function selectAll(): void {
  input.value?.select()
}
</script>

<template>
  <ModalDialog title="Partager ce budget" wide @close="shareState.open = false">
    <p>Tout le budget est rangé dans le lien, après le <b>#</b>. Il ne passe par aucun serveur : la personne qui l’ouvre retrouve le même budget sur son appareil.</p>

    <div class="share-row">
      <label class="sr" for="share-url">Lien de partage</label>
      <input id="share-url" ref="input" class="inp" readonly :value="shareState.url" @focus="selectAll" />
      <button type="button" class="btn primary" @click="copyLink(shareState.url)">Copier</button>
    </div>
    <p class="meta">{{ shareState.url.length.toLocaleString('fr-FR') }} caractères. Le lien est une copie : les changements faits ensuite ne suivent pas.</p>

    <div class="qr-box">
      <div v-if="tooLong" class="warnbox">
        Ce budget est trop grand pour tenir dans un QR code. Envoie plutôt le lien, ou exporte un fichier.
      </div>
      <div v-else-if="qrError" class="warnbox">{{ qrError }}</div>
      <!-- eslint-disable-next-line vue/no-v-html -- SVG produit localement par la lib qrcode -->
      <div v-else-if="qr" class="qr" role="img" aria-label="QR code du lien de partage" v-html="qr"></div>
      <p v-if="!tooLong && !qrError" class="meta">Scanne-le avec l’appareil photo d’un autre téléphone.</p>
    </div>

    <div class="dlg-act">
      <button v-if="canNativeShare()" type="button" class="btn" @click="nativeShare(shareState.url)">Envoyer…</button>
      <button type="button" class="btn" autofocus @click="shareState.open = false">Fermer</button>
    </div>
  </ModalDialog>
</template>

<style>
.share-row { display: flex; gap: 8px; margin: 14px 0 6px; }
.share-row .inp { font-size: 13px; color: var(--muted); }
.qr-box { margin-top: 14px; display: grid; justify-items: center; gap: 8px; text-align: center; }
.qr { width: min(260px, 100%); aspect-ratio: 1; background: #fff; border-radius: 12px; padding: 6px; }
.qr svg { display: block; width: 100%; height: 100%; }
@media (pointer: coarse), (max-width: 720px) { .share-row .inp { font-size: 16px; } }
</style>
