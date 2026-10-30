<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { shareState } from './actions'
import { flush, handleHash, state, toasts } from './store'
import AppHeader from './components/AppHeader.vue'
import StepNav from './components/StepNav.vue'
import WelcomeScreen from './components/WelcomeScreen.vue'
import PeopleSection from './components/PeopleSection.vue'
import ChargesSection from './components/ChargesSection.vue'
import SplitSection from './components/SplitSection.vue'
import ResultSection from './components/ResultSection.vue'
import CompareSection from './components/CompareSection.vue'
import DataSection from './components/DataSection.vue'
import ShareDialog from './components/ShareDialog.vue'
import IncomingDialog from './components/IncomingDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'

// Un lien collé dans un onglet déjà ouvert ne recharge pas la page.
onMounted(() => {
  window.addEventListener('hashchange', handleHash)
  window.addEventListener('pagehide', flush)
})
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', handleHash)
  window.removeEventListener('pagehide', flush)
})
</script>

<template>
  <div class="app">
    <AppHeader />

    <div v-if="state.loadError" class="errbox" role="alert">
      <span aria-hidden="true">⚠️</span>
      <p>{{ state.loadError }}</p>
      <button type="button" class="icon-btn" aria-label="Fermer le message" @click="state.loadError = ''">×</button>
    </div>
    <div v-if="state.storageWarning" class="warnbox" role="status" style="margin-top: 8px">{{ state.storageWarning }}</div>
    <div v-if="!state.storageOk" class="warnbox" role="status" style="margin-top: 8px">
      Ce navigateur n’enregistre rien (navigation privée ?). Exporte ton budget dans un fichier pour le garder.
    </div>

    <WelcomeScreen v-if="!state.budget" />
    <template v-else>
      <StepNav />
      <main>
        <PeopleSection />
        <ChargesSection />
        <SplitSection />
        <ResultSection />
        <CompareSection />
        <DataSection />
      </main>
    </template>

    <footer class="foot meta">
      Budget commun · logiciel libre (MIT) · aucune donnée ne quitte ton navigateur.
    </footer>
  </div>

  <ShareDialog v-if="shareState.open" />
  <IncomingDialog />
  <ConfirmDialog />
  <div class="toasts" role="status" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="toast">{{ t.text }}</div>
  </div>
</template>

<style>
.foot { text-align: center; margin-top: 28px; }
.errbox { margin-top: 8px; }
</style>
