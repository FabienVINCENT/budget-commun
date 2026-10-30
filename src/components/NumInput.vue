<script setup lang="ts">
/**
 * Champ numérique à la française. La valeur est un entier :
 * centimes (kind="eur") ou pour-mille (kind="pct"). Validée à la sortie du champ.
 */
import { ref, watch } from 'vue'
import { centsToInput, parseEuros, parsePermille, permilleToInput } from '../lib/money'

const props = withDefaults(
  defineProps<{ modelValue: number; kind?: 'eur' | 'pct'; unit?: string; unitExtra?: string; label: string; wide?: boolean; inputId?: string }>(),
  { kind: 'eur', unit: undefined, unitExtra: undefined, wide: false, inputId: undefined },
)
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const format = (v: number): string => (props.kind === 'eur' ? centsToInput(v) : permilleToInput(v))
const text = ref(format(props.modelValue))
const invalid = ref(false)
const focused = ref(false)

watch(
  () => props.modelValue,
  (v) => {
    if (!focused.value) text.value = format(v)
  },
)

function commit(): void {
  const raw = text.value.trim()
  const v = raw === '' ? 0 : props.kind === 'eur' ? parseEuros(raw) : parsePermille(raw)
  if (v === null) {
    invalid.value = true
    return
  }
  invalid.value = false
  if (v !== props.modelValue) emit('update:modelValue', v)
  text.value = format(v)
}
function onBlur(): void {
  focused.value = false
  commit()
  if (invalid.value) {
    // Saisie illisible : on revient à la dernière valeur correcte.
    text.value = format(props.modelValue)
    setTimeout(() => (invalid.value = false), 1200)
  }
}
function onFocus(e: FocusEvent): void {
  focused.value = true
  invalid.value = false
  const el = e.target as HTMLInputElement
  if (props.modelValue === 0) el.select()
}
</script>

<template>
  <div class="inp-wrap" :class="{ wide }">
    <input
      :id="inputId"
      v-model="text"
      class="inp"
      inputmode="decimal"
      autocomplete="off"
      enterkeyhint="done"
      :aria-label="label"
      :aria-invalid="invalid ? 'true' : undefined"
      :title="invalid ? (kind === 'eur' ? 'Montant illisible' : 'Pourcentage entre 0 et 100') : undefined"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
    />
    <span class="unit" aria-hidden="true">{{ unit ?? (kind === 'eur' ? '€' : '%') }}<span v-if="unitExtra" class="unit-x">{{ unitExtra }}</span></span>
  </div>
</template>
