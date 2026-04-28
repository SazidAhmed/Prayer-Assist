<script setup lang="ts">
import { ref } from 'vue'
import { 
  Zap, 
  Clock, 
  FileText, 
  RotateCcw,
} from 'lucide-vue-next'

useSeoMeta({
  title: 'Fit-Z Counter',
  description: 'A mobile-friendly counter app',
})

const count = ref(0)

const increment = () => {
  count.value++
}

const reset = () => {
  count.value = 0
}
</script>

<template>
  <main class="min-h-screen bg-[#F3F4F6] flex justify-center">
    <!-- Mobile Container -->
    <div class="w-full max-w-md min-h-screen bg-[#F3F4F6] flex flex-col relative shadow-2xl">
      
      <!-- Header -->
      <header class="flex items-center justify-between px-4 py-4 bg-white/80 backdrop-blur-sm">
        <div class="flex items-center gap-2">
          <div class="flex size-9 items-center justify-center rounded-xl bg-red-100 text-red-500">
            <Zap class="size-5 fill-current" />
          </div>
          <span class="text-xl font-bold text-indigo-600">Fit-Z</span>
        </div>
        
      </header>

      <!-- Main Counter Area -->
      <div class="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <!-- Counter Circle (Clickable) -->
        <div class="relative mb-8">
          <button
            @click="increment"
            class="size-48 rounded-full border-[6px] border-indigo-200 flex items-center justify-center bg-white shadow-lg transition-all active:scale-95 hover:bg-indigo-50 cursor-pointer"
          >
            <span class="text-5xl font-bold text-gray-900 tabular-nums">
              {{ count.toString().padStart(2, '0') }}
            </span>
          </button>
          <!-- Progress Ring (decorative) -->
          <svg class="absolute inset-0 size-48 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#E0E7FF"
              stroke-width="4"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#6366F1"
              stroke-width="4"
              stroke-linecap="round"
              :stroke-dasharray="289"
              :stroke-dashoffset="289 - (count % 100) * 2.89"
              class="transition-all duration-500"
            />
          </svg>
        </div>

        <!-- Reset Button -->
        <div class="w-full max-w-xs">
          <Button
            @click="reset"
            variant="outline"
            size="lg"
            class="w-full h-12 rounded-2xl text-gray-600 border-gray-300 hover:bg-gray-100 transition-all"
          >
            <RotateCcw class="size-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <!-- Bottom Navigation -->
      <nav class="flex items-center justify-around bg-white py-3 px-4 border-t border-gray-200">
        <button class="flex flex-col items-center gap-1 text-indigo-500">
          <Clock class="size-6" />
          <span class="text-xs font-medium">Timer</span>
        </button>
        <button class="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
          <FileText class="size-6" />
          <span class="text-xs font-medium">Plans</span>
        </button>
        <button class="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
          <div class="flex gap-0.5">
            <div class="size-1.5 rounded-full bg-red-400"></div>
            <div class="size-1.5 rounded-full bg-amber-400"></div>
            <div class="size-1.5 rounded-full bg-green-400"></div>
          </div>
          <span class="text-xs font-medium">History</span>
        </button>
      </nav>
    </div>
  </main>
</template>
