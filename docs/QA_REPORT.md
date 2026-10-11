# QA report — 2026-10-11

A second full QA pass over chef, on branch `fix/qa-audit-2`. It covered the Host role (recipe author), the Guest role (other users and signed-out visitors), security, data integrity, UI and accessibility, and performance and concurrency.

## How it was run

Five agents tested in parallel, each with its own browser session and test account:

| Agent | Area |
|---|---|
| Security / API / DB | Direct Convex calls as several identities; middleware and metadata checks |
| Host | Every Host journey in the browser, with each write checked in the database |
| Guest / auth | Signed-out routes, sessions, open redirects, cross-user state changes, leak checks |
| UI / a11y | 5 breakpoints, light and dark themes, keyboard use, axe-core on every route |
| Performance / concurrency | Races, limits, dependency failures, large data, Core Web Vitals |

After that, the orchestrator fixed what they found. A sixth agent then re-verified the high-risk fixes independently; see [Verification](#verification).

**Environment:** the dev Convex deployment (`hearty-kookabura-538`) and `next dev` on :3100. Accounts: two existing Clerk test users (Host, Guest), plus a third created for this pass, QA3 (`chef-qa3+clerk_test@example.com`). Nothing touched production.

**Quality gates at the end:**

| Check | Result |
|---|---|
| `pnpm test` | 37 tests, all passing (was 20) |
| `tsc --noEmit` | clean |
| `pnpm lint` | 0 errors (was 11), 14 old warnings |
| `pnpm build` | succeeds |

## Summary

| Severity | Found | Fixed | Open |
|---|---|---|---|
| P0 | 0 | — | — |
| P1 | 1 (+1 regression introduced and fixed on this branch) | 1 (+1) | 0 |
| P2 | 9 | 9 (one mitigated rather than fully solved, see PERF-4) | 0 |
| P3 | ~50 | ~40 | ~10, listed under [Open issues](#open-issues) |

No P0 issues, and no unauthorized access. Every attempt to read private data or write another user's data failed, including against the rewritten feed and search code and with hand-crafted pagination cursors.

## Fixed

### P1
- **PERF-1: large recipes could break the planner, pantry search and auto-fill for everyone.**
  - The three functions read every readable recipe in full. About 72 maximum-size public recipes would push them past Convex's 16 MiB read limit; `/meal-planner` then rendered "Something went wrong".
  - The planner also subscribed to every readable recipe only so that "Shop week" could look up ingredients.
  - **Fix:**
    - Whole-catalogue reads now come from index streams and stop at a 4 MB byte budget (`takeWithinBudget` in `convex/feed.ts`).
    - Feed pages cap the rows they read.
    - "Shop week" runs on the server (`shoppingList.addPlannedWeek`), so the planner no longer loads `listAll`.
  - **Verified** with 144 recipes of ~117 KB each (16.8 MB total): every function now succeeds.
- **HOST-1: regression found and fixed on this branch.** The first version of the byte-budgeted reader didn't skip the `null` rows that filtered streams yield, which crashed pantry search. It never reached `main`. Regression test: `pantry search and listAll work when the caller owns public and private recipes`.

### P2
- **QA2-1: search hid your own private recipes.** The search index can't express "public OR mine", so searching never found the signed-in user's private recipes, even though they appear in the feed. Your own private matches now lead the first page of results.
- **Whole-table scans (open P3 #4 in the last report).** `recipes.list`, `listAll`, `searchByIngredients`, `listPublic`, `mealPlans.autoGenerate` and `ai.getMealPlannerData` used `.filter()` over the entire table.
  - They now read through a new `recipes.by_isPublic` index plus `by_userId`, merged with convex-helpers streams (`convex/feed.ts`).
  - The client uses the convex-helpers `usePaginatedQuery`, which pins page boundaries. Checked against live inserts and deletes, with no duplicates or gaps.
- **PERF-2: "Shop week" could fail silently.** A full week's ingredients exceeded the 200-item batch limit, and a full list threw with no toast. It now runs on the server and shows the server's message.
- **PERF-3: when two tabs edited the same recipe, the last save won.** The form sends the version it loaded (`baseVersion`). The server refuses a save made from an outdated version and says why; the user's edits stay in the form. A new `recipes.updatedAt` field supports this.
- **PERF-4: saving could hang on a dead connection (mitigated).** A save now refuses to start when the Convex socket is disconnected, even if the browser says it's online. After 15 s it shows "Still saving…". The save isn't cancelled, because Convex may still deliver it, and cancelling would let a retry create a duplicate.
- **SEC-1: a failed import left its copied photo behind.** The copied photo is now deleted when the recipe is rejected. SVGs are no longer copied.
- **HOST-2: import review accepted a renamed non-image as the recipe photo.** Picked photos are now decoded, as on `/create`.
- **HOST-3: Organize cut items to 200 characters and invented aisle names.** Items keep up to 300 characters. Aisles are limited to the app's own list, so names like "Dairy & Eggs" no longer appear next to "Dairy".
- **UI-1: closing a dialog dropped keyboard focus.** Six dialogs and sheets opened from state (⌘K, Filters, planner picker and confirms, Delete all) sent focus to `<body>` on close. The shared `dialog`/`sheet`/`alert-dialog` wrappers now return focus to whatever opened them, including the trigger of a menu (`hooks/use-return-focus.ts`).

### P3
**Navigation and forms**
- Leaving a recipe form with unsaved changes through an in-app link or browser Back now asks first (`hooks/use-leave-guard.ts`). This was open item #2 in the last report.
- Create and edit now land on the saved recipe with a toast, instead of going home.

**Data integrity and validation**
- `recipes.update` keeps `isPublic` and `tags` when they're omitted (open item #3 in the last report).
- Shopping-list `toggleBatch` sets an explicit state, so two stale tabs can't cancel each other out.
- Undoing Organize recreates only the items Organize merged, not ones the user deleted afterwards. Restored categories are capped.
- Auto-fill and AI meal suggestions respect the 100-meal cap and never double-book a slot.
- Renaming yourself now updates the author name stored on your recipes, so search finds the new name.
- Users without a name show as "Cook" rather than the start of their email address.
- Titles or lines made only of zero-width characters are rejected. Emoji joiners are kept.
- An upload with no content type no longer crashes save with a TypeError.
- Favorites combined with "My recipes" no longer shows other people's recipes.
- Hand-edited `maxTime` URL values (0, NaN) mean "any". The max-time slider starts at 5.

**Uploads and AI**
- `importRecipe.fromPhoto` refuses other users' recipe photos.
- A daily cron deletes uploads that no recipe has used for 7 days (`convex/storageCleanup.ts`). It deletes nothing if any recipe has a storage id it doesn't recognise.
- Gemini calls time out after 60 s, and raw API error bodies are no longer shown to users.
- All on-demand AI features now share an hourly budget of 40 calls per user (`AI_QUOTA`), on top of each feature's 30 s cooldown. This was CR-2: before, an account could make about 12 Gemini calls a minute with no overall cap.

**Command palette (⌘K)**
- "add to shopping list" shows the action instead of adding an item by that name.
- "add milk to shopping list" adds "milk".
- One action per opening, so a double Enter adds once.
- Server messages are shown on failure.
- The search box has an accessible name.

**Sign-in**
- `?welcome=true` is cleared after signing in. The first-run install prompt still shows once.
- The navbar "Sign in" returns you to the page you were on, and it's hidden on `/sign-in`.
- A malformed `redirect_url` no longer blanks the sign-in page.

**Cook mode**
- When the owner removes steps mid-cook, you stay on the last real step instead of seeing "Completed!".
- A finished session restarts from the beginning.
- The arrow keys no longer change the step while you're using the scale picker.
- The progress bar has a value and a name.

**Accessibility, titles and messages**
- Page titles for create, planner, shopping list, cook, profile, about, terms, privacy and 404. Your own private recipe page shows its own title.
- Screen-reader fixes:
  - "Sunday, Today" and "Extras, Optional" are read as separate words.
  - Recipe cards don't read the title twice.
  - Empty search results are announced.
- Smooth scrolling respects reduced motion. The About page's text contrast is fixed.
- Toasts stay for 6 s, so Undo is reachable.
- Planner ⋯ buttons and reorder handles are 24 px tap targets.
- Messages:
  - Shopping-list add errors show the server's message (e.g. the 300-character limit), and the input has a `maxLength`.
  - Planner Undo explains "week full".
  - Import no longer says "No recipe found: No recipe found…".
- Share keeps `?scale=`.
- Lint: 11 errors fixed (`no-explicit-any`, `set-state-in-effect`).

## Open issues

These are known, not fixed, and none is above P3. Roughly in priority order:

1. **Avatar URLs (CR-4).** Any https avatar URL is accepted, so a profile owner could still log the IP of visitors. The image is now requested with `no-referrer`, and a URL that isn't an image falls back to the icon (HOST-20, fixed). Proxy avatars through storage, or allow-list hosts.
2. **Offline (PERF-8).** There's no service worker, so neither the shopping list nor cook mode is available offline, even though the app offers installation.
3. **Large shopping lists (PERF-7, partly fixed).** Checking an item now updates optimistically: about 30 ms to show, and offline taps show straight away. At 1,000 items the list is still about 10k DOM nodes; memoizing rows or virtualizing the list would help.
4. **Duplicates.** Shop week and repeated adds don't merge with what's already on the list (HOST-4). Organize can do it on request.
5. **Cook mode and scaling quality.**
   - Scaled quantities don't follow plurals ("1 onions", "2 egg") and sometimes show decimals ("0.2 cup") (HOST-9).
   - Step↔ingredient matching sometimes lists the wrong ingredients for a step (HOST-11).
6. **Accessibility polish.**
   - Drag-and-drop announcements read raw ids, and keyboard drag in the planner is slow (UI-5). The "Move to" menu remains the keyboard alternative.
   - Empty create submit focuses the photo button, and photo and profile errors are toast-only (UI-6, UI-7).
   - Buttons that disable or unmount lose focus (UI-2).
   - The primary-on-muted text is 4.4:1 and the focus ring is faint (UI-8, UI-9).
   - The install drawer is full-width on desktop and has no initial focus (UI-11).
7. **Config.**
   - Rename `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` to the `*_FALLBACK_REDIRECT_URL` names (Clerk deprecation warning on every page; needs a Vercel env change).
   - The OG image route uses the deprecated Edge runtime.
   - `package-lock.json` is stale next to `pnpm-lock.yaml`.
8. **Smaller items.**
   - An unsaved create form is lost if the session ends (AUTH-4).
   - Calling restore twice through the API can duplicate items; the UI only allows it once (PERF-6).
   - `devSeed` reset doesn't clean up references or photos (dev only, CR-5).
   - Organize shows no progress on long lists.
   - A timer running when its recipe is deleted mid-cook is lost.
   - OG images clip very long titles.

## Verification

An independent verification agent re-ran the high-risk fixes in real browsers and checked the saved data with `npx convex run`. The four defects it found were then fixed and re-checked by the orchestrator.

| # | Check | Result |
|---|---|---|
| 1 | Search finds own private recipes; Guest and signed-out don't; feed has no duplicates; filters | ✅ |
| 2 | Pantry search renders (after the in-branch regression) | ✅ |
| 3 | Planner: Shop week (100 ingredients, with Undo), the "Plan some meals first" empty state, Magic fill | ✅ |
| 4 | Leave guard: link, Back, Cancel, clean form | ✅ |
| 5 | Stale edit refused, with the DB value kept; normal save lands on the recipe | ✅ |
| 6 | Focus returns to the opener for Filters, ⌘K, Delete all, Delete recipe, planner picker, Clear plan | ✅ (Delete recipe was checked with Cancel, not Escape) |
| 7 | ⌘K: "add to shopping list", "add milk to shopping list", double Enter adds one item | ✅ |
| 8 | Sign-in returns to the page; `?welcome` cleared; malformed `redirect_url` still shows the form; no navbar Sign in on `/sign-in` | ✅ |
| 9 | Cook mode: steps removed mid-cook, finished session restarts, arrow keys on the scale picker | ✅ after a follow-up fix (arrows now select) |
| 10 | Shopping list: maxLength and server message, checks persist, Organize uses consistent aisles | ✅ |
| 11 | Page titles | ✅ after a follow-up fix (own private recipe after in-app navigation) |
| 12 | Console and network sweep of 8 routes as Host | ✅ No errors and no 4xx/5xx; only Clerk dev warnings |

**Follow-ups from verification, all fixed and re-checked in the browser:**
- After in-app navigation, your own private recipe's tab said "Recipe Not Found". The page now asks Convex as the visitor (Clerk token), so it's titled correctly; signed-out visitors still see "Recipe not found" with the default social tags.
- The leave guard left an extra history entry: Back took two presses, or did nothing after clearing the form. Back now skips that entry.
- Arrow keys moved focus in the cook-mode scale picker without selecting.
- "1 steps" now reads "1 step".

**The orchestrator also checked in the browser:**
- feed pagination through live inserts and bulk deletes
- every leave-guard path, and that save lands on the recipe
- stale-edit refusal
- the 144-large-recipe stress case
- the AI-quota and toggle tests
- optimistic shopping-list ticks: about 30 ms, persisted
- the broken-avatar fallback
- the sign-in redirect for protected routes
- 24 px tap targets

## Coverage

| Area | Covered |
|---|---|
| Routes | Every route signed in and out, including malformed ids, URL-encoding, case and trailing-slash variants, unknown paths, and the 404 |
| Roles | Host, Guest, signed-out, fake attacker identities through the API |
| Server functions | All 40 public functions: unauthenticated calls, cross-user access, boundaries, malformed ids, crafted cursors |
| Security | SSRF (19 URL variants), open redirect (5 variants), metadata/OG leak checks |
| Journeys | Create (all validation boundaries, photos), edit, detail, scaling, favorites, share, delete, cook mode (timers, keys, reload), import (link, text, photo), planner (add, move, drag, Magic fill, Shop week, undo), shopping list (all actions, Organize, undo), home search/pantry/filters/pagination, ⌘K, profile, navigation |
| Concurrency | Parallel batches at the list and meal caps, rate-limit boundaries, two-tab edits, stale checkbox state, double clicks everywhere |
| Failure modes | Offline, half-open socket, upload failure, oversized data, session revocation, sign-out in another tab |
| UI | 1440/1024/768/390/320 widths, light and dark, keyboard paths, axe-core on every route |

**Not covered:**
- real screen readers
- slow-3G throttling (agent-browser has none)
- production-build performance
- real phone devices
- voice control and wake lock
- the error boundaries themselves
- Gemini paths beyond one or two runs each, to limit cost

## Deploying

Everything has been pushed to the **dev** Convex deployment only. A production deploy (`npx convex deploy`, then Vercel) needs:
- **Index build:** the new `recipes.by_isPublic` index is built automatically by `convex deploy`.
- **Schema:** the new optional `recipes.updatedAt` field needs no migration.
- **Cron:** the new daily cron, "delete orphan uploads", runs at 03:30 UTC. On the first run it deletes uploads that have gone unused for more than 7 days.
- **Dependency:** the new `convex-helpers@0.1.113` is pinned for compatibility with convex 1.30. Newer versions require convex ≥1.32.

---

# QA report — 2026-10-05

A full QA pass over chef, covering two roles:
- **Host:** a recipe author who creates, imports, edits, publishes or unpublishes, and deletes recipes.
- **Guest:** someone who browses public recipes signed out, or signs in to favorite, plan, shop and cook from other people's recipes.

Five agents ran in parallel, one per area:
- Guest + cross-role (browser)
- Host (browser)
- security + backend (direct Convex calls as several identities)
- UI/responsive (1440 / 768 / 375 / 320, light and dark)
- adversarial (double submits, multiple tabs, offline, back/forward, XSS)

Everything ran against the **dev** Convex deployment (`hearty-kookabura-538`) and `next dev`.

## Summary

| | |
|---|---|
| Checks performed | ~260, approximate, counted from the agents' reports |
| Fixed in this branch | 2 P1, 21 P2, 11 P3 |
| Open | P3 items only, under [Open issues](#open-issues) |
| Blocked / not tested | Real emails and notifications (the app has none), payments (none), Gemini-heavy flows beyond one run each |

Overall health is good. The two P1s were both broken object-level authorization in Convex functions, and both are fixed. All four cross-role state transitions now behave correctly in the UI and the database:
- public → private
- private → public
- public → deleted
- a non-owner editing by URL

The regression suite is `pnpm test` (vitest + convex-test, 20 tests).

## Fixed

### P1
1. **Private recipes leaked through favorites.** `toggleFavorite` had no read check. `recipes.list({favoritesOnly})` returned whatever the favorite pointed at, so a recipe that went private, or any private recipe id, came back in full (title, ingredients, steps), with live updates. Both functions now use `canReadRecipe`, and unfavoriting always works. *Tests: `favorites never expose recipes the caller can't read`.*
2. **Anyone could delete anyone's recipe photo.** Every recipe query returns `storageId`, and `create`/`update`/`importRecipe.save` accepted any id. Attaching a victim's id to your own recipe and then deleting that recipe deleted the victim's image, and also locked the owner out of deleting theirs. Fixes:
   - An image now belongs to exactly one recipe (new `by_storageId` index).
   - Ids must be real `_storage` ids.
   - Files are deleted only when no other recipe uses them.

   *Tests: `recipe images belong to one recipe`.*

### P2
- **Delete cleanup.** Deleting a recipe left other users' favorites and meal plans pointing at nothing: blank planner cards, and slots that auto-fill skipped. Cleanup now runs in a background, batched internal mutation (`recipes.cleanupReferences`). It runs in the background because a first, synchronous version could be made to exceed Convex's read limit, which made a recipe undeletable. That was caught by the security agent before commit. Shopping items stay on the list but lose the recipe link.
- **Unbounded shopping lists.** One `addBatch` call could insert 8,000 rows. Past 32k rows the user could no longer read or clear their list. Limits now:
  - items must be non-empty and ≤ 300 characters
  - ≤ 200 items per batch
  - ≤ 1,000 items per list
  - ≤ 100 planned meals
- **Server-side validation.** Recipes now enforce trimmed non-empty title/ingredients/steps, length and count limits, cooking time 1–2880, calories 0–20000, a difficulty enum, and a short `format`. The limits are shared with the form (`RECIPE_LIMITS`). Profiles: bio ≤ 500 and an https avatar URL. Recipe photos must be images under 10 MB.
- **Import link filter.** It was bypassed by redirects, trailing dots (`localhost.`), `*.localhost`, the CGNAT / benchmark / `192.0.0.x` ranges, and hostnames that resolve to private addresses (`localtest.me`, `a.127.0.0.1.nip.io`). Every import fetch now runs in a Node action (`convex/safeFetch.ts`). It resolves DNS itself, refuses a host if *any* answer is a private or reserved IPv4/IPv6 address (including IPv4-mapped, NAT64 and 6to4), and connects only to the address it checked, which defeats DNS rebinding. Redirects are followed by hand and every hop is re-checked. Bodies are capped after decompression.
- **Import was an open fetch proxy.** The page fetch ran before any rate limit, and the photo copy on save had none. Every outbound import fetch now draws from a per-user quota first (20 per 10 minutes, `convex/rateLimit.ts`). Past it, the user sees the existing countdown, and a save still succeeds without the photo.
- **Unmetered Gemini on every save.** Each `recipes.create`, and each update that changes ingredients, scheduled a Gemini tagging call with no limit, so a script could burn the quota. Tagging is now capped at 30 per user per hour. Past that, the recipe saves untagged and pantry search falls back to plain-text matching; `ai:backfillIngredientKeys` can tag it later.
- **Users with no name.** `users.store` threw for Clerk users without a name, so they never got a profile row. It now falls back to the email prefix.
- **Custom avatars reverted.** They went back to the Clerk picture on every page load. They now stick.
- **Bad avatar host crashed the profile.** An avatar on a host not listed in `next.config` crashed that user's public profile page for every visitor. Avatars now render without the `next/image` host check, and the server requires https.
- **Malformed recipe ids.** `/recipe/abc`, `/recipe/abc/cook` and `/create?edit=abc` crashed. The getters now treat malformed ids as not found.
- **Public profiles.** They required sign-in even though every public recipe links to one. `/profile/:id` is now public, and `/profile/edit` stays protected.
- **Signed-out filters.** `/?favorites=true` and `/?myRecipes=true` showed every public recipe under an active filter chip. They now return nothing.
- **Editing someone else's recipe.** `/create?edit=<someone else's recipe>` showed an editable form and failed with "check your connection". It now shows "Can't edit this recipe", and server validation messages reach the toast.
- **Unsaved edits wiped.** Any live update to the recipe being edited (another tab, or background ingredient tagging) reset the form. The form now loads once.
- **Double-click duplicates.** Planning a meal, "Shop week", the shopping-list add box, and every Undo toast could run twice. A shared `useSingleFlight` / `once` helper now guards them.
- **Offline save.** Saving while offline hung on "Saving…" forever, because Convex queues mutations. It now says you're offline and keeps the form.
- **Unavailable planned meals.** A meal whose recipe went private rendered as a blank card, and Undo threw. It now reads "Recipe no longer available", and Undo explains the failure.
- **Cook mode scrolling.** Cook mode scrolled to reveal the site footer and 64px of tab-bar padding. It is now exactly one screen.
- **Long words.** Long unbreakable words overflowed the recipe page at 320px and the shopping list at any width.
- **Error pages.** There was no branded 404 and no root error boundary. Added `app/not-found.tsx` and `app/error.tsx`.
- **Corrupt photos.** A renamed text file was accepted as the recipe photo. The form now rejects files it can't decode.

### P3
- "Sign in to cook" now returns to cook mode after sign-in.
- Shopping-list items can't be linked to a recipe the user can't read.
- Meal slots are validated (day + breakfast/lunch/dinner), including slots the AI planner returns.
- Replacing a recipe photo deletes the old file.
- The cook-mode custom timer is capped at 24 hours. `1e308` used to show `Infinity:NaN:NaN`.
- Magic fill on a full week says so, instead of "Generated 0 meals!".
- Planner drag-and-drop drops where the pointer is, not where most of the card overlaps.
- The command palette says "1 item", not "1 items".
- `recipes.list({difficulty:"all"})` no longer returns nothing.
- Planner remove and move failures show a toast instead of an uncaught error.
- Whitespace-only titles and descriptions no longer pass the form.

## Open issues

These are recommended next steps, roughly in priority order.

1. **P3: orphan uploads.**
   - `generateUploadUrl` accepts any file type and size. Files are only checked when they are attached.
   - Abandoned uploads are never cleaned up.
   - `importRecipe.fromPhoto` accepts any `_storage` id. Today those ids are only discoverable for public images.
2. **P3: navigation guard.** Leaving a dirty create form through in-app links or browser Back loses it without asking. Only reload/close and Cancel are guarded.
3. **P3: `recipes.update` replaces everything.** Omitting optional fields unsets them. The app always sends every field, but the API is easy to misuse.
4. **P3: scaling.** `listAll`, `searchByIngredients`, `autoGenerate` and `getMealPlannerData` read whole tables and will hit Convex limits as data grows. The favorites page can come back short because filtering happens after pagination.
5. **P3: polish.**
   - generic `<title>` on create, planner, cook and profile pages
   - tap targets under 24px (footer links, planner ⋯, reorder handles)
   - the install drawer opens as a full-width sheet on desktop
   - focus goes to `<body>` after Escape closes the delete dialog
   - "Sign in" shows in the navbar on `/sign-in`
   - "add to shopping list" in ⌘K adds an item called "to shopping list"
   - OG images clip very long titles
   - Organize shows no progress on long lists (60–100s)
   - Undo of Organize also reverts later edits
   - `toggleBatch` flips rather than sets, so two stale tabs can cancel each other out
   - a timer running when its recipe is deleted mid-cook is lost

## Verified safe (no change needed)

- **Recipe read paths.** No public query returns another user's private recipe to a signed-in or signed-out caller: `get`, `getPublic`, `listPublic`, `listAll`, `searchByIngredients`, normal and search `list`, `getWeek`, `listWithDetails`, `suggestions`, and the OG image.
- **Profile data.** `users.get` exposes no email or token. `getMe` is owner-only.
- **Shopping-list ownership.** Another user's items are refused or skipped by every mutation.
- **Recipe ownership.** `recipes.update`/`remove` reject non-owners.
- **Internal functions.** Seed, devSeed and migration functions are all internal.
- **Concurrency.** Concurrent `autoGenerate`, `toggleFavorite` and `users.store` calls create no duplicates (mutations are serializable).
- **XSS.** `<img onerror>`, `<script>`, `<svg onload>`, `javascript:` and markdown links in every recipe field render as text everywhere, including the ⌘K palette, cook mode, the shopping list, meta tags and the OG image.
- **Route protection.** Protected routes redirect to sign-in and come back afterwards. Signing out in another tab redirects the open tab.
- **Layout.** No horizontal overflow on any route at 1440/768/375/320 after the fixes. Dark mode contrast passes, apart from two borderline cases at 4.3–4.4:1.

## Route inventory

| Route | Signed out | Signed in |
|---|---|---|
| `/`, `/about`, `/terms`, `/privacy`, `/sign-in`, `/sign-up` | ✅ public | ✅ |
| `/recipe/:id` | ✅ public recipes; "Recipe not found" for private/missing/malformed | ✅ own private recipes too |
| `/recipe/:id/cook` | → sign-in | ✅ (not found if unreadable) |
| `/profile/:userId` | ✅ public (was → sign-in) | ✅ |
| `/create`, `/create?edit=`, `/import`, `/meal-planner`, `/shopping-list`, `/profile/edit` | → sign-in, returns after | ✅ (edit: owner only) |
| `/pantry` | → sign-in | → `/` |
| unknown paths | → sign-in (deny by default) | branded 404 |
