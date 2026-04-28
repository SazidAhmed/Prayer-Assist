Feedback on Core Structure
The phase-based approach is the strongest part of your plan.

The Phase Flow: Since you are using Nuxt, you can treat each prayer as an object of "Steps." Instead of just a rakat counter, you have an array of steps: [{ type: 'sunnah', count: 4 }, { type: 'fardh', count: 4 }, { type: 'sunnah', count: 2 }].

Automatic Transitions: Between phases, you might want a "Transition State"—a 3-second countdown or a specific vibration pattern—to let the user know the phase has changed so they don't have to look at the screen.

Daily Overview Bar: This is great for "glanceability." Using a progress-ring or a simple color-coded dot system (Gray = Pending, Green = Done, Orange = In Progress) at the bottom of the layout will make the app feel very professional.

2. Reviewing the "Add Next" ListYour "Next Steps" list is ambitious. Here is how to prioritize them for the best impact:FeaturePriorityWhy?Witr & Nafl TrackingHighWitr is essential for the Isha routine. Without it, the Isha "Phase Flow" feels incomplete.Tasbeeh CounterHighMost users stay on their prayer mat for Dhikr. Adding a 33/33/34 counter right after the last Sunnah phase makes the app a complete post-prayer solution.Custom Prayer PlansMediumImportant for travelers (Qasr) who pray shortened rakats, or for different schools of thought (Madhabs) that have varying Sunnah counts.History LogMediumGood for habit tracking, but the core "utility" is the counter itself. This can wait for a Version 2.0.Prayer RemindersLowThere are hundreds of apps that do "Adhan" and reminders. Your app’s unique value is the in-prayer counting. Focus on that niche first.

3. Engineering Tips for the Phase System
Since you are building this in Nuxt, here are two technical suggestions to keep the code clean:

Use a State Machine
Instead of a bunch of if/else statements for Sunnah and Fardh, consider a simple state machine logic.

States: IDLE → SUNNAH_BEFORE → FARDH → SUNNAH_AFTER → COMPLETED.

This makes it much easier to handle the "Switch between prayers anytime" requirement because you can just reset the state machine to a new prayer's configuration.

The "Traveler Mode" Toggle
Since you mentioned custom plans, a quick win would be a "Traveler Mode" toggle. When active, it automatically halves the Fardh counts for Dhuhr, Asr, and Isha and skips Sunnah phases. It’s a high-value feature with very low code complexity.

4. UI/UX "Pro" Move: Haptic Languages
Since the user shouldn't be looking at the screen, use different "vibration languages" for each phase:

Single short pulse: Rakat incremented.

Double pulse: Phase completed (e.g., Sunnah done, moving to Fardh).

Long continuous pulse: Entire prayer session completed.

This allows the user to stay focused (Khushu) while still being 100% sure the app is tracking correctly.