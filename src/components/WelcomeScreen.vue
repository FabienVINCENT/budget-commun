<script setup lang="ts">
import { loadExample, startEmpty } from '../store'
</script>

<template>
  <main class="card welcome">
    <h2>Combien chacun verse sur le compte commun ?</h2>
    <p>
      Note qui participe et ce que chacun gagne, puis les charges du foyer : prêt ou loyer, énergie, assurances, abonnements…
      Choisis comment partager (à parts égales, selon les revenus ou avec tes propres pourcentages) : tu vois tout de suite
      combien chacun doit virer chaque mois.
    </p>
    <ul class="welcome-l">
      <li><span aria-hidden="true">🔒</span> Pas de compte. Tout reste dans ce navigateur.</li>
      <li><span aria-hidden="true">🔗</span> Pour l’envoyer à l’autre : un lien, un QR code ou un fichier.</li>
      <li><span aria-hidden="true">🧮</span> Les montants tombent juste, au centime près.</li>
    </ul>
    <div class="welcome-act">
      <button type="button" class="btn primary" @click="startEmpty">Commencer</button>
      <button type="button" class="btn" @click="loadExample">Voir un exemple</button>
    </div>
    <p class="meta">L’exemple est un couple avec enfants (données inventées). Tu pourras l’effacer à tout moment.</p>
  </main>
</template>

<style>
.welcome { margin-top: 16px; display: grid; gap: 14px; padding: 28px; }
.welcome h2 { font-size: 22px; }
.welcome > p:first-of-type { font-size: 15px; line-height: 1.6; max-width: 62ch; }
.welcome-l { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 14px; }
.welcome-l li { display: flex; gap: 10px; }
.welcome-act { display: flex; gap: 10px; flex-wrap: wrap; }
.welcome-act .btn { min-height: 46px; padding: 0 22px; font-size: 15px; }
@media (max-width: 720px) { .welcome { padding: 20px 16px; } .welcome-act .btn { flex: 1 1 140px; } }
</style>
