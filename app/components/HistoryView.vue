<script setup lang="ts">
import { usePrayerStore } from '~/stores/prayerStore'

const store = usePrayerStore()
const emit = defineEmits<{ close: [] }>()

// Get last 7 days for weekly view
const last7Days = computed(() => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
})

const streak = computed(() => store.getStreak())

const totalRakatsAllTime = computed(() => {
  return store.history.reduce((sum, day) => sum + day.totalRakats, 0)
})

const totalPrayersAllTime = computed(() => {
  return store.history.reduce((sum, day) => sum + day.completedPrayers.length, 0)
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getDayData(date: string) {
  return store.getHistoryForDate(date)
}

function deleteEntry(date: string) {
  if (confirm('Delete this session from history?')) {
    store.deleteHistoryEntry(date)
  }
}
</script>

<template>
  <div
    class="h-full w-full flex flex-col"
    style="background: #080c14;"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-5 pt-14 pb-5 border-b border-white/10">
      <div>
        <p class="text-white/40 text-xs uppercase tracking-[0.25em] mb-0.5">Statistics</p>
        <h2 class="text-white text-xl font-black">Prayer History</h2>
      </div>
      <button
        class="w-10 h-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-95"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-4 py-4 pb-20 custom-scrollbar">
      <!-- Stats overview -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
          <p class="text-2xl font-black text-emerald-400">{{ streak }}</p>
          <p class="text-white/40 text-xs">Day Streak</p>
        </div>
        <div class="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
          <p class="text-2xl font-black text-sky-400">{{ totalPrayersAllTime }}</p>
          <p class="text-white/40 text-xs">Total Prayers</p>
        </div>
        <div class="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
          <p class="text-2xl font-black text-violet-400">{{ totalRakatsAllTime }}</p>
          <p class="text-white/40 text-xs">Total Rakats</p>
        </div>
      </div>

      <!-- Weekly view -->
      <div class="mb-6">
        <p class="text-white/60 text-sm font-medium mb-3">Last 7 Days</p>
        <div class="flex gap-2">
          <div
            v-for="date in last7Days"
            :key="date"
            class="flex-1 flex flex-col items-center gap-2"
          >
            <div
              class="w-full aspect-square rounded-2xl flex items-center justify-center"
              :class="getDayData(date) ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/5 border border-white/10'"
            >
              <span
                v-if="getDayData(date)"
                class="text-emerald-400 font-bold"
              >{{ getDayData(date)?.completedPrayers.length }}</span>
              <span v-else class="text-white/20 text-xs">—</span>
            </div>
            <p class="text-white/40 text-[10px]">{{ new Date(date).toLocaleDateString('en-US', { weekday: 'narrow' }) }}</p>
          </div>
        </div>
      </div>

      <!-- Recent history -->
      <div>
        <p class="text-white/60 text-sm font-medium mb-3">Recent Sessions</p>
        <div class="flex flex-col gap-2">
          <div
            v-for="entry in store.history.slice(0, 14)"
            :key="entry.date"
            class="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 relative group"
          >
            <div class="flex items-center justify-between">
              <p class="text-white font-medium">{{ formatDate(entry.date) }}</p>
              <div class="flex items-center gap-2">
                <p class="text-emerald-400 text-sm">{{ entry.completedPrayers.length }} prayers</p>
                <button
                  class="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400/70 hover:text-red-400 hover:bg-red-500/20 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                  @click="deleteEntry(entry.date)"
                  title="Delete session"
                >
                  <span class="text-xs">🗑️</span>
                </button>
              </div>
            </div>
            <p class="text-white/40 text-xs mt-1">{{ entry.totalRakats }} rakats total</p>
            <div class="flex gap-1.5 mt-2 flex-wrap">
              <span
                v-for="(prayer, id) in entry.prayers"
                :key="id"
                class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60"
              >
                {{ prayer.name }}
              </span>
            </div>
          </div>

          <div v-if="store.history.length === 0" class="text-center py-8">
            <p class="text-white/30 text-sm">No prayer history yet.</p>
            <p class="text-white/20 text-xs mt-1">Complete your first prayer to start tracking!</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
