# Product Exploration — 2026-09-26

Branch: `prototype/product-exploration`. Prototypes live under `/prototype` (sign-in required) and are isolated from the main app; see [Prototypes](#f-prototypes) for routes and [Cleanup](#cleanup) for how to remove them.

---

## A. Product understanding

**What CHEF is.** A personal cookbook PWA (Next.js 16 · Convex · Clerk · shadcn · Gemini) with a light social layer. Users keep their own recipes (public or private), browse other people's public recipes, cook step by step, plan a week, keep a shopping list and ask "what can I cook with these ingredients?".

**Who it is for.** Home cooks who cook several times a week. The dev deployment shows friends-and-family scale: about 10 real accounts and a handful of recipes.

**Primary journeys, in order of frequency:**

| # | Journey | Where it lives today | Friction observed |
|---|---------|---------------------|-------------------|
| 1 | Decide what to cook, then cook it | Home feed → recipe → Cook mode | The home page is a public feed, not "my kitchen". Cook mode forces an ingredients phase, then a long scrolling step list. There is one manual timer and no scaling. |
| 2 | Get a recipe into the app | `/create` (5-section form) | Everything is typed by hand, one line at a time, and a **photo is required**. There is no import. |
| 3 | Plan the week → shop | Meal Planner → "Shop Week" → Shopping List | The plan uses **day names, not dates**: it never rolls over and keeps no history. "Shop Week" adds every ingredient, even ones you have or that are already on the list. AI "Organize" cleans up afterwards. |
| 4 | Cook with what I have | Pantry | Nothing is saved: you retype your ingredients on every visit. Pantry isn't connected to the list or the plan. |
| 5 | Share a recipe | Recipe → Share (Web Share + OG image) | Works well. |

**Information architecture.** There are 5 top-level tabs (Recipes · Planner · Add · Shopping · Pantry) that don't connect to each other. The same recipe object is reached from 4 places, but no view answers "what's next for me?".

**Design system.** shadcn new-york, neutral base with an orange primary, Geist font, lucide icons, sonner toasts with Undo. Round 1–5 polish (see `docs/UI_POLISH.md`) made the UI calmer: numbered form sections, skeletons, a "⋯" menu for secondary actions.

**Data model constraints that shape what's possible:**
- `recipes.ingredients` / `steps` are **plain strings**. There is no quantity, unit or servings, which blocks exact scaling, unit-aware merging and linking ingredients to steps. `ingredientKeys` (AI canonical names) is a first step toward structure.
- `mealPlans.date` stores `"Monday"` rather than a date, and every entry must point to a recipe, so "Leftovers" or "Eating out" can't be planned.
- There's no servings field, no source URL, no collections, no household or sharing model.

### Inconsistencies between intent and implementation

- **Security (confirmed by calling the functions as an anonymous user on dev):**
  - `recipes.get` returns **private recipes** to anyone who has the id. `getPublic` correctly returns null for the same id.
  - `users.get` returns the whole user document, including **email** and `tokenIdentifier`, to anyone. It's used by the public profile page.
  - `mealPlans.add` doesn't check that the recipe is accessible, so someone else's private recipe title and image can be pulled into your own plan.
- **Home filters:** tag filtering happens on the client over the **currently loaded page** (9 items). The tag list is also built from loaded recipes only. With more recipes, a tag can show "no results" while matches exist further down.
- **Deleting a recipe** leaves its favorites, planned meals and shopping `recipeId` behind. The planner then shows an empty chip.
- **Cook mode wake lock** is requested once. Browsers release it when the tab is hidden, and it is never requested again.
- **Signed-out visitors** can read a public recipe but must sign in to open Cook mode. That may be an intentional sign-up gate, but it isn't stated anywhere.
- **Full-table scans** happen in `recipes.list` (non-search path), `listAll`, `searchByIngredients` and `autoGenerate`. This is fine at today's scale; it will be the first performance cliff.

---

## B. Research findings

Full report from the research pass (sources linked inline). Summary:

**Established patterns CHEF lacks (users now expect these):**
1. **Import from URL** using schema.org Recipe data. Every competitor has it (Paprika, Mela, Crouton, AnyList, Mealie, Cooklang). ReciMe's roughly 298K App Store ratings mostly praise getting recipes "all in one place" from Instagram and TikTok.
2. **Import from social captions, screenshots and cookbook photos.** ReciMe, Pestle, Mela, Honeydew, Deglaze and Plan to Eat have it, and Paprika 4 is adding it. Even long-established apps added this in 2025–26.
3. **Tap-a-time timers, quantities shown inside each step, several timers at once.** Apple News+ Food (iOS 18.4) has these, as do Crouton, Pestle, Paprika and Deglaze ("inline ingredients", Feb 2026). With Apple shipping them, they're now the baseline.
4. **Scaling and unit conversion.** Needs structured quantities.
5. **A grocery list that knows your pantry or staples** (Paprika pantry, Plan to Eat staples).
6. **Household sharing.** The top reason people pay for AnyList, Deglaze and Pestle, but also the most expensive to build and the most error-prone.

**Interesting niche patterns:**
- Mela's "want to cook" queue instead of a strict calendar.
- Mealie's planner rules ("Mondays vegetarian").
- Plan to Eat's Beginner Mode (AI simplifies the steps).
- Crouton's timers that name themselves.
- SuperCook's voice dictation of what's in the fridge.

**Newer, AI-driven ideas:**
- Import from social video: caption, then transcript, then video frames.
- AI-structured ingredients (quantity, unit, item, which step uses it).
- Photo of the fridge to suggest recipes.
- A cook-mode voice assistant that knows which step you're on.
- Substitutions based on what's in your pantry.
- A connector that lets external AI assistants (Claude/ChatGPT) read your cookbook (Honeydew).

**Probably not a fit:**
- Editorial recipe catalogs.
- Grocery-delivery integrations.
- Smart appliances.
- Macro and health scoring (Samsung's "Health Score" drew backlash).
- Full pantry inventory with quantities and expiry dates (users abandon it as a chore).
- Features that only work in native apps (Live Activities, Watch).

**What users actually value (evidence strength noted):**
- **Strong: import drives adoption**, e.g. "I never made the recipes I saved on social media because it was too difficult to find them."
- **Strong: paywalling imports causes backlash.** It's ReciMe's top negative review theme.
- **Strong: buying once and owning your data earns trust.** Yummly shut down in Dec 2024 with no bulk export.
- **Medium: cook-mode friction.** Complaints about the screen sleeping and having to scroll back to the ingredients.
- **Anecdotal: planners get abandoned** when plan, list and servings aren't connected. There's no rigorous data on this.

---

## C. Opportunity map

| Area | Opportunity | Level | Evidence |
|------|-------------|-------|----------|
| **Capture** | Import from link, text or photo; photo optional | 3 | Strong |
| **Cook** | One step at a time, quantities inside steps, tap-to-start named timers, scaling, voice, reliable wake lock | 2 | Strong (now the baseline) |
| **Home / IA** | A personal "what's next" home instead of a public feed; Discover separate from My cookbook | 3 | Medium |
| **Plan ↔ shop ↔ pantry** | A saved staples list; "Shop week" skips staples and items already listed; pantry that remembers | 2 | Medium |
| **Planning model** | Real dates plus rolling weeks; free-text entries (leftovers, eating out); a "want to cook" queue | 2–3 | Medium |
| **Data model** | AI-structured ingredients (qty/unit/item/step), servings, source URL | Enabler | Strong (blocks scaling, merging, inline quantities) |
| **Power use** | A global command palette (⌘K); bulk actions in the cookbook | 2 | Weak for consumer cooking apps |
| **Trust** | Export/backup; fix the privacy leaks | 1 | Strong (Yummly) / Critical |
| **Collaboration** | Household plan and list | 3 | Strong demand, high cost |
| **UI polish** | Tag filtering on the server; clean up after recipe delete; keyboard access for cook-mode step list; photo not required | 1 | — |

---

## D. Concepts

### 1. Smart Import *(prototyped)*
- **Problem:** Getting a recipe in means typing every line, and a photo is required. This is the biggest gap against every competitor.
- **Current:** `/create`, fully manual.
- **Proposed:** Paste a link, a caption/message, or a photo of a cookbook page. You get an editable draft that shows where it came from ("exact, from page data" or "extracted by AI, double-check"), then save.
- **Benefit:** Seconds instead of minutes. Unlocks saving recipes from Instagram and TikTok.
- **Evidence:** The #1 adoption driver in research. Paprika, Mela and ReciMe are built around it.
- **Complexity:** Medium · **Impact:** High · **Risk:** Medium (sites block scrapers; AI misreads; copyright and attribution of imported recipes)
- **Dependencies:** A `sourceUrl` and a `servings` field; an optional photo in `/create`; per-user AI rate limits (cost).
- **Example:** At dinner a friend sends a TikTok. You copy the link, paste it into Import, the caption becomes a draft in about 5 seconds, you fix one quantity and save.

### 2. Cook Mode 2.0 *(prototyped)*
- **Problem:** You scroll back to the ingredients for quantities, type timer minutes by hand, and the screen sleeps after switching apps.
- **Current:** A mandatory ingredients phase, then a long scrolling step list, one manual timer.
- **Proposed:**
  - One step at a time, with that step's ingredients and scaled quantities below it.
  - Durations in the text are chips that start named timers; several can run at once.
  - Scaling from ½× to 3×.
  - Voice "next / back / repeat / timer".
  - The wake lock is requested again when you come back to the tab.
- **Benefit:** Hands stay on the food and eyes stay on one thing.
- **Evidence:** Strong. This is Apple News+ Food's baseline.
- **Complexity:** Medium · **Impact:** High (it's the core moment) · **Risk:** Low
- **Dependencies:** Heuristics now. Exact results need structured ingredients (concept 7).

### 3. Today hub *(prototyped)*
- **Problem:** No view answers "what's next?". Plan, list and pantry don't talk to each other.
- **Current:** The signed-in home is a public recipe feed.
- **Proposed:**
  - A calm personal home: the next meal first with "you have X of Y", a week strip, and staples.
  - "Shop for the rest of the week" that skips staples and items already on the list.
  - "Cook with what you have", then My cookbook, then Discover.
- **Benefit:** One screen per day instead of four tabs. The shopping list stops filling with things you already have.
- **Evidence:** Medium. Planners get abandoned when disconnected; a light staples list beats full inventory.
- **Complexity:** Medium · **Impact:** Medium–High · **Risk:** Medium (moving the home page affects returning users)
- **Dependencies:** A server-side staples table; real dates in the plan.

### 4. Command palette *(prototyped)*
- **Problem:** Repeat actions (plan X for Thursday, add milk) take 4–6 taps across tabs.
- **Proposed:** Global ⌘K: search recipes, then Open, Cook, Plan it (day × meal) or add ingredients; "add milk" quick add; navigation.
- **Evidence:** Weak for consumer cooking. Strong in productivity software. It's cheap to test.
- **Complexity:** Low · **Impact:** Low–Medium (desktop and keyboard users) · **Risk:** Low (it's an extra layer)

### 5. Dated, flexible planner
- **Problem:** The week never rolls over; there's no history; you can't plan "Leftovers".
- **Proposed:**
  - Real dates with previous/next week, and a "copy last week" option.
  - Free-text entries.
  - A "want to cook" queue you can drag onto days.
  - Magic Fill rules ("weeknights ≤ 30 min").
- **Evidence:** Medium (Mela queue, Mealie rules, Plan to Eat).
- **Complexity:** Medium (needs a data migration) · **Impact:** Medium · **Risk:** Medium

### 6. Household sharing
- **Problem:** Couples and families plan and shop together.
- **Proposed:** A shared plan and list via Clerk Organizations or a simple household table, live through Convex.
- **Evidence:** Strong demand, and the #1 reason people pay.
- **Complexity:** High · **Impact:** High · **Risk:** High (permissions, sync bugs)

### 7. AI-structured ingredients (enabler)
- **Problem:** Plain-string ingredients block exact scaling, unit-aware merging, pantry matching and inline quantities.
- **Proposed:** Extend the existing `tagRecipeIngredients` job to also store `{qty, unit, item, note, stepIndexes}` per line.
- **Evidence:** Strong (Deglaze, Cooklang model).
- **Complexity:** Medium · **Impact:** High, but indirect · **Risk:** Low (background, can be re-run)

### 8. Trust pack: privacy fixes + export
- **Problem:** Private recipes and emails leak; there's no way to take your data out.
- **Proposed:**
  - Access checks in `recipes.get`, `users.get` (public fields only) and `mealPlans.add`.
  - "Export my cookbook" as JSON and Markdown.
- **Complexity:** Low · **Impact:** Critical (privacy) / Medium (export) · **Risk:** Low

### 9. Fridge photo → "what can I make"
- **Proposed:** Take a photo of the fridge or pantry; Gemini lists ingredients; they feed Pantry search.
- **Evidence:** A crowded category of standalone apps; accuracy is mixed.
- **Complexity:** Low (reuses Smart Import's photo path) · **Impact:** Low–Medium · **Risk:** Medium (wrong detections)

---

## E. Decision matrix

Scores 1–5 (5 = best; for Effort and Risk, 5 = lowest effort or risk).

| Concept | User value | UX gain | Differentiation | Effort | Risk | Evidence | Notes |
|---|:-:|:-:|:-:|:-:|:-:|:-:|---|
| 1 Smart Import | 5 | 5 | 3 | 3 | 3 | 5 | Table stakes, not differentiating, but its absence is disqualifying. |
| 2 Cook Mode 2.0 | 4 | 4 | 2 | 4 | 5 | 5 | The best return for the cost. Makes the core moment better for every recipe. |
| 3 Today hub | 4 | 4 | 4 | 3 | 3 | 3 | Changes the product's centre of gravity. Needs user validation. |
| 4 Command palette | 2 | 3 | 3 | 5 | 5 | 1 | Cheap and harmless, but helps few users on phones. |
| 5 Dated planner | 3 | 3 | 2 | 3 | 3 | 3 | Needs a data migration. |
| 6 Household | 5 | 3 | 3 | 1 | 1 | 4 | Highest demand, highest cost. Do it after the data model work. |
| 7 Structured ingredients | 3 | 3 | 3 | 3 | 4 | 4 | Invisible alone; multiplies concepts 2, 3 and 5. |
| 8 Trust pack | 5 | 1 | 2 | 5 | 5 | 5 | The privacy part isn't optional. |
| 9 Fridge photo | 2 | 2 | 2 | 4 | 3 | 2 | A novelty unless pantry becomes central. |

**Trade-offs:**
- **Import vs. Today hub.** Import improves an existing job dramatically, with little product risk; it's catch-up. The Today hub is the bigger bet: it changes what CHEF *is* (from "recipe site with tools" to "my kitchen"). But it only pays off if people actually plan. The data shows 1 planned meal across all real users on dev, so that is an unvalidated assumption.
- **Cook Mode 2.0** is mostly an improvement on established patterns, not a differentiator. It's the lowest-risk way to make every recipe better, and most of the quality ceiling comes from concept 7.
- **The command palette** is visually impressive in a demo, but the evidence that cooks want it is weak. Keep it only if desktop usage turns out to be significant.
- **Household sharing** has the strongest paid demand of anything here. It should wait until the plan model uses dates (concept 5); otherwise shared plans inherit the day-name limitation.

---

## F. Prototypes

Open `/prototype` while signed in. There's a switcher bar on every prototype page. All four use real Convex data, so changes are real and every write has an Undo.

| Direction | Route | Replaces | Backend |
|---|---|---|---|
| **Smart Import**: AI-native | `/prototype/import` | Manual typing in `/create` | `convex/prototype/importRecipe.ts`: `fromUrl`, `fromText`, `fromPhoto`, `save` |
| **Today**: workflow-first | `/prototype/today` | The public feed as the signed-in home | `convex/prototype/today.ts` (`overview`) plus existing mutations |
| **Cook Mode 2.0**: minimal evolution | `/prototype/cook` → `/prototype/cook/[id]` | `/recipe/[id]/cook` (the picker links both, so you can compare) | none (client-only) |
| **Command Palette**: power user | `/prototype/command`, plus ⌘K/Ctrl+K anywhere once enabled | nothing (an extra layer) | none (existing queries and mutations) |

**What each one does, as verified in a browser as a dedicated Clerk test user on the dev deployment:**

- **Smart Import**
  - **Link:** BBC Good Food imports in about 2 s from schema.org data with no AI. Title, 6 ingredients, 5 steps, time, servings, tags and the image all come through, and the image is copied into Convex storage on save.
  - **Blocked sites:** Allrecipes returns HTTP 403 to server-side fetches. The prototype shows the error with a one-click "Paste the text instead".
  - **Text:** an Instagram-style caption becomes a clean draft in about 5 s through Gemini.
  - **Photo:** a rendered recipe card was read accurately, including "1½" and splitting "for the drizzle" into two lines.
  - **Review:** uses the numbered-section pattern from `/create`, with a provenance banner ("exact, from page data" vs "extracted by AI, double-check").
  - **Other:** photo is optional; recipes save privately by default.
- **Today**
  - Time-of-day "Up next" hero showing "You have X of Y" based on staples.
  - A Mon–Sun strip with today highlighted.
  - "Shop for the rest of the week": 3 meals gave 29 items; with 6 staples, 22 to buy, 7 you have and 1 already on the list. The review sheet is grouped by meal, and **Add 22 → Undo returned the list from 25 to 3**.
  - Staples live in localStorage and update everything live.
  - "Cook with what you have" (top 4 with match bars), then My cookbook, then Discover.
  - A getting-started checklist for new users.
- **Cook Mode 2.0**
  - An optional "Get ready" overview, then one step at a time in large type.
  - "You'll need" lists the ingredients for the step, scaled (2× turns 600g into 1200g in the step and the full list).
  - Durations in the text are chips that start **named timers** ("Marinate · step 1", "Sear · step 2"). Several run at once, and the chip shows the live countdown.
  - Finished timers beep, vibrate, and send a notification if permitted.
  - Step rail and ingredient column on desktop; swipe, ←/→ and Space to move.
  - Voice "next / back / repeat / timer / ingredients" in Chrome and Edge.
  - The wake lock is requested again whenever the tab becomes visible.
  - Progress (step, scale, checks, running timers) survives a reload.
- **Command Palette**
  - With no query: "Up next" meals, recent recipes, Go to, theme.
  - Search → recipe → Open, Cook, **Plan it** (days from today × meal, occupied slots marked, and you can filter by typing "sun lunch"), add ingredients, favorite.
  - `add 2 lemons` adds a shopping item.
  - Planning and quick-add both verified against the database, including Undo.
  - Off by default. The flag at `/prototype` turns it on app-wide; verified inert on `/` when off.

**Fixes made during validation:**
- The desktop timer tray overlapped the ingredient column. It's now pinned under the list.
- "Try an example" in Import kept crediting a previously blocked URL.
- A photographed recipe card was used as the dish photo by default. It now needs a deliberate switch.

## G. Prototype comparison

| | Smart Import | Today | Cook Mode 2.0 | Command Palette |
|---|---|---|---|---|
| **What it changes** | How recipes get *in* | What the app *is* when you open it | The moment you actually cook | How experienced users move around |
| **Problem solved** | Typing recipes is the biggest reason people won't keep a digital cookbook | Plan, list, pantry and recipes are 4 disconnected tabs; "Shop Week" adds things you already have | Scrolling back for quantities, typing timer minutes, the screen sleeping | 4–6 taps for repeat actions |
| **Better than today** | Seconds instead of minutes; shows where each field came from; photo optional | One screen answers "what's next and what do I need"; the list stops filling with staples | Hands-free, glanceable; every recipe gets better with no data changes | Plan or add from anywhere without leaving the page |
| **Worse or more complicated** | AI can misread (review is mandatory); blocked sites; AI cost and rate limits; copyright and attribution questions | Moves the public feed down to "Discover", which is a loss for people who come to browse; more to compute; staples are one more concept | Heuristic matching can miss or over-match ingredients (e.g. "pepper"); timer names are verb guesses; voice only in Chromium | Invisible on phones; another UI to maintain; adds duplicates silently, like the main app |
| **Who benefits most** | Everyone, especially new users with recipes scattered across social media | Households who plan and shop weekly | Everyone who cooks from the app | Desktop power users (likely few) |
| **Technical cost to ship** | M: add `sourceUrl`/`servings`, make the photo optional in `/create`, cost controls, a Web Share Target on Android | M–H: real dates in the plan (migration), a server staples table, decide what happens to the current home | L–M: ship as is; exact quality needs structured ingredients | L: mostly done |
| **Product risk** | Medium | Medium–High (changes the landing page for every returning user) | Low | Low |
| **What we need to learn first** | Where people's recipes actually live (links vs social vs cookbooks) and how often AI drafts need fixing | Whether real users plan at all: dev data has **1 planned meal across all real accounts** | Whether people use timers and scaling or just read steps | Whether anyone uses CHEF on desktop with a keyboard |
| **Keep even if rejected** | schema.org parsing on `/create` as a "Paste a link" button; making the photo optional | "Shop for the week" that skips staples and listed items, inside the existing planner; persisting Pantry | Wake lock fix; tap-to-start timers inside the existing cook page | "Plan it" day × meal picker as a faster planner slot picker |

**The main trade-off.** Cook Mode 2.0 and Smart Import improve jobs users already do, at low product risk. Today asks users to adopt a new habit (planning) and moves the home page. It's the most strategic of the four and the least validated. The palette is the cheapest and the least likely to matter.

## H. Validation plan

| Question | Method | Validates if… | Invalidates if… |
|---|---|---|---|
| Is import the adoption blocker? | **Fake-door** on `/create`: "Import from a link or photo" button that logs clicks and asks for the link (store the links). 2–4 weeks. | A large share of recipe creations start from the button; the links collected are mostly recipe sites and social posts | Few clicks; the recipes people add are mostly their own family ones (then Photo and Text matter more than Link) |
| Which import sources matter? | Instrument the prototype: `source` (link/text/photo), success, fields edited before save | Most drafts are saved with small edits | Many abandoned reviews, or heavy editing (AI quality or UX problem) |
| Do people plan? | Analytics on real usage **before** building Today: weekly active planners, meals planned per week, "Shop Week" use (query prod data read-only) | A meaningful share of weekly users plan 3+ meals | Planning is rare, so Today's hero and shop card would be empty for most users; lead with "Cook with what you have" instead |
| Is Today a better home? | **Feature flag** A/B for signed-in users: `/` = feed vs Today. Measure recipes cooked per week, return visits, time to "Start cooking" | More cook-mode starts and return days without fewer recipes created or browsed | Browsing and recipe creation drop, or people keep going back to the feed |
| Does Cook 2.0 help? | **Moderated usability test**: 5 people cook a real recipe with each version (counterbalanced). Count scroll-backs, timer use, errors | Fewer "where was I" moments; timers used without being prompted | People ignore chips; ingredient matching confuses them |
| Is a palette worth it? | Ship behind the flag to internal and friendly users; log opens per active user | Repeated weekly use by a meaningful group | Opened once out of curiosity, then never again |
| Privacy fix | Automated: `convex-test` cases calling `recipes.get` / `users.get` unauthenticated | Private data isn't returned | — |

## I. Next steps

**Quick wins (days)**
1. **Fix the privacy leaks** (`recipes.get` access check, `users.get` public fields only, `mealPlans.add` recipe check), plus a small test. This should happen regardless of which direction you pick.
2. Cook mode: request the wake lock again when the tab becomes visible; move in tap-to-start timers (`segmentStep` in `lib/prototype/recipe-text.ts` is ready to reuse).
3. Make the photo optional in `/create`, and add a "Paste a link" field that uses the schema.org parser (no AI cost).
4. Server-side tag filtering on the home page (today it only filters the loaded page); clean up favorites, plans and list references when a recipe is deleted.
5. Save what the Pantry page's ingredients were (localStorage now, a table later).

**Medium improvements (1–3 weeks)**
1. Ship Smart Import for real: `sourceUrl` and `servings` fields, cost and rate controls, and a Web Share Target so Android users can share from Instagram or TikTok directly (iOS PWAs likely can't; use paste).
2. Cook Mode 2.0 replaces the current cook page (after the usability test).
3. **Structured ingredients**: extend `tagRecipeIngredients` to store `{qty, unit, item, note, stepIndexes}`. This makes scaling, inline quantities, list merging and pantry matching exact.
4. A staples table plus "Shop for the week" that skips what you have, inside the existing planner.

**Larger experiments (month+)**
1. Today as the signed-in home, behind a flag and A/B tested (after the planning-usage check).
2. A dated, rolling meal plan with free-text entries and a "want to cook" queue (data migration).
3. Household sharing of plan and list (Clerk Organizations or a household table). It's the highest-demand paid feature in the category, but it needs the dated plan first.
4. Export and backup (JSON/Markdown). Cheap trust insurance; Yummly users lost everything.

## Cleanup

Everything experimental is marked `// PROTOTYPE`. To remove it all:

- Delete `app/prototype/`, `components/prototype/`, `convex/prototype/`, `lib/prototype/`.
- Revert the three one-line hooks: the palette mount in `app/layout.tsx`, and the `/prototype/cook/` nav-hiding checks in `components/navbar.tsx` and `components/mobile-nav.tsx`.
- Optionally drop the shadcn components added for the prototypes (`tabs`, `tooltip`, `toggle`, `toggle-group`, `separator`, `scroll-area`) and the `radix-ui` dependency. It's shadcn's new unified package and makes up most of the lockfile diff.
- Test data lives only on the **dev** Convex deployment, under the Clerk test user `chef-proto+clerk_test@example.com` (`user_3Js2e65VAMGHihCEITKuVgz1gFE`): 10 private recipes, a week plan, 3 list items. `convex/prototype/seed.ts` refuses to run for non-test accounts. Re-seed with `npx convex run prototype/seed:seedTestUser '{"userId":"user_3Js2e65VAMGHihCEITKuVgz1gFE","reset":true}'`.
- The prototype Convex functions are deployed to **dev only**. A Vercel preview that points at the production Convex deployment will build, but the `/prototype` pages will fail to load data there. The main app is unaffected.
