<script setup lang="ts">
import { answerConfirm, confirmState } from '../ui'
import ModalDialog from './ModalDialog.vue'
</script>

<template>
  <ModalDialog v-if="confirmState.current" :title="confirmState.current.title" @close="answerConfirm(false)">
    <p>{{ confirmState.current.body }}</p>
    <div class="dlg-act">
      <button type="button" class="btn" autofocus @click="answerConfirm(false)">{{ confirmState.current.cancel }}</button>
      <button type="button" class="btn" :class="confirmState.current.danger ? 'danger' : 'primary'" @click="answerConfirm(true)">
        {{ confirmState.current.ok }}
      </button>
    </div>
  </ModalDialog>
</template>
