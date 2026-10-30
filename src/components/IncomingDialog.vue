<script setup lang="ts">
/** Un lien partagé arrive alors qu'un budget existe déjà ici. */
import { computed } from 'vue'
import { compute } from '../lib/compute'
import { formatEuros } from '../lib/money'
import type { Budget } from '../lib/types'
import { exportFile } from '../actions'
import { resolveIncoming, state } from '../store'
import { plural } from '../ui'
import ModalDialog from './ModalDialog.vue'

const describe = (b: Budget): string =>
  `${plural(b.people.length, 'personne')}, ${plural(b.charges.length, 'charge')}, ${formatEuros(compute(b).total)} par mois`
const theirs = computed(() => (state.incoming ? describe(state.incoming) : ''))
const mine = computed(() => (state.budget ? describe(state.budget) : ''))
</script>

<template>
  <ModalDialog v-if="state.incoming" title="Remplacer mon budget ou garder le mien ?" @close="resolveIncoming(false)">
    <p>Ce lien contient un budget. Tu en as déjà un sur cet appareil.</p>
    <div class="cmpbox">
      <div class="kv"><span>Budget du lien</span><b>{{ theirs }}</b></div>
      <div class="kv"><span>Ton budget</span><b>{{ mine }}</b></div>
    </div>
    <p class="meta">Si tu remplaces, ton budget actuel est effacé de cet appareil. Tu peux d’abord l’exporter dans un fichier.</p>
    <div class="dlg-act">
      <button type="button" class="btn" @click="exportFile()"><span aria-hidden="true">⬇</span> Exporter le mien d’abord</button>
      <button type="button" class="btn" autofocus @click="resolveIncoming(false)">Garder le mien</button>
      <button type="button" class="btn primary" @click="resolveIncoming(true)">Remplacer mon budget</button>
    </div>
  </ModalDialog>
</template>

<style>
.cmpbox { margin: 12px 0 10px; }
.cmpbox .kv b { text-align: right; }
</style>
