<script setup lang="ts">
import { ref, watch } from 'vue'
import { t } from '@/lib/i18n'

const modele = defineModel<string>({ required: true })

// Champ non contrôlé, synchronisé dans les deux sens : la frappe ne doit pas
// dépendre de l'aller-retour par l'URL, qui est volontairement différé.
const saisie = ref(modele.value)
watch(modele, (valeur) => {
  if (valeur !== saisie.value) saisie.value = valeur
})

const champ = ref<HTMLInputElement | null>(null)

function effacer() {
  saisie.value = ''
  modele.value = ''
  champ.value?.focus()
}
</script>

<template>
  <div class="relative">
    <label class="sr-only" for="recherche">{{ t('recherche.libelle') }}</label>
    <input
      id="recherche"
      ref="champ"
      v-model="saisie"
      type="search"
      autocomplete="off"
      spellcheck="false"
      :placeholder="t('recherche.marque')"
      class="w-full rounded-lg border border-stone-300 bg-white py-2.5 pr-10 pl-4 text-base placeholder:text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:placeholder:text-stone-500"
      @input="modele = saisie"
    />

    <button
      v-if="saisie"
      type="button"
      class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
      :aria-label="t('recherche.effacer')"
      @click="effacer"
    >
      <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M5 5l10 10M15 5L5 15" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>
