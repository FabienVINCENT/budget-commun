<script setup lang="ts">
import { computed } from 'vue'
import type { Person } from '../lib/types'
import { state } from '../store'
import { initials, personStyle } from '../ui'

const props = defineProps<{ person: Person; small?: boolean }>()
const text = computed(() => initials(props.person, state.budget?.people ?? []))
</script>

<template>
  <span class="av" :class="{ sm: small }" :style="personStyle(person)" aria-hidden="true">{{ text }}</span>
</template>
