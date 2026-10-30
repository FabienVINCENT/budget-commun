<script setup lang="ts">
import { computed } from 'vue'
import { freePartsTotal } from '../lib/compute'
import { formatEuros, formatPct, permilleToInput, ratio } from '../lib/money'
import { result, state } from '../store'
import { personStyle, scrollToId, widthPct } from '../ui'
import PersonAvatar from './PersonAvatar.vue'
import CategoryBreakdown from './CategoryBreakdown.vue'

const MODE_LABELS = { egal: 'À parts égales', prorata: 'Au prorata des revenus', libre: 'Parts libres' } as const
const b = computed(() => state.budget!)
const r = computed(() => result.value!)
const cards = computed(() =>
  b.value.people.map((p, i) => {
    const v = r.value.parts[i] ?? 0
    return { p, v, rest: p.income - v, share: ratio(v, p.income) }
  }),
)
</script>

<template>
  <section id="resultat" class="card res" aria-labelledby="h-resultat">
    <div class="hd" style="margin-bottom: 8px">
      <h2 id="h-resultat"><span class="stepn" aria-hidden="true">4</span>Résultat</h2>
      <span class="pill acc">{{ MODE_LABELS[b.mode] }}</span>
    </div>

    <div v-if="!r.valid" class="warnbox" role="alert">
      Les parts libres font {{ permilleToInput(freePartsTotal(b)) }} % au lieu de 100 %.
      <a href="#partage" @click.prevent="scrollToId('partage')">Corrige-les dans « Mode de partage »</a> pour voir le résultat.
    </div>

    <template v-else>
      <div class="pot">
        <div class="lbl">Pot commun à alimenter chaque mois</div>
        <div class="big" data-test="pot">{{ formatEuros(r.total) }}</div>
        <div class="meta">
          soit {{ formatEuros(r.yearly) }} par an<template v-if="r.incomes > 0"> · {{ formatPct(ratio(r.total, r.incomes)) }} des revenus du foyer</template>
        </div>
      </div>

      <p v-if="b.charges.length === 0" class="warnbox">Ajoute des charges à l’étape 2 pour voir qui verse combien.</p>
      <p v-if="r.customInvalid.length" class="warnbox">
        {{ r.customInvalid.length > 1 ? `${r.customInvalid.length} charges « sur mesure » ne font` : 'Une charge « sur mesure » ne fait' }} pas 100 % :
        elle est partagée selon les % saisis. Vérifie-la dans Charges.
      </p>

      <template v-if="r.total > 0">
        <div class="stack" role="img" :aria-label="`Répartition du pot : ${cards.map((c) => `${c.p.name} ${formatPct(ratio(c.v, r.total))}`).join(', ')}`">
          <i v-for="c in cards" v-show="c.v > 0" :key="c.p.id" :style="[personStyle(c.p), { flexGrow: c.v }]"></i>
        </div>
        <div class="legend" aria-hidden="true">
          <span v-for="c in cards" :key="c.p.id"><i class="dot" :style="personStyle(c.p)"></i>{{ c.p.name }} <b>{{ formatPct(ratio(c.v, r.total)) }}</b></span>
        </div>
      </template>

      <ul class="res-grid">
        <li v-for="c in cards" :key="c.p.id" class="pc" :style="personStyle(c.p)">
          <div class="pc-h"><PersonAvatar :person="c.p" /><b>{{ c.p.name }}</b></div>
          <div class="amtw"><div class="lbl">À virer chaque mois</div><div class="amt" data-test="part">{{ formatEuros(c.v) }}</div></div>
          <div class="gw">
            <span class="gbar pg" aria-hidden="true"><i :style="{ width: widthPct(c.v, c.p.income) }"></i></span>
            <div class="gl">
              <template v-if="c.p.income > 0">
                <span><b>{{ formatPct(c.share) }}</b> de son revenu</span>
                <span>revenu {{ formatEuros(c.p.income) }}</span>
              </template>
              <span v-else>pas de revenu saisi</span>
            </div>
          </div>
          <div class="kvs"><div class="kv"><span>Reste pour toi</span><b :class="{ neg: c.rest < 0 }">{{ formatEuros(c.rest) }}</b></div></div>
        </li>
      </ul>

      <CategoryBreakdown v-if="r.total > 0" />
    </template>
  </section>
</template>

<style>
.res { container-type: inline-size; }
.pot { margin-bottom: 12px; display: grid; gap: 2px; }
.res-grid { list-style: none; margin: 16px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.pc { --pc: var(--p1); border: 1px solid var(--line); border-radius: 16px; padding: 16px; background: var(--raised); min-width: 0; }
.pc-h { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; min-width: 0; }
.pc-h b { color: var(--fg); font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc .amt { font-size: 28px; font-weight: 500; color: var(--fg); letter-spacing: -0.025em; font-variant-numeric: tabular-nums; line-height: 1.15; }
.pc .gbar.pg { height: 8px; margin: 12px 0 6px; }
.pc .gbar.pg > i { background: var(--pc); }
.pc .gl { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--muted); margin-bottom: 6px; flex-wrap: wrap; }
.pc .gl b { color: var(--fg2); font-weight: 500; }
.res .warnbox + .warnbox, .pot + .warnbox { margin-bottom: 12px; }
.res .warnbox a { color: var(--accent); }
@container (max-width: 520px) {
  .res-grid { grid-template-columns: 1fr; gap: 8px; }
  .pc { padding: 12px 14px; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'h a' 'g g' 'k k'; column-gap: 10px; }
  .pc-h { grid-area: h; margin: 0; }
  .pc .amtw { grid-area: a; text-align: right; }
  .pc .amt { font-size: 21px; }
  .pc .amtw .lbl { display: none; }
  .pc .gw { grid-area: g; }
  .pc .gbar.pg { margin: 10px 0 4px; height: 6px; }
  .pc .kvs { grid-area: k; }
  .pc .kvs .kv { border: 0; padding: 2px 0; }
}
</style>
