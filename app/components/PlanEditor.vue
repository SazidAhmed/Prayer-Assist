<script setup lang="ts">
import { usePrayerStore, type Phase, type PhaseType, DEFAULT_PRAYER_DEFS } from '~/stores/prayerStore'

const store = usePrayerStore()
const emit = defineEmits<{ close: [] }>()

// ─── Phase meta ───────────────────────────────────────────────────────────────

const PHASE_CYCLE: PhaseType[] = ['sunnah', 'fardh', 'witr', 'nafl']

const PHASE_META: Record<PhaseType, { label: string; color: string; bg: string }> = {
  sunnah: { label: 'Sunnah', color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/30' },
  fardh:  { label: 'Fardh',  color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  witr:   { label: 'Witr',   color: 'text-violet-400',  bg: 'bg-violet-500/15 border-violet-500/30' },
  nafl:   { label: 'Nafl',   color: 'text-sky-400',     bg: 'bg-sky-500/15 border-sky-500/30' },
}

// ─── Expanded state ───────────────────────────────────────────────────────────

const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

// ─── Edit helpers ─────────────────────────────────────────────────────────────

function cycleType(prayerId: string, phaseIdx: number) {
  const def = store.customPrayerDefs.find(p => p.id === prayerId)
  if (!def) return
  const cur = def.phases[phaseIdx].type
  const next = PHASE_CYCLE[(PHASE_CYCLE.indexOf(cur) + 1) % PHASE_CYCLE.length]
  const updated = def.phases.map((ph, i) =>
    i === phaseIdx ? { ...ph, type: next, label: PHASE_META[next].label } : ph,
  )
  store.updatePrayerPhases(prayerId, updated)
}

function changeCount(prayerId: string, phaseIdx: number, delta: number) {
  const def = store.customPrayerDefs.find(p => p.id === prayerId)
  if (!def) return
  const updated = def.phases.map((ph, i) =>
    i === phaseIdx ? { ...ph, total: Math.min(12, Math.max(1, ph.total + delta)) } : ph,
  )
  store.updatePrayerPhases(prayerId, updated)
}

function deletePhase(prayerId: string, phaseIdx: number) {
  const def = store.customPrayerDefs.find(p => p.id === prayerId)
  if (!def || def.phases.length <= 1) return
  store.updatePrayerPhases(prayerId, def.phases.filter((_, i) => i !== phaseIdx))
}

function addPhase(prayerId: string) {
  const def = store.customPrayerDefs.find(p => p.id === prayerId)
  if (!def) return
  const newPhase: Phase = { label: 'Sunnah', total: 2, type: 'sunnah' }
  store.updatePrayerPhases(prayerId, [...def.phases, newPhase])
}

// ─── Total rakats helper ──────────────────────────────────────────────────────

function totalRakats(prayerId: string) {
  const def = store.customPrayerDefs.find(p => p.id === prayerId)
  return def?.phases.reduce((s, p) => s + p.total, 0) ?? 0
}

// ─── Reset confirm ────────────────────────────────────────────────────────────

const confirmResetAll = ref(false)

function doResetAll() {
  store.resetAllPlansToDefault()
  confirmResetAll.value = false
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex flex-col"
    style="background: #080c14;"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-5 pt-14 pb-5 border-b border-white/10">
      <div>
        <p class="text-white/40 text-xs uppercase tracking-[0.25em] mb-0.5">Customize</p>
        <h2 class="text-white text-xl font-black">My Salat Plan</h2>
      </div>
      <button
        id="close-plan-editor"
        class="w-10 h-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-95"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- Prayer list -->
    <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
      <div
        v-for="def in store.customPrayerDefs"
        :key="def.id"
        class="rounded-3xl border border-white/10 overflow-hidden"
        :class="expandedId === def.id ? 'bg-white/[0.05]' : 'bg-white/[0.03]'"
      >
        <!-- Prayer row header -->
        <button
          :id="`plan-prayer-${def.id}`"
          class="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition-colors"
          @click="toggleExpand(def.id)"
        >
          <span class="text-2xl">{{ def.icon }}</span>
          <div class="flex-1 text-left">
            <div class="flex items-center gap-2">
              <span class="text-white font-bold">{{ def.name }}</span>
              <span class="text-white/30 text-sm">{{ def.arabicName }}</span>
            </div>
            <p class="text-white/30 text-xs mt-0.5">
              {{ def.phases.length }} phases · {{ totalRakats(def.id) }} rakats total
            </p>
          </div>
          <span
            class="text-white/40 text-lg transition-transform duration-200"
            :style="expandedId === def.id ? 'transform: rotate(90deg)' : ''"
          >›</span>
        </button>

        <!-- Expanded editor -->
        <Transition name="expand">
          <div v-if="expandedId === def.id" class="px-4 pb-4">
            <div class="h-px bg-white/8 mb-4" />

            <!-- Phase rows -->
            <div class="flex flex-col gap-2 mb-3">
              <div
                v-for="(phase, pIdx) in def.phases"
                :key="pIdx"
                class="flex items-center gap-2"
              >
                <!-- Phase type badge (tap to cycle) -->
                <button
                  :id="`phase-type-${def.id}-${pIdx}`"
                  class="flex-shrink-0 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 min-w-[72px] text-center"
                  :class="PHASE_META[phase.type].bg + ' ' + PHASE_META[phase.type].color"
                  @click="cycleType(def.id, pIdx)"
                >
                  {{ phase.label }}
                </button>

                <!-- Count control -->
                <div class="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <button
                    :id="`phase-dec-${def.id}-${pIdx}`"
                    class="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white active:bg-white/10 transition-colors text-lg font-bold"
                    @click="changeCount(def.id, pIdx, -1)"
                  >−</button>
                  <span class="w-7 text-center text-white font-bold tabular-nums text-sm">
                    {{ phase.total }}
                  </span>
                  <button
                    :id="`phase-inc-${def.id}-${pIdx}`"
                    class="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white active:bg-white/10 transition-colors text-lg font-bold"
                    @click="changeCount(def.id, pIdx, 1)"
                  >+</button>
                </div>

                <span class="text-white/25 text-xs flex-1">rakats</span>

                <!-- Delete phase -->
                <button
                  :id="`phase-del-${def.id}-${pIdx}`"
                  class="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400/70 hover:text-red-400 hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                  :disabled="def.phases.length <= 1"
                  @click="deletePhase(def.id, pIdx)"
                >
                  <span class="text-sm leading-none">✕</span>
                </button>
              </div>
            </div>

            <!-- Actions row -->
            <div class="flex items-center gap-2">
              <!-- Add phase -->
              <button
                :id="`add-phase-${def.id}`"
                class="flex-1 h-9 rounded-xl bg-white/5 border border-white/10 border-dashed text-white/40 hover:text-white/70 hover:bg-white/8 active:scale-95 transition-all text-sm font-medium"
                @click="addPhase(def.id)"
              >
                + Add Phase
              </button>
              <!-- Reset to default -->
              <button
                :id="`reset-prayer-${def.id}`"
                class="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white/60 active:scale-95 transition-all text-xs"
                @click="store.resetPrayerToDefault(def.id)"
              >
                ↺ Default
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Reset all -->
      <div class="mt-2">
        <div v-if="!confirmResetAll">
          <button
            id="reset-all-plans"
            class="w-full h-11 rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white/60 hover:bg-white/8 active:scale-95 transition-all text-sm"
            @click="confirmResetAll = true"
          >
            Reset All Prayers to Default
          </button>
        </div>
        <div v-else class="flex gap-2">
          <button
            id="confirm-reset-all"
            class="flex-1 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 font-semibold active:scale-95 transition-all text-sm"
            @click="doResetAll"
          >
            Yes, Reset All
          </button>
          <button
            id="cancel-reset-all"
            class="flex-1 h-11 rounded-2xl bg-white/5 border border-white/10 text-white/40 active:scale-95 transition-all text-sm"
            @click="confirmResetAll = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
