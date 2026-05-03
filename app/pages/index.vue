<script setup lang="ts">
import { usePrayerStore } from '~/stores/prayerStore'

useSeoMeta({
  title: 'Vitality Prayer — Rakat Tracker',
  description: 'Track your daily prayers with precision. A phase-based Rakat counter for all 5 daily prayers.',
})

const store = usePrayerStore()

const showCanvas = ref(false)
const showComplete = ref(false)
const showPlans = ref(false)
const showDhikr = ref(false)
const showSettings = ref(false)
const showHistory = ref(false)

function startPrayer(prayerId: string) {
  store.selectPrayer(prayerId)
  showCanvas.value = true
  showComplete.value = false
  showDhikr.value = false
}

function onPrayerComplete() {
  showComplete.value = true
  showCanvas.value = false
}

function onSessionCompleteFinished() {
  showComplete.value = false
  showDhikr.value = true
}

function onDhikrFinished() {
  showDhikr.value = false
}

function onBackToDashboard() {
  showComplete.value = false
  showCanvas.value = false
}
</script>

<template>
  <main class="min-h-screen bg-[#080c14] flex justify-center">
    <div class="w-full max-w-md min-h-screen relative overflow-hidden">

      <!-- ── PRAYER CANVAS (immersive counter) ── -->
      <Transition name="slide-up">
        <PrayerCanvas
          v-if="showCanvas"
          class="fixed inset-0 z-40"
          @complete="onPrayerComplete"
          @open-plans="showCanvas = false; showPlans = true"
          @open-settings="showCanvas = false; showSettings = true"
          @switch-prayer="() => {}"
        />
      </Transition>

      <!-- ── SESSION COMPLETE OVERLAY ── -->
      <SessionComplete
        v-if="showComplete"
        @back="onSessionCompleteFinished"
      />

      <!-- ── DHIKR COUNTER ── -->
      <Transition name="slide-up">
        <DhikrCounter
          v-if="showDhikr"
          @close="onDhikrFinished"
        />
      </Transition>

      <!-- ── PLAN EDITOR ── -->
      <Transition name="slide-up">
        <PlanEditor
          v-if="showPlans"
          @close="showPlans = false"
        />
      </Transition>

      <!-- ── SETTINGS PANEL ── -->
      <Transition name="slide-up">
        <SettingsPanel
          v-if="showSettings"
          @close="showSettings = false"
        />
      </Transition>

      <!-- ── HISTORY VIEW ── -->
      <Transition name="slide-up">
        <HistoryView
          v-if="showHistory"
          @close="showHistory = false"
        />
      </Transition>

      <!-- ── DASHBOARD ── -->
      <div class="flex flex-col min-h-screen">

        <!-- Resume session banner -->
        <Transition name="slide-down">
          <div
            v-if="store.hasActiveSession()"
            class="mx-4 mt-2 mb-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-3"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center animate-pulse">
                  <span class="text-amber-400 text-lg">▶</span>
                </div>
                <div>
                  <p class="text-white font-medium text-sm">Prayer in progress</p>
                  <p class="text-white/50 text-xs">{{ store.activePrayer?.name }} — {{ store.currentPhase?.label }}</p>
                </div>
              </div>
              <button
                class="bg-amber-500 hover:bg-amber-400 text-[#080c14] px-4 py-2 rounded-xl font-semibold text-sm active:scale-95 transition-all"
                @click="showCanvas = true"
              >
                Resume
              </button>
            </div>
          </div>
        </Transition>

        <!-- Header -->
        <header class="pt-14 pb-6 px-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <p class="text-white/40 text-xs uppercase tracking-[0.25em] mb-1">Bismillah</p>
              <h1 class="text-white text-2xl font-black">Vitality Prayer</h1>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                @click="showHistory = true"
              >
                <span class="text-lg">📊</span>
              </button>
            </div>
            <div class="flex flex-col items-end gap-1">
              <div class="flex gap-1.5">
                <div
                  v-for="prayer in store.prayers"
                  :key="prayer.id"
                  class="w-2 h-2 rounded-full transition-all duration-500"
                  :class="
                    prayer.state === 'completed'
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : prayer.state === 'in-progress'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-white/15'
                  "
                />
              </div>
              <p class="text-white/30 text-xs">{{ store.completedPrayersCount }}/{{ store.prayers.length }} today</p>
            </div>
          </div>

          <!-- Overall progress bar -->
          <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
              :style="{ width: `${store.prayers.length > 0 ? (store.completedPrayersCount / store.prayers.length) * 100 : 0}%` }"
            />
          </div>
        </header>

        <!-- Prayer cards -->
        <div class="flex-1 px-4 pb-4 flex flex-col gap-3">
          <button
            v-for="prayer in store.prayers"
            :id="`prayer-btn-${prayer.id}`"
            :key="prayer.id"
            class="relative w-full text-left rounded-3xl overflow-hidden transition-all duration-200 active:scale-[0.97]"
            :class="prayer.state === 'completed' ? 'opacity-70' : 'opacity-100'"
            @click="startPrayer(prayer.id)"
          >
            <div
              class="absolute inset-0 transition-all duration-300"
              :class="
                prayer.state === 'completed'
                  ? 'bg-emerald-950/60 border border-emerald-500/20'
                  : prayer.state === 'in-progress'
                    ? 'bg-amber-950/60 border border-amber-500/30'
                    : 'bg-white/[0.04] border border-white/10 hover:bg-white/[0.07]'
              "
            />

            <div class="relative flex items-center gap-4 px-5 py-4">
              <div
                class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                :class="
                  prayer.state === 'completed'
                    ? 'bg-emerald-500/15'
                    : prayer.state === 'in-progress'
                      ? 'bg-amber-500/15'
                      : 'bg-white/8'
                "
              >
                {{ prayer.icon }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="text-white font-bold text-lg">{{ prayer.name }}</span>
                  <span class="text-white/30 text-sm">{{ prayer.arabicName }}</span>
                </div>
                <div class="flex gap-1.5 flex-wrap">
                  <span
                    v-for="(phase, i) in prayer.phases"
                    :key="i"
                    class="text-xs px-2 py-0.5 rounded-full"
                    :class="
                      phase.type === 'fardh'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : phase.type === 'witr'
                          ? 'bg-violet-500/15 text-violet-400'
                          : phase.type === 'nafl'
                            ? 'bg-sky-500/15 text-sky-400'
                            : 'bg-amber-500/15 text-amber-400'
                    "
                  >
                    {{ phase.label }} ×{{ phase.total }}
                  </span>
                </div>
              </div>

              <div class="flex-shrink-0">
                <div
                  v-if="prayer.state === 'completed'"
                  class="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"
                >
                  <span class="text-emerald-400 text-lg">✓</span>
                </div>
                <div
                  v-else-if="prayer.state === 'in-progress'"
                  class="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse"
                >
                  <span class="text-amber-400 text-base">▶</span>
                </div>
                <div
                  v-else
                  class="w-9 h-9 rounded-full bg-white/5 border border-white/15 flex items-center justify-center"
                >
                  <span class="text-white/30 text-base">›</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <!-- Traveler mode indicator -->
        <div
          v-if="store.settings.travelerMode"
          class="px-4 pb-2"
        >
          <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
            <span class="text-amber-400 text-sm">✈️</span>
            <span class="text-amber-400/80 text-xs">Traveler Mode: Fardh prayers shortened</span>
          </div>
        </div>

        <!-- Bottom nav -->
        <nav class="px-4 pb-8 pt-2">
          <div class="bg-white/5 border border-white/10 rounded-3xl px-4 py-3 flex items-center justify-around backdrop-blur-sm">
            <button
              id="nav-home"
              class="flex flex-col items-center gap-1"
              :class="!showPlans ? 'text-white' : 'text-white/30'"
              @click="showPlans = false"
            >
              <span class="text-xl">🕌</span>
              <span class="text-[10px] font-medium">Prayers</span>
            </button>
            <button
              id="nav-plans"
              class="flex flex-col items-center gap-1 transition-colors"
              :class="showPlans ? 'text-white' : 'text-white/30 hover:text-white/60'"
              @click="showPlans = true"
            >
              <span class="text-xl">✏️</span>
              <span class="text-[10px] font-medium">My Plan</span>
            </button>
            <button
              id="nav-settings"
              class="flex flex-col items-center gap-1 text-white/30 hover:text-white/60 transition-colors"
              :class="showSettings ? 'text-white' : ''"
              @click="showSettings = true"
            >
              <span class="text-xl">⚙️</span>
              <span class="text-[10px] font-medium">Settings</span>
            </button>
            <button
              id="nav-reset"
              class="flex flex-col items-center gap-1 text-white/30 hover:text-white/60 transition-colors"
              @click="store.resetAllPrayers()"
            >
              <span class="text-xl">↺</span>
              <span class="text-[10px] font-medium">Reset</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  </main>
</template>

<style scoped>
.slide-up-enter-active {
  transition: transform 0.35s cubic-bezier(0.34, 1.1, 0.64, 1), opacity 0.3s ease;
}
.slide-up-leave-active {
  transition: transform 0.25s ease-in, opacity 0.2s ease;
}
.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.slide-down-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.1, 0.64, 1);
}
.slide-down-leave-active {
  transition: all 0.2s ease-in;
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
