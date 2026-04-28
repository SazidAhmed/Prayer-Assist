import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhaseType = 'sunnah' | 'fardh' | 'witr' | 'nafl'
export type PrayerState = 'idle' | 'in-progress' | 'completed'

export interface Phase {
  label: string
  total: number
  type: PhaseType
}

export interface Prayer {
  id: string
  name: string
  arabicName: string
  icon: string
  phases: Phase[]
  state: PrayerState
  completedAt?: string
}

export interface SessionState {
  activePrayerId: string | null
  currentPhaseIndex: number
  currentRakatCount: number
  sessionStartTime: number | null
  sessionCompleted: boolean
  totalRakatsPrayed: number
}

// ─── Prayer Definitions ───────────────────────────────────────────────────────

const DEFAULT_PRAYERS: Omit<Prayer, 'state' | 'completedAt'>[] = [
  {
    id: 'fajr',
    name: 'Fajr',
    arabicName: 'الفجر',
    icon: '🌅',
    phases: [
      { label: 'Sunnah', total: 2, type: 'sunnah' },
      { label: 'Fardh', total: 2, type: 'fardh' },
    ],
  },
  {
    id: 'dhuhr',
    name: 'Dhuhr',
    arabicName: 'الظهر',
    icon: '☀️',
    phases: [
      { label: 'Sunnah', total: 4, type: 'sunnah' },
      { label: 'Fardh', total: 4, type: 'fardh' },
      { label: 'Sunnah', total: 2, type: 'sunnah' },
      { label: 'Nafl', total: 2, type: 'nafl' },
    ],
  },
  {
    id: 'asr',
    name: 'Asr',
    arabicName: 'العصر',
    icon: '🌤️',
    phases: [
      { label: 'Sunnah', total: 4, type: 'sunnah' },
      { label: 'Fardh', total: 4, type: 'fardh' },
    ],
  },
  {
    id: 'maghrib',
    name: 'Maghrib',
    arabicName: 'المغرب',
    icon: '🌇',
    phases: [
      { label: 'Fardh', total: 3, type: 'fardh' },
      { label: 'Sunnah', total: 2, type: 'sunnah' },
      { label: 'Nafl', total: 2, type: 'nafl' },
    ],
  },
  {
    id: 'isha',
    name: 'Isha',
    arabicName: 'العشاء',
    icon: '🌙',
    phases: [
      { label: 'Sunnah', total: 4, type: 'sunnah' },
      { label: 'Fardh', total: 4, type: 'fardh' },
      { label: 'Sunnah', total: 2, type: 'sunnah' },
      { label: 'Witr', total: 3, type: 'witr' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

function buildFreshPrayers(): Prayer[] {
  return DEFAULT_PRAYERS.map(p => ({ ...p, state: 'idle' as PrayerState }))
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePrayerStore = defineStore('prayer', () => {
  // Persisted daily completion (reset each new day)
  const storedDaily = useLocalStorage<{ date: string; prayers: Prayer[] }>(
    'vitality-prayer-daily',
    { date: getTodayKey(), prayers: buildFreshPrayers() },
  )

  // Reset daily progress if it's a new day
  function ensureTodayData() {
    if (storedDaily.value.date !== getTodayKey()) {
      storedDaily.value = { date: getTodayKey(), prayers: buildFreshPrayers() }
    }
  }
  ensureTodayData()

  const prayers = computed(() => storedDaily.value.prayers)

  // Active session state (not persisted — resets on app restart)
  const session = ref<SessionState>({
    activePrayerId: null,
    currentPhaseIndex: 0,
    currentRakatCount: 0,
    sessionStartTime: null,
    sessionCompleted: false,
    totalRakatsPrayed: 0,
  })

  // ─── Derived ────────────────────────────────────────────────────────────────

  const activePrayer = computed<Prayer | null>(() =>
    prayers.value.find(p => p.id === session.value.activePrayerId) ?? null,
  )

  const currentPhase = computed<Phase | null>(() => {
    if (!activePrayer.value) return null
    return activePrayer.value.phases[session.value.currentPhaseIndex] ?? null
  })

  const progressPercent = computed<number>(() => {
    if (!currentPhase.value) return 0
    return (session.value.currentRakatCount / currentPhase.value.total) * 100
  })

  const overallProgressPercent = computed<number>(() => {
    if (!activePrayer.value) return 0
    const totalPhases = activePrayer.value.phases.length
    const phaseProgress = session.value.currentPhaseIndex / totalPhases
    const withinPhase = currentPhase.value
      ? session.value.currentRakatCount / currentPhase.value.total / totalPhases
      : 0
    return Math.min((phaseProgress + withinPhase) * 100, 100)
  })

  const completedPrayersCount = computed(() =>
    prayers.value.filter(p => p.state === 'completed').length,
  )

  // ─── Actions ─────────────────────────────────────────────────────────────────

  function selectPrayer(prayerId: string) {
    session.value = {
      activePrayerId: prayerId,
      currentPhaseIndex: 0,
      currentRakatCount: 0,
      sessionStartTime: Date.now(),
      sessionCompleted: false,
      totalRakatsPrayed: 0,
    }
    // Mark as in-progress
    const idx = storedDaily.value.prayers.findIndex(p => p.id === prayerId)
    if (idx !== -1 && storedDaily.value.prayers[idx].state === 'idle') {
      storedDaily.value.prayers[idx].state = 'in-progress'
    }
  }

  function incrementRakat(): 'rakat' | 'phase-complete' | 'prayer-complete' {
    if (!activePrayer.value || !currentPhase.value) return 'rakat'

    session.value.currentRakatCount++
    session.value.totalRakatsPrayed++

    // Check phase completion
    if (session.value.currentRakatCount >= currentPhase.value.total) {
      const nextPhaseIndex = session.value.currentPhaseIndex + 1

      if (nextPhaseIndex >= activePrayer.value.phases.length) {
        // Prayer complete!
        const idx = storedDaily.value.prayers.findIndex(
          p => p.id === session.value.activePrayerId,
        )
        if (idx !== -1) {
          storedDaily.value.prayers[idx].state = 'completed'
          storedDaily.value.prayers[idx].completedAt = new Date().toISOString()
        }
        session.value.sessionCompleted = true
        return 'prayer-complete'
      }

      // Move to next phase
      session.value.currentPhaseIndex = nextPhaseIndex
      session.value.currentRakatCount = 0
      return 'phase-complete'
    }

    return 'rakat'
  }

  function dismissSession() {
    session.value = {
      activePrayerId: null,
      currentPhaseIndex: 0,
      currentRakatCount: 0,
      sessionStartTime: null,
      sessionCompleted: false,
      totalRakatsPrayed: 0,
    }
  }

  function resetAllPrayers() {
    storedDaily.value = { date: getTodayKey(), prayers: buildFreshPrayers() }
    dismissSession()
  }

  return {
    prayers,
    session,
    activePrayer,
    currentPhase,
    progressPercent,
    overallProgressPercent,
    completedPrayersCount,
    selectPrayer,
    incrementRakat,
    dismissSession,
    resetAllPrayers,
  }
})
