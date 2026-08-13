import { readonly, ref } from 'vue'

/**
 * Whether captions have to be tapped rather than hovered.
 *
 * The first test is the width: a narrow window has no room to spare, whatever
 * the machine — a laptop with a half-width window reads like a phone. The
 * second catches the tablet held in landscape, wide enough by that measure but
 * with no pointer to hover with.
 */
const QUERY = '(max-width: 799px), (hover: none)'

const watcher = window.matchMedia(QUERY)
const compact = ref(watcher.matches)
watcher.addEventListener('change', (event) => (compact.value = event.matches))

export function useCompact() {
  return readonly(compact)
}
