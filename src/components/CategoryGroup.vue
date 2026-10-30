<script setup lang="ts">
/** Une catégorie repliable : en-tête (sous-totaux) + charges + réglages de la catégorie. */
import { computed, nextTick, useId } from 'vue'
import type { CategoryResult } from '../lib/compute'
import { EMOJIS } from '../lib/defaults'
import { formatEuros, formatPct, ratio } from '../lib/money'
import { addCharge, chargesIn, fallbackFor, removeCategory } from '../lib/ops'
import { state, toast } from '../store'
import { askConfirm, catStyle, justAdded, plural, widthPct } from '../ui'
import ChargeRow from './ChargeRow.vue'

const props = defineProps<{ group: CategoryResult; total: number; open: boolean }>()
const emit = defineEmits<{ toggle: [open: boolean]; openOther: [id: string] }>()
const b = computed(() => state.budget!)
const k = computed(() => props.group.category)
const items = computed(() => chargesIn(b.value, k.value.id))
const share = computed(() => ratio(props.group.monthly, props.total))
const bodyId = useId()
const emojis = computed(() => (EMOJIS.includes(k.value.emoji) ? EMOJIS : [k.value.emoji, ...EMOJIS]))

async function add(): Promise<void> {
  const id = addCharge(b.value, k.value.id)
  if (!id) return toast('Le nombre maximal de charges est atteint')
  justAdded.chargeId = id
  emit('toggle', true)
  await nextTick()
  const el = document.querySelector<HTMLInputElement>(`[data-charge="${id}"]`)
  el?.focus()
  el?.select()
}
async function remove(): Promise<void> {
  const n = items.value.length
  const to = fallbackFor(b.value, k.value.id)?.name ?? 'Divers'
  if (n) {
    const ok = await askConfirm({
      title: `Supprimer « ${k.value.name} » ?`,
      body: `${n > 1 ? `Ses ${n} charges iront` : 'Sa charge ira'} dans « ${to} ». Rien n’est perdu.`,
      ok: 'Supprimer la catégorie',
      cancel: 'Annuler',
      danger: true,
    })
    if (!ok) return
  }
  const name = k.value.name
  const target = removeCategory(b.value, k.value.id)
  if (target) toast(n ? `« ${name} » supprimée · ${plural(n, 'charge')} dans ${target.name}` : `« ${name} » supprimée`)
}
function rename(v: string): void {
  k.value.name = v.slice(0, 80)
  b.value.example = false
}
function setEmoji(v: string): void {
  k.value.emoji = v
  b.value.example = false
}
</script>

<template>
  <div class="grp" :class="{ open, empty: !group.count }" :style="catStyle(k)">
    <button type="button" class="grp-h" :aria-expanded="open" :aria-controls="bodyId" @click="emit('toggle', !open)">
      <span class="tile" aria-hidden="true">{{ k.emoji }}</span>
      <span class="grp-n"><b>{{ k.name }}</b><span class="meta">{{ group.count ? `${plural(group.count, 'charge')} · ${formatEuros(group.yearly)}/an` : 'vide' }}</span></span>
      <span class="grp-v"><b>{{ formatEuros(group.monthly) }}</b><span class="meta">/mois · {{ formatPct(share) }}</span></span>
      <svg class="grp-c" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
      <span class="gbar" aria-hidden="true"><i :class="{ some: group.monthly > 0 }" :style="{ width: widthPct(group.monthly, total) }"></i></span>
    </button>
    <div v-if="open" :id="bodyId" class="grp-b">
      <template v-if="items.length">
        <div class="chead" aria-hidden="true"><span></span><span>Libellé</span><span>Montant</span><span>Fréquence</span><span>Par mois</span><span>Qui paie</span><span></span></div>
        <ul class="clist" :aria-label="`Charges de ${k.name}`">
          <ChargeRow v-for="c in items" :key="c.id" :charge="c" @moved="emit('openOther', $event)" />
        </ul>
      </template>
      <p v-else class="grp-empty">Rien dans cette catégorie pour l’instant.</p>
      <div class="grp-f">
        <button type="button" class="btn sm" @click="add">+ Ajouter dans {{ k.name }}</button>
        <span class="edit">
          <span class="meta">Catégorie</span>
          <label class="tile sm" title="Changer l’emoji">
            <span aria-hidden="true">{{ k.emoji }}</span>
            <select :value="k.emoji" :aria-label="`Emoji de la catégorie ${k.name}`" @change="setEmoji(($event.target as HTMLSelectElement).value)">
              <option v-for="e in emojis" :key="e" :value="e">{{ e }}</option>
            </select>
          </label>
          <input class="inp" :data-cat="k.id" :value="k.name" maxlength="80" autocomplete="off" :aria-label="`Nom de la catégorie ${k.name}`" @input="rename(($event.target as HTMLInputElement).value)" @blur="k.name = k.name.trim() || 'Sans nom'" />
          <button type="button" class="icon-btn del" :disabled="b.categories.length <= 1" :aria-label="`Supprimer la catégorie ${k.name}`" title="Supprimer la catégorie" @click="remove">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
          </button>
        </span>
      </div>
    </div>
  </div>
</template>

<style src="./category-group.css"></style>
