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

export interface PrayerDef {
  id: string
  name: string
  arabicName: string
  icon: string
  phases: Phase[]
}

export interface Prayer extends PrayerDef {
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

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_PRAYER_DEFS: PrayerDef[] = [
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
  return new Date().toISOString().slice(0, 10)
}

function cloneDefs(defs: PrayerDef[]): PrayerDef[] {
  return defs.map(d => ({ ...d, phases: d.phases.map(ph => ({ ...ph })) }))
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePrayerStore = defineStore('prayer', () => {
  // ── Persisted: editable plan definitions ────────────────────────────────────
  const customPrayerDefs = useLocalStorage<PrayerDef[]>(
    'vitality-prayer-defs',
    cloneDefs(DEFAULT_PRAYER_DEFS),
  )

  // ── Persisted: daily completion statuses ────────────────────────────────────
  const dailyStatus = useLocalStorage<{
    date: string
    statuses: Record<string, { state: PrayerState; completedAt?: string }>
  }>('vitality-prayer-daily', { date: getTodayKey(), statuses: {} })

  function ensureTodayData() {
    if (dailyStatus.value.date !== getTodayKey()) {
      dailyStatus.value = { date: getTodayKey(), statuses: {} }
    }
  }
  ensureTodayData()

  // ── Computed: merged prayer list ─────────────────────────────────────────────
  const prayers = computed<Prayer[]>(() => {
    ensureTodayData()
    return customPrayerDefs.value.map(def => ({
      ...def,
      phases: def.phases.map(ph => ({ ...ph })),
      state: dailyStatus.value.statuses[def.id]?.state ?? 'idle',
      completedAt: dailyStatus.value.statuses[def.id]?.completedAt,
    }))
  })

  // ── Session state (not persisted) ───────────────────────────────────────────
  const session = ref<SessionState>({
    activePrayerId: null,
    currentPhaseIndex: 0,
    currentRakatCount: 0,
    sessionStartTime: null,
    sessionCompleted: false,
    totalRakatsPrayed: 0,
  })

  // ── Derived ─────────────────────────────────────────────────────────────────

  const activePrayer = computed<Prayer | null>(
    () => prayers.value.find(p => p.id === session.value.activePrayerId) ?? null,
  )

  const currentPhase = computed<Phase | null>(() => {
    if (!activePrayer.value) return null
    return activePrayer.value.phases[session.value.currentPhaseIndex] ?? null
  })

  const progressPercent = computed<number>(() => {
    if (!currentPhase.value) return 0
    return (session.value.currentRakatCount / currentPhase.value.total) * 100
  })

  const completedPrayersCount = computed(
    () => prayers.value.filter(p => p.state === 'completed').length,
  )

  // ── Session actions ──────────────────────────────────────────────────────────

  function selectPrayer(prayerId: string) {
    ensureTodayData()
    session.value = {
      activePrayerId: prayerId,
      currentPhaseIndex: 0,
      currentRakatCount: 0,
      sessionStartTime: Date.now(),
      sessionCompleted: false,
      totalRakatsPrayed: 0,
    }
    if (!dailyStatus.value.statuses[prayerId]) {
      dailyStatus.value.statuses[prayerId] = { state: 'in-progress' }
    } else if (dailyStatus.value.statuses[prayerId].state === 'idle') {
      dailyStatus.value.statuses[prayerId].state = 'in-progress'
    }
  }

  function incrementRakat(): 'rakat' | 'phase-complete' | 'prayer-complete' {
    if (!activePrayer.value || !currentPhase.value) return 'rakat'

    session.value.currentRakatCount++
    session.value.totalRakatsPrayed++

    if (session.value.currentRakatCount >= currentPhase.value.total) {
      const nextIndex = session.value.currentPhaseIndex + 1

      if (nextIndex >= activePrayer.value.phases.length) {
        const id = session.value.activePrayerId!
        ensureTodayData()
        dailyStatus.value.statuses[id] = {
          state: 'completed',
          completedAt: new Date().toISOString(),
        }
        session.value.sessionCompleted = true
        return 'prayer-complete'
      }

      session.value.currentPhaseIndex = nextIndex
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
    ensureTodayData()
    dailyStatus.value = { date: getTodayKey(), statuses: {} }
    dismissSession()
  }

  // ── Plan editing actions ─────────────────────────────────────────────────────

  function updatePrayerPhases(prayerId: string, phases: Phase[]) {
    const idx = customPrayerDefs.value.findIndex(p => p.id === prayerId)
    if (idx === -1) return
    customPrayerDefs.value = customPrayerDefs.value.map((def, i) =>
      i === idx ? { ...def, phases: phases.map(ph => ({ ...ph })) } : def,
    )
  }

  function resetPrayerToDefault(prayerId: string) {
    const def = DEFAULT_PRAYER_DEFS.find(p => p.id === prayerId)
    if (!def) return
    const idx = customPrayerDefs.value.findIndex(p => p.id === prayerId)
    if (idx === -1) return
    customPrayerDefs.value = customPrayerDefs.value.map((d, i) =>
      i === idx ? cloneDefs([def])[0] : d,
    )
  }

  function resetAllPlansToDefault() {
    customPrayerDefs.value = cloneDefs(DEFAULT_PRAYER_DEFS)
  }

  return {
    prayers,
    customPrayerDefs,
    session,
    activePrayer,
    currentPhase,
    progressPercent,
    completedPrayersCount,
    selectPrayer,
    incrementRakat,
    dismissSession,
    resetAllPrayers,
    updatePrayerPhases,
    resetPrayerToDefault,
    resetAllPlansToDefault,
  }
})
