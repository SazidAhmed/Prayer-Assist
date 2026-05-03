import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhaseType = 'sunnah' | 'fardh' | 'witr' | 'nafl'
export type PrayerState = 'idle' | 'in-progress' | 'completed'

export interface Settings {
  travelerMode: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
}

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
  phaseCompleted: boolean
  totalRakatsPrayed: number
}

export interface DailyHistory {
  date: string
  completedPrayers: string[]
  totalRakats: number
  prayers: Record<string, { name: string; completedAt: string; rakats: number }>
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

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePrayerStore = defineStore('prayer', () => {
  // ── Persisted: editable plan definitions ────────────────────────────────────
  const customPrayerDefs = useLocalStorage<PrayerDef[]>(
    'vitality-prayer-defs',
    DEFAULT_PRAYER_DEFS,
  )

  // ── Persisted: daily completion statuses ────────────────────────────────────
  const dailyStatus = useLocalStorage<{
    date: string
    statuses: Record<string, { state: PrayerState; completedAt?: string }>
  }>('vitality-prayer-daily', { date: getTodayKey(), statuses: {} })

  // ── Persisted: settings ────────────────────────────────────────────────────
  const settings = useLocalStorage<Settings>('vitality-settings', {
    travelerMode: false,
    soundEnabled: false,
    vibrationEnabled: true,
  })

  // ── Persisted: history ─────────────────────────────────────────────────────
  const history = useLocalStorage<DailyHistory[]>('vitality-history', [])

  // ── Persisted: active session (for resume) ─────────────────────────────────
  const savedSession = useLocalStorage<SessionState | null>('vitality-session', null)

  function ensureTodayData() {
    if (dailyStatus.value.date !== getTodayKey()) {
      dailyStatus.value = { date: getTodayKey(), statuses: {} }
      // Clear any stale session when day changes
      if (session.value.activePrayerId && !session.value.sessionCompleted) {
        const prayerId = session.value.activePrayerId
        const status = dailyStatus.value.statuses[prayerId]
        if (status?.state === 'completed') {
          dismissSession()
        }
      }
    }
  }
  ensureTodayData()

  // ── Periodic date check (for midnight boundary) ────────────────────────────
  let dateCheckInterval: ReturnType<typeof setInterval> | null = null

  if (import.meta.client) {
    dateCheckInterval = setInterval(() => {
      ensureTodayData()
    }, 60000) // Check every minute
  }

  // Cleanup on scope dispose
  onScopeDispose(() => {
    if (dateCheckInterval) {
      clearInterval(dateCheckInterval)
    }
  })

  // ── History helpers ──────────────────────────────────────────────────────────
  function recordPrayerCompletion(prayer: Prayer, rakats: number) {
    const today = getTodayKey()
    let dayEntry = history.value.find(h => h.date === today)
    if (!dayEntry) {
      dayEntry = {
        date: today,
        completedPrayers: [],
        totalRakats: 0,
        prayers: {},
      }
      history.value = [dayEntry, ...history.value].slice(0, 90) // Keep 90 days
    }
    if (!dayEntry.completedPrayers.includes(prayer.id)) {
      dayEntry.completedPrayers.push(prayer.id)
      dayEntry.totalRakats += rakats
      dayEntry.prayers[prayer.id] = {
        name: prayer.name,
        completedAt: new Date().toISOString(),
        rakats,
      }
    }
  }

  function getHistoryForDate(date: string): DailyHistory | undefined {
    return history.value.find(h => h.date === date)
  }

  function deleteHistoryEntry(date: string) {
    history.value = history.value.filter(h => h.date !== date)
  }

  function getStreak(): number {
    let streak = 0
    const sorted = [...history.value].sort((a, b) => b.date.localeCompare(a.date))
    const today = getTodayKey()
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    // Check if today has any completed prayers
    const todayEntry = sorted.find(h => h.date === today)
    const hasToday = todayEntry && todayEntry.completedPrayers.length > 0

    // Check yesterday
    const hasYesterday = sorted.some(h => h.date === yesterday && h.completedPrayers.length > 0)

    if (!hasToday && !hasYesterday) return 0

    // Count consecutive days
    let checkDate = hasToday ? today : yesterday
    for (const entry of sorted) {
      if (entry.date === checkDate && entry.completedPrayers.length > 0) {
        streak++
        // Move to previous day
        const d = new Date(checkDate)
        d.setDate(d.getDate() - 1)
        checkDate = d.toISOString().slice(0, 10)
      } else if (entry.date < checkDate) {
        break
      }
    }
    return streak
  }

  // ── Helper: apply traveler mode to phases ──────────────────────────────────
  function applyTravelerMode(phases: Phase[]): Phase[] {
    if (!settings.value.travelerMode) return phases
    return phases.map(ph => {
      if (ph.type === 'fardh') {
        // Halve fardh counts, minimum 2, except Maghrib stays 3
        const newTotal = Math.max(2, Math.floor(ph.total / 2))
        return { ...ph, total: newTotal }
      }
      return ph
    })
  }

  // ── Computed: merged prayer list ─────────────────────────────────────────────
  const prayers = computed<Prayer[]>(() => {
    ensureTodayData()
    // Use defaults if user has no custom prayers
    const defs = customPrayerDefs.value.length > 0 ? customPrayerDefs.value : DEFAULT_PRAYER_DEFS
    return defs.map(def => ({
      ...def,
      phases: applyTravelerMode(def.phases.map(ph => ({ ...ph }))),
      state: dailyStatus.value.statuses[def.id]?.state ?? 'idle',
      completedAt: dailyStatus.value.statuses[def.id]?.completedAt,
    }))
  })

  // ── Session state ─────────────────────────────────────────────────────────
  // Restore from saved session if exists and not completed
  const session = ref<SessionState>(savedSession.value && !savedSession.value.sessionCompleted
    ? savedSession.value
    : {
        activePrayerId: null,
        currentPhaseIndex: 0,
        currentRakatCount: 0,
        sessionStartTime: null,
        sessionCompleted: false,
        phaseCompleted: false,
        totalRakatsPrayed: 0,
      })

  // Watch and save session changes
  watch(session, (val) => {
    if (val.activePrayerId && !val.sessionCompleted) {
      savedSession.value = val
    } else {
      savedSession.value = null
    }
  }, { deep: true })

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
      phaseCompleted: false,
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
        const prayer = activePrayer.value
        ensureTodayData()
        dailyStatus.value.statuses[id] = {
          state: 'completed',
          completedAt: new Date().toISOString(),
        }
        // Add to history
        recordPrayerCompletion(prayer, session.value.totalRakatsPrayed)
        session.value.sessionCompleted = true
        return 'prayer-complete'
      }

      session.value.phaseCompleted = true
      return 'phase-complete'
    }

    return 'rakat'
  }

  function startNextPhase(): boolean {
    if (!session.value.phaseCompleted) return false
    if (!activePrayer.value) return false

    const nextIndex = session.value.currentPhaseIndex + 1

    if (nextIndex >= activePrayer.value.phases.length) {
      return false
    }

    session.value.currentPhaseIndex = nextIndex
    session.value.currentRakatCount = 0
    session.value.phaseCompleted = false
    return true
  }

  function dismissSession() {
    session.value = {
      activePrayerId: null,
      currentPhaseIndex: 0,
      currentRakatCount: 0,
      sessionStartTime: null,
      sessionCompleted: false,
      phaseCompleted: false,
      totalRakatsPrayed: 0,
    }
    savedSession.value = null
  }

  function hasActiveSession(): boolean {
    return !!session.value.activePrayerId && !session.value.sessionCompleted
  }

  // ── Export/Import ───────────────────────────────────────────────────────────
  function exportData(): string {
    const data = {
      prayers: customPrayerDefs.value,
      settings: settings.value,
      exportedAt: new Date().toISOString(),
    }
    return JSON.stringify(data, null, 2)
  }

  function importData(json: string): boolean {
    try {
      const data = JSON.parse(json)
      if (data.prayers && Array.isArray(data.prayers)) {
        customPrayerDefs.value = data.prayers
        if (data.settings) {
          settings.value = { ...settings.value, ...data.settings }
        }
        return true
      }
      return false
    } catch {
      return false
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

  function addPrayer(name: string, arabicName: string, icon: string) {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const newPrayer: PrayerDef = {
      id,
      name,
      arabicName,
      icon,
      phases: [{ label: 'Sunnah', total: 2, type: 'sunnah' }],
    }
    customPrayerDefs.value = [...customPrayerDefs.value, newPrayer]
    return id
  }

  function deletePrayer(prayerId: string) {
    customPrayerDefs.value = customPrayerDefs.value.filter(p => p.id !== prayerId)
  }

  function resetPrayerToDefault(prayerId: string) {
    const defaultDef = DEFAULT_PRAYER_DEFS.find(p => p.id === prayerId)
    if (!defaultDef) return
    const idx = customPrayerDefs.value.findIndex(p => p.id === prayerId)
    if (idx === -1) {
      // Add it if missing
      customPrayerDefs.value = [...customPrayerDefs.value, JSON.parse(JSON.stringify(defaultDef))]
    } else {
      // Replace with default
      customPrayerDefs.value = customPrayerDefs.value.map((def, i) =>
        i === idx ? JSON.parse(JSON.stringify(defaultDef)) : def,
      )
    }
  }

  function resetAllPlansToDefault() {
    customPrayerDefs.value = JSON.parse(JSON.stringify(DEFAULT_PRAYER_DEFS))
  }

  // ── Settings actions ─────────────────────────────────────────────────────────
  function toggleTravelerMode() {
    settings.value.travelerMode = !settings.value.travelerMode
  }

  function toggleSound() {
    settings.value.soundEnabled = !settings.value.soundEnabled
  }

  function toggleVibration() {
    settings.value.vibrationEnabled = !settings.value.vibrationEnabled
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
    startNextPhase,
    dismissSession,
    resetAllPrayers,
    updatePrayerPhases,
    resetPrayerToDefault,
    resetAllPlansToDefault,
    addPrayer,
    deletePrayer,
    settings,
    toggleTravelerMode,
    toggleSound,
    toggleVibration,
    history,
    getHistoryForDate,
    getStreak,
    hasActiveSession,
    savedSession,
    exportData,
    importData,
    deleteHistoryEntry,
  }
})
