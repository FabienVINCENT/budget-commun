<script setup lang="ts">
/** Boîte de dialogue native (<dialog>) : focus piégé, Échap pour fermer. */
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

defineProps<{ title: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const el = ref<HTMLDialogElement | null>(null)
const titleId = useId()
let opener: HTMLElement | null = null

onMounted(async () => {
  opener = document.activeElement as HTMLElement | null
  await nextTick()
  el.value?.showModal()
})
onBeforeUnmount(() => {
  el.value?.close()
  opener?.focus?.({ preventScroll: true })
})
function onCancel(e: Event): void {
  e.preventDefault()
  emit('close')
}
function onClick(e: MouseEvent): void {
  // Clic sur le fond (en dehors du contenu) : fermer.
  if (e.target === el.value) emit('close')
}
</script>

<template>
  <dialog ref="el" class="dlg" :class="{ wide }" :aria-labelledby="titleId" @cancel="onCancel" @click="onClick">
    <h2 :id="titleId">{{ title }}</h2>
    <slot />
  </dialog>
</template>

<style>
dialog.dlg.wide { width: min(520px, calc(100vw - 28px)); }
</style>
