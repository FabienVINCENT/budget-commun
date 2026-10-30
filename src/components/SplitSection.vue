<script setup lang="ts">
import { computed } from 'vue'
import { freePartsTotal, weightsFor } from '../lib/compute'
import { formatPct, permilleToInput, PERMILLE, ratio } from '../lib/money'
import { ensureFreeParts } from '../lib/ops'
import type { SplitMode } from '../lib/types'
import { state } from '../store'
import PersonAvatar from './PersonAvatar.vue'
import NumInput from './NumInput.vue'

const b = computed(() => state.budget!)
const n = computed(() => b.value.people.length)
const equalLabel = computed(() => (n.value === 2 ? '50/50' : n.value === 1 ? '100 %' : `1/${n.value} chacun`))
const modes = computed(() => [
  { id: 'egal' as const, title: 'À parts égales', sub: equalLabel.value },
  { id: 'prorata' as const, title: 'Au prorata', sub: 'selon les revenus' },
  { id: 'libre' as const, title: 'Parts libres', sub: 'tu choisis les %' },
])
const lt = computed(() => freePartsTotal(b.value))
const incomes = computed(() => b.value.people.reduce((s, p) => s + p.income, 0))
const prorataText = computed(() => {
  const w = weightsFor(b.value, 'prorata')
  const W = w.reduce((a, x) => a + x, 0)
  return b.value.people.map((p, i) => `${p.name} ${formatPct(ratio(w[i], W))}`).join(', ')
})
const nOverrides = computed(() => b.value.charges.filter((c) => c.override).length)
const freeStatus = computed(() => {
  const t = lt.value
  if (t === PERMILLE) return 'Total 100 % ✓'
  return t < PERMILLE ? `Total ${permilleToInput(t)} % : il manque ${permilleToInput(PERMILLE - t)} %` : `Total ${permilleToInput(t)} % : il y a ${permilleToInput(t - PERMILLE)} % de trop`
})

function setMode(m: SplitMode): void {
  if (m === 'libre') ensureFreeParts(b.value)
  b.value.mode = m
  b.value.example = false
}
function setPart(id: string, v: number): void {
  b.value.freeParts[id] = v
  b.value.example = false
}
</script>

<template>
  <section id="partage" class="card" aria-labelledby="h-partage">
    <div class="hd">
      <div>
        <h2 id="h-partage"><span class="stepn" aria-hidden="true">3</span>Mode de partage</h2>
        <p>Comment répartir les charges qui ne sont pas réglées autrement.</p>
      </div>
    </div>
    <div class="modes" role="group" aria-label="Mode de partage">
      <button
        v-for="m in modes"
        :key="m.id"
        type="button"
        class="mode"
        :class="{ on: b.mode === m.id }"
        :aria-pressed="b.mode === m.id"
        @click="setMode(m.id)"
      >
        <b>{{ m.title }}</b><span>{{ m.sub }}</span>
      </button>
    </div>

    <template v-if="b.mode === 'libre'">
      <div class="libres">
        <label v-for="p in b.people" :key="p.id">
          <PersonAvatar :person="p" small />
          <span class="libre-n">{{ p.name }}</span>
          <NumInput kind="pct" :model-value="b.freeParts[p.id] ?? 0" :label="`Part de ${p.name}, en %`" @update:model-value="setPart(p.id, $event)" />
        </label>
      </div>
      <p class="libre-tot" role="status"><span class="pill" :class="lt === PERMILLE ? 'pos' : 'neg'">{{ freeStatus }}</span></p>
    </template>

    <p class="explain">
      <template v-if="b.mode === 'egal'">Chacun paie la même part ({{ equalLabel }}), quels que soient ses revenus.</template>
      <template v-else-if="b.mode === 'prorata' && incomes === 0">Personne n’a encore de revenu : en attendant, chacun paie la même part. Remplis les revenus à l’étape 1.</template>
      <template v-else-if="b.mode === 'prorata'">Chacun paie selon ce qu’il gagne : {{ prorataText }}.</template>
      <template v-else>Tu fixes toi-même le pourcentage de chacun. Ils doivent faire 100 % au total.</template>
      <span v-if="nOverrides" class="mut">{{ ` ${nOverrides} charge${nOverrides > 1 ? 's ont' : ' a'} une règle à part (voir Charges).` }}</span>
    </p>
  </section>
</template>

<style>
#partage { container-type: inline-size; }
.modes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.mode { text-align: left; border: 1px solid var(--line); background: var(--control); border-radius: 14px; padding: 12px 14px; color: var(--fg2); min-height: 44px; }
.mode b { display: block; color: var(--fg); font-weight: 500; font-size: 14px; }
.mode span { font-size: 13px; color: var(--muted); }
.mode.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); box-shadow: inset 0 0 0 1px var(--accent); }
@container (max-width: 460px) { .modes { grid-template-columns: 1fr; } }
.libres { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px 14px; margin-top: 12px; }
.libres label { display: flex; align-items: center; gap: 8px; font-size: 13px; min-width: 0; }
.libre-n { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.libres .inp-wrap { width: 92px; flex: none; }
.libre-tot { margin-top: 10px; }
.explain { margin-top: 12px; font-size: 13px; color: var(--fg2); line-height: 1.6; }
</style>
