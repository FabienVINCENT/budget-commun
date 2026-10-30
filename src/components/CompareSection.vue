<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { compute, isFreePartsValid } from '../lib/compute'
import { formatEuros, formatPct } from '../lib/money'
import type { SplitMode } from '../lib/types'
import { state } from '../store'
import PersonAvatar from './PersonAvatar.vue'

const LABELS: Record<SplitMode, string> = { egal: 'À parts égales', prorata: 'Au prorata des revenus', libre: 'Parts libres' }
const SHORT: Record<SplitMode, string> = { egal: 'Égal', prorata: 'Prorata', libre: 'Libre' }
const b = computed(() => state.budget!)
const available = computed<SplitMode[]>(() => (isFreePartsValid(b.value) ? ['egal', 'prorata', 'libre'] : ['egal', 'prorata']))
const m1 = ref<SplitMode>('egal')
const m2 = ref<SplitMode>('prorata')
watchEffect(() => {
  if (!available.value.includes(m1.value)) m1.value = 'egal'
  if (!available.value.includes(m2.value)) m2.value = 'prorata'
})
const a = computed(() => compute(b.value, m1.value))
const c = computed(() => compute(b.value, m2.value))
const rows = computed(() =>
  b.value.people.map((p, i) => {
    const x = a.value.parts[i] ?? 0
    const y = c.value.parts[i] ?? 0
    return { p, x, y, d: y - x }
  }),
)
</script>

<template>
  <section id="comparer" class="card cmp" aria-labelledby="h-comparer">
    <div class="hd">
      <div>
        <h2 id="h-comparer">Comparer deux modes</h2>
        <p>Qui paierait moins, qui paierait plus avec une autre règle.</p>
      </div>
      <div class="cmp-sel">
        <select v-model="m1" class="inp" aria-label="Premier mode">
          <option v-for="m in available" :key="m" :value="m">{{ LABELS[m] }}</option>
        </select>
        <span class="mut">vs</span>
        <select v-model="m2" class="inp" aria-label="Second mode">
          <option v-for="m in available" :key="m" :value="m">{{ LABELS[m] }}</option>
        </select>
      </div>
    </div>
    <div class="cmp-scroll">
      <table class="t">
        <thead>
          <tr><th scope="col">Personne</th><th scope="col">{{ SHORT[m1] }}</th><th scope="col">{{ SHORT[m2] }}</th><th scope="col">Différence</th><th scope="col" class="hide-s">Part du revenu</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.p.id">
            <th scope="row"><span class="who"><PersonAvatar :person="row.p" small /><span>{{ row.p.name }}</span></span></th>
            <td>{{ formatEuros(row.x) }}</td>
            <td>{{ formatEuros(row.y) }}</td>
            <td>
              <span v-if="row.d === 0" class="pill">=</span>
              <span v-else class="pill" :class="row.d < 0 ? 'pos' : 'neg'">{{ formatEuros(Math.abs(row.d)) }} de {{ row.d < 0 ? 'moins' : 'plus' }}</span>
            </td>
            <td class="hide-s mut">{{ row.p.income > 0 ? `${formatPct(row.x / row.p.income)} → ${formatPct(row.y / row.p.income)}` : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="meta" style="margin-top: 10px">
      Différence = ce que chacun paierait chaque mois avec « {{ LABELS[m2].toLowerCase() }} » par rapport à « {{ LABELS[m1].toLowerCase() }} ».
    </p>
  </section>
</template>

<style>
.cmp { container-type: inline-size; }
.cmp-sel { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cmp-sel select { width: auto; max-width: 100%; }
.cmp-scroll { overflow-x: auto; }
@container (max-width: 480px) {
  .cmp table.t { font-size: 12px; }
  .cmp table.t td, .cmp table.t th { padding: 8px 4px; }
  .cmp table.t .who .av { display: none; }
  .cmp table.t .who span:last-child { max-width: 72px; }
  .cmp .hide-s { display: none; }
  .cmp .pill { white-space: normal; text-align: center; }
  .cmp-sel { width: 100%; display: grid; grid-template-columns: 1fr; gap: 4px; }
  .cmp-sel select { width: 100%; }
  .cmp-sel .mut { text-align: center; font-size: 12px; }
}
</style>
