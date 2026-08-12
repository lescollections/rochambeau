<script setup lang="ts">
import { computed } from 'vue'
import { highlight } from '@/lib/search'

const props = defineProps<{
  text: string
  query?: string
}>()

const fragments = computed(() => highlight(props.text, props.query ?? ''))
</script>

<template>
  <span
    ><template v-for="(fragment, index) in fragments" :key="index"
      ><mark
        v-if="fragment.marked"
        class="rounded-xs bg-amber-200/70 text-inherit dark:bg-amber-500/30"
        >{{ fragment.text }}</mark
      ><template v-else>{{ fragment.text }}</template></template
    ></span
  >
</template>
