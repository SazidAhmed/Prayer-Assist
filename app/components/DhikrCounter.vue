<script setup lang="ts">
import { usePrayerStore } from '~/stores/prayerStore'

const store = usePrayerStore()
const emit = defineEmits<{ close: [] }>()

// Dhikr phases: 33 SubhanAllah, 33 Alhamdulillah, 34 AllahuAkbar
const dhikrPhases = [
  { name: 'SubhanAllah', arabic: 'سُبْحَانَ ٱللَّٰهِ', target: 33 },
  { name: 'Alhamdulillah', arabic: 'ٱلْحَمْدُ لِلَّٰهِ', target: 33 },
  { name: 'AllahuAkbar', arabic: 'ٱللَّٰهُ أَكْبَرُ', target: 34 },
]

const currentPhaseIndex = ref(0)
const currentCount = ref(0)
const isComplete = ref(false)

const currentPhase = computed(() => dhikrPhases[currentPhaseIndex.value] ?? { name: 'SubhanAllah', arabic: 'سُبْحَانَ ٱللَّٰهِ', target: 33 })
const progressPercent = computed(() => (currentCount.value / currentPhase.value.target) * 100)

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern) } catch { /* ignore */ }
}

function handleTap() {
  if (isComplete.value) return

  currentCount.value++
  vibrate(30)

  if (currentCount.value >= currentPhase.value.target) {
    // Phase complete
    vibrate([50, 50, 50])

    if (currentPhaseIndex.value < dhikrPhases.length - 1) {
      // Move to next phase
      setTimeout(() => {
        currentPhaseIndex.value++
        currentCount.value = 0
      }, 300)
    } else {
      // All dhikr complete
      isComplete.value = true
      vibrate([100, 100, 100, 100, 200])
    }
  }
}

function handleSkip() {
  emit('close')
}

function handleFinish() {
  emit('close')
}

const phaseColor = computed(() => {
  const colors = ['text-sky-400', 'text-emerald-400', 'text-violet-400']
  return colors[currentPhaseIndex.value]
})

const phaseGlow = computed(() => {
  const colors = ['shadow-sky-500/30', 'shadow-emerald-500/30', 'shadow-violet-500/30']
  return colors[currentPhaseIndex.value]
})
</script>

<template>
  <div
    id="dhikr-counter"
    class="h-full w-full flex flex-col items-center justify-center bg-[#080c14] select-none"
    @click="handleTap"
    @touchstart.prevent="handleTap"
  >
    <!-- Header -->
    <div class="absolute top-0 left-0 right-0 pt-14 pb-4 text-center">
      <p class="text-white/40 text-xs uppercase tracking-[0.3em] mb-1">Dhikr After Prayer</p>
      <p class="text-white/60 text-sm">{{ store.activePrayer?.name }}</p>
    </div>

    <!-- Main counter -->
    <div class="flex flex-col items-center gap-6">
      <!-- Phase indicator -->
      <div class="flex gap-2 mb-2">
        <div
          v-for="(phase, i) in dhikrPhases"
          :key="i"
          class="h-1 rounded-full transition-all duration-300"
          :class="i === currentPhaseIndex ? 'w-8 bg-white' : i < currentPhaseIndex ? 'w-4 bg-white/60' : 'w-4 bg-white/20'"
        />
      </div>

      <!-- Phase name -->
      <Transition name="fade" mode="out-in">
        <div :key="currentPhaseIndex" class="text-center">
          <p class="text-2xl font-bold mb-1" :class="phaseColor">{{ currentPhase.arabic }}</p>
          <p class="text-white/50 text-sm">{{ currentPhase.name }}</p>
        </div>
      </Transition>

      <!-- Counter circle -->
      <div class="relative">
        <svg class="absolute inset-0 w-56 h-56 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="white" stroke-opacity="0.06" stroke-width="3" />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            :stroke-dasharray="276.46"
            :stroke-dashoffset="276.46 - (progressPercent / 100) * 276.46"
            class="transition-all duration-300"
            :class="phaseColor"
          />
        </svg>

        <div
          class="w-56 h-56 rounded-full flex flex-col items-center justify-center shadow-2xl bg-white/[0.04]"
          :class="phaseGlow"
        >
          <Transition name="pop" mode="out-in">
            <span
              :key="currentCount"
              class="text-7xl font-black text-white tabular-nums leading-none"
            >
              {{ currentCount }}
            </span>
          </Transition>
          <span class="text-white/30 text-sm mt-2">/ {{ currentPhase.target }}</span>
        </div>
      </div>
    </div>

    <!-- Completion overlay -->
    <Transition name="fade">
      <div
        v-if="isComplete"
        class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#080c14]/95 backdrop-blur-sm"
      >
        <div class="flex flex-col items-center gap-6 px-8">
          <div class="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center">
            <span class="text-4xl">🤲</span>
          </div>
          <div class="text-center">
            <p class="text-emerald-400 text-sm uppercase tracking-widest mb-2">Dhikr Complete</p>
            <p class="text-white text-xl font-bold">99 Tasbih Done</p>
          </div>
          <button
            class="bg-white text-[#080c14] px-8 py-3 rounded-full font-bold transition-transform active:scale-95 hover:bg-white/90 z-30 relative"
            @click.stop="handleFinish"
            @touchend.prevent.stop="handleFinish"
          >
            Finish →
          </button>
        </div>
      </div>
    </Transition>

    <!-- Bottom actions -->
    <div class="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-4">
      <p v-if="!isComplete" class="text-white/20 text-sm animate-pulse">Tap to count</p>
      <button
        v-if="!isComplete"
        class="text-white/30 text-sm hover:text-white/60 transition-colors z-30 relative px-4 py-2"
        @click.stop="handleSkip"
        @touchend.prevent.stop="handleSkip"
      >
        Skip Dhikr →
      </button>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.pop-enter-active {
  transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pop-leave-active {
  transition: all 0.1s ease-in;
}
.pop-enter-from {
  opacity: 0;
  transform: scale(0.6);
}
.pop-leave-to {
  opacity: 0;
  transform: scale(1.3);
}
</style>
