### **Project Prompt: Prayer Ritual & Rakat Tracker**

**Context:**

I am building a mobile-first PWA called "Vitality Prayer" using  **Nuxt ** ,  **Tailwind CSS** , and  **Pinia** . The app helps users track Rakat counts during prayer to prevent forgetfulness. It follows a strict "Phase Flow" for the 5 daily prayers.

**Core Data Structure:**

Define a `usePrayerStore` in Pinia. Each prayer (Fajr, Dhuhr, Asr, Maghrib, Isha) should be an object with a `phases` array.

* **Example Phase:** `{ label: 'Sunnah', total: 4, type: 'sunnah' }`.
* **The Flow:** Sunnah Before **$\rightarrow$** Fardh **$\rightarrow$** Sunnah After.
* **State:** Track `activePrayerId`, `currentPhaseIndex`, `currentRakatCount`, and a `dailyCompletion` status for all 5 prayers.

**Task 1: The State Engine (Pinia)**

* Implement logic to handle `incrementRakat()`.
* When `currentRakatCount` reaches the phase total, automatically move to the next phase in the array.
* If the final phase is completed, mark that prayer as "Done" in the daily tracker and trigger a `sessionCompleted` state.
* Use `@vueuse/core` to persist the daily completion progress in localStorage.

**Task 2: The "Immersion" UI (Counter Component)**

* Create a full-screen, high-contrast dark mode component (`PrayerCanvas.vue`).
* **Interaction:** The entire viewport must be a button. Tapping anywhere increments the rakat.
* **Visuals:** Center the `currentRakatCount` in a massive font. Above it, show the current phase (e.g., "Fardh - 2 of 4").
* **Feedback:** Integrate the  **Vibration API** .
  * Short pulse on tap.
  * Double pulse on phase change.
  * Long pulse on total prayer completion.
* **Utility:** Implement the **Screen Wake Lock API** to prevent the phone from sleeping during the session.

**Task 3: Navigation & Progress (Dashboard)**

* Create a persistent bottom navigation bar showing icons for the 5 prayers.
* Use color-coding (e.g., dimmed for pending, glowing/green for completed).
* Allow the user to switch between prayers at any time, which should reset the `activeSession` to the first phase of the selected prayer.

**Task 4: Completion Summary**

* Create a "Session Finished" overlay that displays a summary: Total Rakats prayed, time taken, and a "Back to Dashboard" button.

**Technical Requirements:**

* Use **TypeScript** for all interfaces.
* Use **Tailwind CSS** for a "Glassmorphism" dark aesthetic.
* Ensure the UI is strictly mobile-first (optimized for touch).
* Modularize components: `PrayerStore.ts`, `RakatDisplay.vue`, `ProgressSidebar.vue`, and `ControlPanel.vue`.
