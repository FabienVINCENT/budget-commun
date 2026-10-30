<script setup lang="ts">
import { ref } from 'vue'
import { exportFile, importFile, openShare } from '../actions'
import { state, theme, toggleTheme } from '../store'

const file = ref<HTMLInputElement | null>(null)
function onFile(e: Event): void {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (f) void importFile(f)
}
defineExpose({ pickFile: () => file.value?.click() })
</script>

<template>
  <header class="ahd">
    <div class="brand">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <rect width="30" height="30" rx="9" fill="var(--control)" />
        <circle cx="12" cy="15" r="6" fill="none" stroke="var(--p1)" stroke-width="2.2" />
        <circle cx="18" cy="15" r="6" fill="none" stroke="var(--p2)" stroke-width="2.2" />
      </svg>
      <div class="brand-t">
        <h1>Budget commun</h1>
        <span class="meta">Qui verse combien sur le compte commun</span>
      </div>
      <span v-if="state.budget?.example" class="pill ex" title="Données inventées pour montrer l’app">Exemple</span>
    </div>
    <div class="ahd-act">
      <template v-if="state.budget">
        <button type="button" class="btn sm" aria-label="Partager" title="Partager par lien ou QR code" @click="openShare">
          <span aria-hidden="true">🔗</span><span class="txt">Partager</span>
        </button>
        <button type="button" class="btn sm" aria-label="Exporter" title="Enregistrer dans un fichier" @click="exportFile">
          <span aria-hidden="true">⬇</span><span class="txt">Exporter</span>
        </button>
      </template>
      <button type="button" class="btn sm" aria-label="Importer" title="Ouvrir un fichier" @click="file?.click()">
        <span aria-hidden="true">⬆</span><span class="txt">Importer</span>
      </button>
      <button
        type="button"
        class="btn sm"
        :aria-label="theme === 'sombre' ? 'Passer en thème clair' : 'Passer en thème sombre'"
        :title="theme === 'sombre' ? 'Thème clair' : 'Thème sombre'"
        @click="toggleTheme"
      >
        <span aria-hidden="true">{{ theme === 'sombre' ? '☀️' : '🌙' }}</span>
      </button>
      <input ref="file" type="file" accept="application/json,.json" class="sr" tabindex="-1" aria-hidden="true" @change="onFile" />
    </div>
  </header>
  <p class="privacy">
    <span aria-hidden="true">🔒</span>
    <span><b>Tes données restent sur ton appareil. Rien n'est envoyé.</b> Pas de compte, pas de pistage.</span>
  </p>
</template>

<style>
.ahd { display: flex; align-items: center; gap: 12px; padding: 18px 0 12px; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 10px; margin-right: auto; min-width: 0; }
.brand svg { flex: none; }
.brand-t { min-width: 0; }
.brand h1 { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
.brand .meta { display: block; }
.ahd-act { display: flex; gap: 6px; flex-wrap: wrap; }
.privacy { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--pos) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--pos) 22%, transparent); font-size: 13px; color: var(--fg2); margin: 0 0 8px; }
.privacy b { color: var(--fg); font-weight: 500; }
@media (max-width: 720px) {
  .ahd-act .txt { display: none; }
  .ahd-act .btn { min-width: 44px; min-height: 44px; padding: 0 10px; }
  .brand .meta { display: none; }
}
</style>
