<script setup lang="ts">
/** Menu d'étapes collant : surligne la section en cours de lecture. */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { scrollToId } from '../ui'

const STEPS = [
  { id: 'personnes', label: '1 · Personnes' },
  { id: 'charges', label: '2 · Charges' },
  { id: 'partage', label: '3 · Partage' },
  { id: 'resultat', label: '4 · Résultat' },
  { id: 'comparer', label: 'Comparer' },
  { id: 'donnees', label: 'Données' },
] as const

const current = ref<string>(STEPS[0].id)
const stuck = ref(false)
const nav = ref<HTMLElement | null>(null)
let raf = 0

function sync(): void {
  raf = 0
  const n = nav.value
  if (!n) return
  const bottom = n.getBoundingClientRect().bottom
  let cur: string = STEPS[0].id
  for (const s of STEPS) {
    const el = document.getElementById(s.id)
    if (el && el.getBoundingClientRect().top <= bottom + 40) cur = s.id
  }
  const se = document.scrollingElement ?? document.documentElement
  if (se.scrollTop > 0 && se.scrollTop + window.innerHeight >= se.scrollHeight - 4) cur = STEPS[STEPS.length - 1].id
  stuck.value = n.getBoundingClientRect().top <= 1 && se.scrollTop > 40
  if (cur !== current.value) {
    current.value = cur
    void nextTick(() => {
      const a = n.querySelector<HTMLElement>('a.on')
      if (a) n.scrollTo({ left: a.offsetLeft - n.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' })
    })
  }
}
const onScroll = (): void => {
  if (!raf) raf = requestAnimationFrame(sync)
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  sync()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  cancelAnimationFrame(raf)
})
function go(id: string): void {
  current.value = id
  scrollToId(id)
}
</script>

<template>
  <nav ref="nav" class="anav" :class="{ stuck }" aria-label="Étapes">
    <a
      v-for="s in STEPS"
      :key="s.id"
      :href="`#${s.id}`"
      :class="{ on: current === s.id }"
      :aria-current="current === s.id ? 'step' : undefined"
      @click.prevent="go(s.id)"
    >{{ s.label }}</a>
  </nav>
</template>

<style>
.anav { position: sticky; top: 0; z-index: 5; display: flex; gap: 6px; padding: 10px var(--apad); margin: 0 calc(-1 * var(--apad)) 8px;
  background: var(--bg); overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
.anav.stuck { border-bottom-color: var(--line); }
.anav::-webkit-scrollbar { display: none; }
.anav a { text-decoration: none; color: var(--fg2); font-size: 13px; font-weight: 500; padding: 8px 12px; border-radius: 99px; white-space: nowrap;
  background: var(--control); transition: background 0.2s, color 0.2s; display: inline-flex; align-items: center; }
.anav a:hover { color: var(--fg); }
.anav a.on { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }
.anav a:focus-visible { outline-offset: -2px; }
@media (max-width: 720px) {
  .anav { -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); }
}
@media (pointer: coarse) { .anav a { min-height: 44px; } }
</style>
