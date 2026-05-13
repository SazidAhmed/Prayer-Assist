<script setup lang="ts">
import { usePrayerStore } from '~/stores/prayerStore'

const store = usePrayerStore()
const emit = defineEmits<{ close: [] }>()

const importStatus = ref<{ success: boolean; message: string } | null>(null)

function handleExport() {
  const data = store.exportData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vitality-prayer-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const success = store.importData(content)
      importStatus.value = {
        success,
        message: success ? 'Prayer plans imported successfully!' : 'Invalid backup file'
      }
      if (success) {
        setTimeout(() => emit('close'), 1000)
      }
    } catch {
      importStatus.value = { success: false, message: 'Failed to read file' }
    }
  }
  reader.readAsText(file)
  input.value = ''
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
        <p class="text-white/40 text-xs uppercase tracking-[0.25em] mb-0.5">Preferences</p>
        <h2 class="text-white text-xl font-black">Settings</h2>
      </div>
      <button
        class="w-10 h-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-95"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- Settings list -->
    <div class="flex-1 overflow-y-auto px-4 py-4 pb-20 flex flex-col gap-3 custom-scrollbar">
      <!-- Traveler Mode -->
      <div class="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden flex-shrink-0">
        <div class="px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-xl">
                ✈️
              </div>
              <div>
                <p class="text-white font-semibold">Traveler Mode (Qasr)</p>
                <p class="text-white/40 text-xs">Halves Fardh rakats (2 instead of 4)</p>
              </div>
            </div>
            <button
              class="w-12 h-7 rounded-full transition-colors relative"
              :class="store.settings.travelerMode ? 'bg-emerald-500' : 'bg-white/20'"
              @click="store.toggleTravelerMode()"
            >
              <span
                class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                :class="store.settings.travelerMode ? 'left-6' : 'left-1'"
              />
            </button>
          </div>
        </div>
        <div
          v-if="store.settings.travelerMode"
          class="px-4 py-3 bg-amber-500/10 border-t border-amber-500/20"
        >
          <p class="text-amber-400/80 text-xs">
            Active: Fardh prayers will use shortened rakat counts for travelers.
          </p>
        </div>
      </div>

      <!-- Sound -->
      <div class="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden flex-shrink-0">
        <div class="px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center text-xl">
              🔊
            </div>
            <div>
              <p class="text-white font-semibold">Sound Feedback</p>
              <p class="text-white/40 text-xs">Audio cues on count</p>
            </div>
          </div>
          <button
            class="w-12 h-7 rounded-full transition-colors relative"
            :class="store.settings.soundEnabled ? 'bg-emerald-500' : 'bg-white/20'"
            @click="store.toggleSound()"
          >
            <span
              class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
              :class="store.settings.soundEnabled ? 'left-6' : 'left-1'"
            />
          </button>
        </div>
      </div>

      <!-- Vibration -->
      <div class="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden flex-shrink-0">
        <div class="px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-xl">
              📳
            </div>
            <div>
              <p class="text-white font-semibold">Haptic Feedback</p>
              <p class="text-white/40 text-xs">Vibration on count</p>
            </div>
          </div>
          <button
            class="w-12 h-7 rounded-full transition-colors relative"
            :class="store.settings.vibrationEnabled ? 'bg-emerald-500' : 'bg-white/20'"
            @click="store.toggleVibration()"
          >
            <span
              class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
              :class="store.settings.vibrationEnabled ? 'left-6' : 'left-1'"
            />
          </button>
        </div>
      </div>

      <!-- Export/Import -->
      <div class="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden flex-shrink-0">
        <div class="px-4 py-3 border-b border-white/10">
          <p class="text-white/60 text-sm font-medium">Backup & Restore</p>
        </div>
        <div class="px-4 py-4 flex flex-col gap-3">
          <button
            class="h-10 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all text-sm"
            @click="handleExport"
          >
            📥 Export Prayer Plans
          </button>
          <div class="relative">
            <input
              type="file"
              accept=".json"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              @change="handleImport"
            />
            <button
              class="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all text-sm"
            >
              📤 Import Prayer Plans
            </button>
          </div>
          <p v-if="importStatus" class="text-center text-xs" :class="importStatus.success ? 'text-emerald-400' : 'text-red-400'">
            {{ importStatus.message }}
          </p>
        </div>
      </div>

      <!-- Info -->
      <div class="mt-6 px-4">
        <p class="text-white/30 text-xs text-center">
          Settings are saved automatically
        </p>
      </div>
    </div>
  </div>
</template>
