<script setup lang="ts">
import { usePrayerStore } from '~/stores/prayerStore'

const store = usePrayerStore()
const emit = defineEmits<{ complete: []; openPlans: []; openSettings: [] }>()

// ─── Wake Lock ───────────────────────────────────────────────────────────────
let wakeLock: WakeLockSentinel | null = null

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await (navigator as any).wakeLock.request('screen')
    }
  } catch { /* silently ignore */ }
}

async function releaseWakeLock() {
  try { await wakeLock?.release() } catch { /* ignore */ }
  wakeLock = null
}

// ─── Visibility handling for wake lock ───────────────────────────────────────
function handleVisibilityChange() {
  if (document.hidden) {
    // Page is hidden - wake lock will be released by browser
    console.log('Page hidden - wake lock may be released')
  } else {
    // Page is visible again - re-acquire wake lock
    requestWakeLock()
  }
}

onMounted(() => {
  requestWakeLock()
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  releaseWakeLock()
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// ─── Haptic feedback ─────────────────────────────────────────────────────────
function vibrate(pattern: number | number[]) {
  if (!store.settings.vibrationEnabled) return
  try { navigator.vibrate?.(pattern) } catch { /* ignore */ }
}

// ─── Sound feedback ──────────────────────────────────────────────────────────
const audioCtx = ref<AudioContext | null>(null)

function initAudio() {
  if (!audioCtx.value) {
    audioCtx.value = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine') {
  if (!store.settings.soundEnabled || !audioCtx.value) return
  try {
    const osc = audioCtx.value.createOscillator()
    const gain = audioCtx.value.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.value.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, audioCtx.value.currentTime)
    gain.gain.setValueAtTime(0.3, audioCtx.value.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.value.currentTime + duration)
    osc.start()
    osc.stop(audioCtx.value.currentTime + duration)
  } catch { /* ignore */ }
}

function playPhaseSound(phaseType: string) {
  switch (phaseType) {
    case 'fardh': playTone(440, 0.15, 'sine'); setTimeout(() => playTone(440, 0.15), 100); break
    case 'witr': playTone(523, 0.2, 'triangle'); break
    case 'nafl': playTone(330, 0.1, 'sine'); break
    case 'sunnah': playTone(392, 0.15, 'sine'); break
    default: playTone(392, 0.15)
  }
}

function playCompleteSound() {
  playTone(523, 0.1)
  setTimeout(() => playTone(659, 0.1), 100)
  setTimeout(() => playTone(784, 0.2), 200)
}

// Different vibration patterns per phase type
function getPhaseVibration(phaseType: string): number[] {
  switch (phaseType) {
    case 'fardh': return [40, 30, 40] // Double pulse for Fardh
    case 'witr': return [50, 50, 50] // Triple for Witr
    case 'nafl': return [35] // Short for Nafl
    case 'sunnah': return [40] // Standard for Sunnah
    default: return [40]
  }
}

// ─── Animation state ─────────────────────────────────────────────────────────
const isFlashing = ref(false)
const isPhaseFlashing = ref(false)
const tapScale = ref(false)

function handleContinue() {
  store.startNextPhase()
}

async function handleTap() {
  if (store.session.sessionCompleted) return
  if (store.session.phaseCompleted) {
    handleContinue()
    return
  }

  // Init audio on first interaction
  initAudio()

  // Tap animation
  tapScale.value = true
  setTimeout(() => { tapScale.value = false }, 150)

  const result = store.incrementRakat()

  if (result === 'rakat') {
    const phaseType = store.currentPhase?.type ?? 'sunnah'
    vibrate(getPhaseVibration(phaseType))
    playPhaseSound(phaseType)
    isFlashing.value = true
    setTimeout(() => { isFlashing.value = false }, 200)
  } else if (result === 'phase-complete') {
    const nextType = nextPhase.value?.type ?? 'sunnah'
    // Stronger pulse for phase transition
    const transitionPattern: Record<string, number[]> = {
      'fardh': [80, 100, 80],
      'witr': [100, 100, 100],
      'nafl': [60, 60],
      'sunnah': [70, 70],
    }
    vibrate(transitionPattern[nextType] || [70, 70])
    playPhaseSound(nextType)
    isPhaseFlashing.value = true
    setTimeout(() => { isPhaseFlashing.value = false }, 400)
  } else if (result === 'prayer-complete') {
    vibrate([100, 100, 100, 100, 300])
    playCompleteSound()
    await releaseWakeLock()
    emit('complete')
  }
}

// ─── Keyboard accessibility ──────────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault()
    handleTap()
  }
}

// ─── Phase completion state ──────────────────────────────────────────────────
const isPhaseComplete = computed(() => store.session.phaseCompleted)

const nextPhase = computed(() => {
  if (!store.activePrayer) return null
  const nextIndex = store.session.currentPhaseIndex + 1
  return store.activePrayer.phases[nextIndex] ?? null
})

// ─── Phase label ─────────────────────────────────────────────────────────────
const phaseLabel = computed(() => {
  const phase = store.currentPhase
  if (!phase) return ''
  return `${phase.label} — ${store.session.currentRakatCount} of ${phase.total}`
})

const completedPhaseLabel = computed(() => {
  const phase = store.currentPhase
  if (!phase) return ''
  return `${phase.label} ${phase.total} of ${phase.total}`
})

const phaseTypeColor = computed(() => {
  const type = store.currentPhase?.type
  if (type === 'fardh') return 'text-emerald-400'
  if (type === 'witr') return 'text-violet-400'
  if (type === 'nafl') return 'text-sky-400'
  return 'text-amber-400' // sunnah
})

const phaseGlow = computed(() => {
  const type = store.currentPhase?.type
  if (type === 'fardh') return 'shadow-emerald-500/30'
  if (type === 'witr') return 'shadow-violet-500/30'
  if (type === 'nafl') return 'shadow-sky-500/30'
  return 'shadow-amber-500/30'
})
</script>

<template>
  <div
    id="prayer-canvas"
    class="relative h-full w-full flex flex-col items-center justify-center select-none overflow-hidden"
    :class="[
      'bg-[#080c14]',
      isFlashing ? 'bg-opacity-90' : '',
    ]"
    @click="handleTap"
    @touchstart.prevent="handleTap"
  >
    <!-- Background ambient glow -->
    <div
      class="pointer-events-none absolute inset-0 transition-opacity duration-300"
      :class="isPhaseFlashing ? 'opacity-100' : 'opacity-40'"
    >
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl bg-indigo-900/60" />
    </div>

    <!-- Prayer name top -->
    <div class="absolute top-0 left-0 right-0 flex flex-col items-center pt-14 pb-4 pointer-events-none">
      <p class="text-white/40 text-xs uppercase tracking-[0.3em] font-medium mb-1">
        {{ store.activePrayer?.arabicName }}
      </p>
      <h1 class="text-white text-2xl font-bold tracking-wide">
        {{ store.activePrayer?.name }}
      </h1>
    </div>

    <!-- Main counter -->
    <div
      class="flex flex-col items-center gap-6 pointer-events-none z-10"
      :style="{ transform: tapScale ? 'scale(0.94)' : 'scale(1)', transition: 'transform 0.12s ease' }"
    >
      <!-- Phase label -->
      <Transition name="slide-up" mode="out-in">
        <p
          :key="store.session.currentPhaseIndex"
          class="text-lg font-semibold tracking-widest uppercase"
          :class="phaseTypeColor"
        >
          {{ phaseLabel }}
        </p>
      </Transition>

      <!-- Giant rakat number -->
      <div class="relative">
        <!-- Outer ring -->
        <svg class="absolute inset-0 w-64 h-64 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="white" stroke-opacity="0.06" stroke-width="2" />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            :stroke-dasharray="276.46"
            :stroke-dashoffset="276.46 - (store.progressPercent / 100) * 276.46"
            class="transition-all duration-500"
            :class="phaseTypeColor"
          />
        </svg>

        <div
          class="w-64 h-64 rounded-full flex flex-col items-center justify-center"
          :class="[
            'shadow-2xl',
            phaseGlow,
            isFlashing ? 'bg-white/10' : 'bg-white/[0.04]',
            'transition-colors duration-150',
          ]"
        >
          <Transition name="pop" mode="out-in">
            <span
              :key="store.session.currentRakatCount"
              class="text-8xl font-black text-white tabular-nums leading-none"
            >
              {{ store.session.currentRakatCount }}
            </span>
          </Transition>
          <span class="text-white/30 text-sm mt-2 tracking-widest">RAKAT</span>
        </div>
      </div>

      <!-- Phase dots -->
      <div class="flex gap-3 mt-2">
        <template v-for="(phase, i) in store.activePrayer?.phases" :key="i">
          <div
            class="flex flex-col items-center gap-1"
          >
            <div
              class="h-1.5 w-8 rounded-full transition-all duration-500"
              :class="
                i < store.session.currentPhaseIndex
                  ? 'bg-white/70'
                  : i === store.session.currentPhaseIndex
                    ? 'bg-white scale-110'
                    : 'bg-white/20'
              "
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Bottom hint -->
    <!-- Phase completion overlay -->
    <Transition name="fade">
      <div
        v-if="isPhaseComplete"
        class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#080c14]/95 backdrop-blur-sm"
      >
        <div class="flex flex-col items-center gap-8 px-8">
          <!-- Completed checkmark -->
          <div
            class="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center"
          >
            <span class="text-5xl text-emerald-400">✓</span>
          </div>

          <!-- Completed text -->
          <div class="text-center">
            <p class="text-emerald-400 text-sm uppercase tracking-widest mb-2">Completed</p>
            <p class="text-white text-2xl font-bold">{{ completedPhaseLabel }}</p>
          </div>

          <!-- Next phase preview -->
          <div
            v-if="nextPhase"
            class="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center"
          >
            <p class="text-white/40 text-xs uppercase tracking-widest mb-1">Next</p>
            <p class="text-white font-semibold">{{ nextPhase.label }}</p>
            <p class="text-white/50 text-sm">{{ nextPhase.total }} rakat</p>
          </div>

          <!-- Continue button -->
          <button
            class="bg-white text-[#080c14] px-8 py-4 rounded-full font-bold text-lg transition-transform active:scale-95 hover:bg-white/90"
            @click.stop="handleContinue"
          >
            Start {{ nextPhase?.label || 'Next' }} →
          </button>
        </div>
      </div>
    </Transition>

    <div class="absolute bottom-10 left-0 right-0 flex flex-col items-center pointer-events-none">
      <p v-if="!isPhaseComplete" class="text-white/20 text-sm animate-pulse">Tap anywhere to count</p>
    </div>

    <!-- Bottom nav -->
    <nav class="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-2 z-30">
      <div class="bg-white/5 border border-white/10 rounded-3xl px-4 py-3 flex items-center justify-around backdrop-blur-sm">
        <button
          class="flex flex-col items-center gap-1 text-white transition-colors"
          @click.stop="emit('openPlans')"
          @touchend.prevent.stop="emit('openPlans')"
        >
          <span class="text-xl">✏️</span>
          <span class="text-[10px] font-medium">My Plan</span>
        </button>
        <button
          class="flex flex-col items-center gap-1 text-white/30 hover:text-white transition-colors"
          @click.stop="emit('openSettings')"
          @touchend.prevent.stop="emit('openSettings')"
        >
          <span class="text-xl">⚙️</span>
          <span class="text-[10px] font-medium">Settings</span>
        </button>
        <button
          class="flex flex-col items-center gap-1 text-white/30 hover:text-white transition-colors"
          @click.stop="store.dismissSession(); emit('complete')"
          @touchend.prevent.stop="store.dismissSession(); emit('complete')"
        >
          <span class="text-xl">✕</span>
          <span class="text-[10px] font-medium">End</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.25s ease;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
