<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { formatEuros } from '../lib/money'
import { addCategory } from '../lib/ops'
import { result, state, toast } from '../store'
import { plural } from '../ui'
import CategoryGroup from './CategoryGroup.vue'

const b = computed(() => state.budget!)
const r = computed(() => result.value!)
/** Catégories ouvertes (état d'affichage, non enregistré). */
const opened = ref(new Set<string>())
const allOpen = computed(() => b.value.categories.every((k) => opened.value.has(k.id)))

function setOpen(id: string, on: boolean): void {
  const s = new Set(opened.value)
  if (on) s.add(id)
  else s.delete(id)
  opened.value = s
}
function toggleAll(): void {
  opened.value = allOpen.value ? new Set() : new Set(b.value.categories.map((k) => k.id))
}
async function addCat(): Promise<void> {
  const id = addCategory(b.value)
  if (!id) return toast('Le nombre maximal de catégories est atteint')
  setOpen(id, true)
  await nextTick()
  const input = document.querySelector<HTMLInputElement>(`[data-cat="${id}"]`)
  input?.scrollIntoView({ block: 'center' })
  input?.focus()
  input?.select()
}
</script>

<template>
  <section id="charges" class="card" aria-labelledby="h-charges">
    <div class="hd">
      <div>
        <h2 id="h-charges"><span class="stepn" aria-hidden="true">2</span>Charges communes</h2>
        <p>Rangées par catégorie, de la plus grosse à la plus petite. Les montants trimestriels et annuels sont ramenés au mois.</p>
      </div>
      <span class="pill">{{ plural(b.charges.length, 'charge') }} · {{ plural(b.categories.length, 'catégorie') }}</span>
    </div>
    <div class="grps-bar">
      <span class="meta">Touche une catégorie pour voir et modifier ses charges.</span>
      <button type="button" class="btn sm" @click="toggleAll">{{ allOpen ? 'Tout fermer' : 'Tout ouvrir' }}</button>
    </div>
    <div class="grps">
      <CategoryGroup
        v-for="g in r.categories"
        :key="g.category.id"
        :group="g"
        :total="r.total"
        :open="opened.has(g.category.id)"
        @toggle="setOpen(g.category.id, $event)"
        @open-other="setOpen($event, true)"
      />
    </div>
    <div class="tot">
      <button type="button" class="btn sm" @click="addCat">+ Nouvelle catégorie</button>
      <span class="lbl">Total <b class="num">{{ formatEuros(r.total) }}</b> /mois</span>
    </div>
  </section>
</template>

<style>
.grps-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
</style>
