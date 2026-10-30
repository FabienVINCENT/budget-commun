<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { formatEuros } from '../lib/money'
import { addPerson, removePerson } from '../lib/ops'
import type { Person } from '../lib/types'
import { state, toast } from '../store'
import { askConfirm, plural } from '../ui'
import NumInput from './NumInput.vue'
import PersonAvatar from './PersonAvatar.vue'

const b = computed(() => state.budget!)
const total = computed(() => b.value.people.reduce((s, p) => s + p.income, 0))

async function add(): Promise<void> {
  const id = addPerson(b.value)
  if (!id) return toast('Le nombre maximal de personnes est atteint')
  await nextTick()
  const el = document.getElementById(`pn-${id}`) as HTMLInputElement | null
  el?.focus()
  el?.select()
}
async function remove(p: Person): Promise<void> {
  const used = b.value.charges.some(
    (c) => (c.override?.type === 'payer' && c.override.personId === p.id) || (c.override?.type === 'custom' && (c.override.parts[p.id] ?? 0) > 0),
  )
  if (used) {
    const ok = await askConfirm({
      title: `Retirer ${p.name} ?`,
      body: `Des charges ont une règle pour ${p.name}. Elles repasseront dans le partage commun.`,
      ok: 'Retirer',
      cancel: 'Annuler',
      danger: true,
    })
    if (!ok) return
  }
  removePerson(b.value, p.id)
  toast(`${p.name} retiré·e`)
}
function rename(p: Person, v: string): void {
  p.name = v.replace(/\s+/g, ' ').slice(0, 80)
  b.value.example = false
}
function setIncome(p: Person, v: number): void {
  p.income = v
  b.value.example = false
}
</script>

<template>
  <section id="personnes" class="card" aria-labelledby="h-personnes">
    <div class="hd">
      <div>
        <h2 id="h-personnes"><span class="stepn" aria-hidden="true">1</span>Personnes</h2>
        <p>Qui participe, et combien chacun gagne par mois (net).</p>
      </div>
      <span class="pill">{{ plural(b.people.length, 'personne') }}</span>
    </div>
    <ul class="plist">
      <li v-for="(p, i) in b.people" :key="p.id" class="prow">
        <PersonAvatar :person="p" />
        <input
          :id="`pn-${p.id}`"
          class="inp"
          :value="p.name"
          maxlength="80"
          autocomplete="off"
          :aria-label="`Prénom de la personne ${i + 1}`"
          @input="rename(p, ($event.target as HTMLInputElement).value)"
          @blur="p.name = p.name.trim() || `Personne ${i + 1}`"
        />
        <NumInput :model-value="p.income" unit="€" unit-extra=" / mois" wide :label="`Revenu net mensuel de ${p.name}`" @update:model-value="setIncome(p, $event)" />
        <button type="button" class="icon-btn del" :disabled="b.people.length <= 1" :aria-label="`Retirer ${p.name}`" :title="`Retirer ${p.name}`" @click="remove(p)">×</button>
      </li>
    </ul>
    <div class="tot">
      <button type="button" class="btn sm" @click="add">+ Ajouter une personne</button>
      <span class="lbl">Revenus du foyer <b class="num">{{ formatEuros(total) }}</b></span>
    </div>
  </section>
</template>

<style>
.plist { list-style: none; margin: 0; padding: 0; container-type: inline-size; }
.prow { display: grid; grid-template-columns: 30px minmax(0, 1fr) 170px 36px; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px solid var(--line); }
.prow:first-child { border-top: 0; }
@media (pointer: coarse) { .prow { grid-template-columns: 30px minmax(0, 1fr) 150px 44px; } }
/* Étroit : « / mois » est déjà dit dans le sous-titre, on garde la place pour le prénom. */
@container (max-width: 420px) {
  .prow { grid-template-columns: 30px minmax(0, 1fr) 112px 44px; gap: 6px; }
  .prow .inp-wrap.wide .inp { padding-right: 26px; }
  .prow .unit-x { display: none; }
}
</style>
