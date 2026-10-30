<script setup lang="ts">
import { computed, ref } from 'vue'
import { exportFile, importFile, openShare } from '../actions'
import { eraseAll, loadExample, state, toast } from '../store'
import { askConfirm } from '../ui'

const b = computed(() => state.budget!)
const file = ref<HTMLInputElement | null>(null)

function onFile(e: Event): void {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (f) void importFile(f)
}
async function erase(): Promise<void> {
  if (!b.value.example) {
    const ok = await askConfirm({
      title: 'Tout effacer ?',
      body: 'Ton budget sera effacé de ce navigateur. Exporte-le avant si tu veux le garder.',
      ok: 'Tout effacer',
      cancel: 'Annuler',
      danger: true,
    })
    if (!ok) return
  }
  eraseAll()
  window.scrollTo({ top: 0 })
  toast('Budget effacé')
}
async function example(): Promise<void> {
  const ok = await askConfirm({
    title: 'Charger l’exemple ?',
    body: 'L’exemple va remplacer ton budget sur cet appareil.',
    ok: 'Charger l’exemple',
    cancel: 'Annuler',
    danger: true,
  })
  if (ok) loadExample()
}
</script>

<template>
  <section id="donnees" class="card" aria-labelledby="h-donnees">
    <div class="hd">
      <div>
        <h2 id="h-donnees">Tes données</h2>
        <p>Enregistrées seulement dans ce navigateur. Pour les retrouver ailleurs : un lien, un QR code ou un fichier.</p>
      </div>
    </div>
    <div class="data-act">
      <button type="button" class="btn" @click="openShare"><span aria-hidden="true">🔗</span> Partager (lien et QR code)</button>
      <button type="button" class="btn" @click="exportFile"><span aria-hidden="true">⬇</span> Exporter (.json)</button>
      <button type="button" class="btn" @click="file?.click()"><span aria-hidden="true">⬆</span> Importer un fichier</button>
      <input ref="file" type="file" accept="application/json,.json" class="sr" tabindex="-1" aria-hidden="true" @change="onFile" />
    </div>
    <div class="data-act sec">
      <button v-if="!b.example" type="button" class="btn ghost" @click="example">Voir l’exemple</button>
      <button type="button" class="btn ghost danger" @click="erase">{{ b.example ? 'Effacer l’exemple' : 'Tout effacer' }}</button>
    </div>
  </section>
</template>

<style>
.data-act { display: flex; gap: 8px; flex-wrap: wrap; }
.data-act.sec { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
@media (max-width: 480px) { .data-act .btn { flex: 1 1 100%; justify-content: flex-start; } }
</style>
