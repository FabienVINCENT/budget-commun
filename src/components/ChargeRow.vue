<script setup lang="ts">
/**
 * Une charge. Écran large : une ligne éditable complète.
 * Écran étroit : une ligne compacte (libellé, montant/mois) ; les réglages s'ouvrent au toucher.
 */
import { computed, ref } from 'vue'
import { customPartsTotal } from '../lib/compute'
import { FREQUENCIES } from '../lib/types'
import type { Charge, Frequency } from '../lib/types'
import { monthlyOf } from '../lib/frequency'
import { FREQUENCY_LABELS } from '../lib/frequency'
import { formatEuros, permilleToInput, PERMILLE } from '../lib/money'
import { moveCharge, overrideChoice, removeCharge, setOverride } from '../lib/ops'
import { state, toast } from '../store'
import { catStyle, justAdded } from '../ui'
import NumInput from './NumInput.vue'
import PersonAvatar from './PersonAvatar.vue'

const props = defineProps<{ charge: Charge }>()
const emit = defineEmits<{ moved: [categoryId: string] }>()
const b = computed(() => state.budget!)
const c = computed(() => props.charge)
const open = ref(justAdded.chargeId === props.charge.id)
const cat = computed(() => b.value.categories.find((k) => k.id === c.value.categoryId) ?? b.value.categories[0])
const monthly = computed(() => monthlyOf(c.value))
const customTotal = computed(() => (c.value.override?.type === 'custom' ? customPartsTotal(b.value.people, c.value.override.parts) : 0))
const payerName = computed(() => {
  const o = c.value.override
  if (o?.type === 'payer') return b.value.people.find((p) => p.id === o.personId)?.name ?? ''
  return o?.type === 'custom' ? 'sur mesure' : ''
})

const touch = (): void => void (b.value.example = false)
function setLabel(v: string): void {
  c.value.label = v.slice(0, 80)
  touch()
}
function setAmount(v: number): void {
  c.value.amount = v
  touch()
}
function setFreq(v: string): void {
  if ((FREQUENCIES as readonly string[]).includes(v)) c.value.frequency = v as Frequency
  touch()
}
function move(id: string): void {
  if (moveCharge(b.value, c.value.id, id)) {
    toast(`Déplacée dans ${b.value.categories.find((k) => k.id === id)?.name}`)
    emit('moved', id)
  }
}
function setPart(pid: string, v: number): void {
  if (c.value.override?.type === 'custom') c.value.override.parts[pid] = v
  touch()
}
</script>

<template>
  <li class="crow" :class="{ exp: open }" :style="catStyle(cat)">
    <button type="button" class="csum" :aria-expanded="open" @click="open = !open">
      <span class="csum-l">{{ c.label || 'Sans nom' }}</span>
      <span class="csum-m"><b class="num">{{ formatEuros(monthly) }}</b><span class="meta">/mois<template v-if="c.frequency !== 'mensuel'"> · {{ FREQUENCY_LABELS[c.frequency] }}</template><template v-if="payerName"> · {{ payerName }}</template></span></span>
      <svg class="chev" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>

    <div class="cedit">
      <label class="tile sm t" :title="'Changer de catégorie'">
        <span aria-hidden="true">{{ cat.emoji }}</span>
        <select :value="c.categoryId" :aria-label="`Catégorie de ${c.label}`" @change="move(($event.target as HTMLSelectElement).value)">
          <option v-for="k in b.categories" :key="k.id" :value="k.id">{{ k.emoji }} {{ k.name }}</option>
        </select>
      </label>
      <input class="inp l" :value="c.label" maxlength="80" autocomplete="off" aria-label="Libellé" :data-charge="c.id" @input="setLabel(($event.target as HTMLInputElement).value)" />
      <NumInput class="m" :model-value="c.amount" :label="`Montant de ${c.label}`" @update:model-value="setAmount" />
      <select class="inp f" :value="c.frequency" :aria-label="`Fréquence de ${c.label}`" @change="setFreq(($event.target as HTMLSelectElement).value)">
        <option v-for="f in FREQUENCIES" :key="f" :value="f">{{ FREQUENCY_LABELS[f] }}</option>
      </select>
      <div class="e"><b class="num">{{ formatEuros(monthly) }}</b><span class="meta">/mois</span></div>
      <select class="inp r" :value="overrideChoice(c.override)" :aria-label="`Qui paie ${c.label}`" @change="setOverride(b, c.id, ($event.target as HTMLSelectElement).value)">
        <option value="mode">Selon le partage</option>
        <option v-for="p in b.people" :key="p.id" :value="`payer:${p.id}`">Payée par {{ p.name }}</option>
        <option value="custom">Sur mesure (%)</option>
      </select>
      <button type="button" class="icon-btn del d" :aria-label="`Supprimer ${c.label}`" :title="`Supprimer ${c.label}`" @click="removeCharge(b, c.id)">×</button>

      <div v-if="c.override?.type === 'custom'" class="over">
        <label v-for="p in b.people" :key="p.id">
          <PersonAvatar :person="p" small /><span class="over-n">{{ p.name }}</span>
          <NumInput kind="pct" :model-value="c.override.parts[p.id] ?? 0" :label="`Part de ${p.name} pour ${c.label}, en %`" @update:model-value="setPart(p.id, $event)" />
        </label>
        <span class="pill" :class="customTotal === PERMILLE ? 'pos' : 'neg'" role="status">
          {{ customTotal === PERMILLE ? 'Total 100 % ✓' : `Total ${permilleToInput(customTotal)} % (il faut 100 %)` }}
        </span>
      </div>
    </div>
  </li>
</template>

<style src="./charge-row.css"></style>
