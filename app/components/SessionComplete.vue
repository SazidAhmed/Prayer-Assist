<script setup lang="ts">
import { usePrayerStore } from '~/stores/prayerStore'

const store = usePrayerStore()
const emit = defineEmits<{ back: [] }>()

const timeTaken = computed(() => {
  if (!store.session.sessionStartTime) return '—'
  const secs = Math.floor((Date.now() - store.session.sessionStartTime) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
})

function handleBack() {
  store.dismissSession()
  emit('back')
}
</script>

<template>
  <div
    id="session-complete"
    class="h-full w-full flex flex-col items-center justify-center bg-[#080c14] px-8"
  >
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
    </div>

    <div class="relative mb-8 z-10">
      <div class="w-28 h-28 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
        <span class="text-5xl">✨</span>
      </div>
      <div class="absolute inset-0 rounded-full ring-2 ring-emerald-400/30 animate-ping" />
    </div>

    <h2 class="text-white text-3xl font-black mb-2 z-10">Prayer Complete!</h2>
    <p class="text-white/50 text-base mb-10 z-10">
      {{ store.activePrayer?.name }} — {{ store.activePrayer?.arabicName }}
    </p>

    <div class="w-full max-w-xs grid grid-cols-2 gap-3 mb-10 z-10">
      <div class="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-1">
        <span class="text-3xl font-black text-white">{{ store.session.totalRakatsPrayed }}</span>
        <span class="text-white/40 text-xs uppercase tracking-widest">Rakats</span>
      </div>
      <div class="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-1">
        <span class="text-3xl font-black text-white">{{ timeTaken }}</span>
        <span class="text-white/40 text-xs uppercase tracking-widest">Duration</span>
      </div>
    </div>

    <button
      id="back-to-dashboard"
      class="z-10 w-full max-w-xs h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all text-white font-bold text-base tracking-wide shadow-lg shadow-emerald-500/30"
      @click="handleBack"
    >
      Back to Dashboard
    </button>
  </div>
</template>
