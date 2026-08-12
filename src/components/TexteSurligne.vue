<script setup lang="ts">
import { computed } from 'vue'
import { surligner } from '@/lib/recherche'

const props = defineProps<{
  texte: string
  requete?: string
}>()

const fragments = computed(() => surligner(props.texte, props.requete ?? ''))
</script>

<template>
  <span
    ><template v-for="(fragment, index) in fragments" :key="index"
      ><mark
        v-if="fragment.marque"
        class="rounded-xs bg-amber-200/70 text-inherit dark:bg-amber-500/30"
        >{{ fragment.texte }}</mark
      ><template v-else>{{ fragment.texte }}</template></template
    ></span
  >
</template>
