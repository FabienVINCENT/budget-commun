<script setup lang="ts">
/** Le pot catégorie par catégorie : barre empilée + tableau (cartes empilées sur mobile). */
import { computed } from 'vue'
import { formatEuros, formatPct, ratio } from '../lib/money'
import { result, state } from '../store'
import { catStyle, plural, widthPct } from '../ui'
import PersonAvatar from './PersonAvatar.vue'

const b = computed(() => state.budget!)
const r = computed(() => result.value!)
const cats = computed(() => r.value.categories.filter((g) => g.monthly > 0))
const nEmpty = computed(() => r.value.categories.length - cats.value.length)
const eur2 = (v: number): string => formatEuros(v, true)
</script>

<template>
  <div class="sub">
    <h3>Le pot, catégorie par catégorie</h3>
    <p>Chaque ligne est partagée à part : la somme des parts tombe juste, au centime près.</p>
    <div class="stack" role="img" :aria-label="`Répartition du pot par catégorie : ${cats.map((g) => `${g.category.name} ${formatPct(ratio(g.monthly, r.total))}`).join(', ')}`">
      <i v-for="g in cats" :key="g.category.id" :style="[catStyle(g.category), { flexGrow: g.monthly }]"></i>
    </div>
    <div class="legend" aria-hidden="true">
      <span v-for="g in cats" :key="g.category.id" :style="catStyle(g.category)"><i class="dot sq"></i>{{ g.category.name }} <b>{{ formatPct(ratio(g.monthly, r.total)) }}</b></span>
    </div>

    <div class="rc-table">
      <table class="t">
        <caption class="sr">Part de chaque personne par catégorie, en euros par mois</caption>
        <thead>
          <tr>
            <th scope="col">Catégorie</th>
            <th v-for="p in b.people" :key="p.id" scope="col"><span class="who"><PersonAvatar :person="p" small /><span>{{ p.name }}</span></span></th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in cats" :key="g.category.id" :style="catStyle(g.category)">
            <th scope="row">
              <div class="rc-cat"><span class="tile sm" aria-hidden="true">{{ g.category.emoji }}</span>
                <div><span class="nm">{{ g.category.name }}</span><span class="meta">{{ plural(g.count, 'charge') }} · {{ formatPct(ratio(g.monthly, r.total)) }}</span></div>
              </div>
            </th>
            <td v-for="(v, i) in g.parts" :key="i" :class="{ mut: v === 0 }">{{ eur2(v) }}</td>
            <td class="tc">{{ eur2(g.monthly) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr><th scope="row">Total / mois</th><td v-for="(v, i) in r.parts" :key="i">{{ eur2(v) }}</td><td data-test="total-table">{{ eur2(r.total) }}</td></tr>
        </tfoot>
      </table>
    </div>

    <ul class="rc-cards">
      <li v-for="g in cats" :key="g.category.id" class="rcc" :style="catStyle(g.category)">
        <div class="rcc-h"><span class="tile sm" aria-hidden="true">{{ g.category.emoji }}</span><b>{{ g.category.name }}</b>
          <span class="v">{{ eur2(g.monthly) }}<span class="meta">{{ formatPct(ratio(g.monthly, r.total)) }} du pot</span></span></div>
        <span class="gbar" aria-hidden="true"><i class="some" :style="{ width: widthPct(g.monthly, r.total) }"></i></span>
        <div class="rcc-p">
          <div v-for="(p, i) in b.people" :key="p.id" :class="{ z: g.parts[i] === 0 }"><PersonAvatar :person="p" small /><span>{{ p.name }}</span><b>{{ eur2(g.parts[i]) }}</b></div>
        </div>
      </li>
      <li class="rcc sum">
        <div class="rcc-h"><span class="tile sm" aria-hidden="true">Σ</span><b>Total / mois</b><span class="v">{{ eur2(r.total) }}</span></div>
        <div class="rcc-p" style="margin-top: 8px">
          <div v-for="(p, i) in b.people" :key="p.id"><PersonAvatar :person="p" small /><span>{{ p.name }}</span><b>{{ eur2(r.parts[i]) }}</b></div>
        </div>
      </li>
    </ul>
    <p v-if="nEmpty" class="meta" style="margin-top: 10px">{{ plural(nEmpty, 'catégorie vide', 'catégories vides') }} non {{ nEmpty > 1 ? 'affichées' : 'affichée' }}.</p>
  </div>
</template>

<style src="./breakdown.css"></style>
