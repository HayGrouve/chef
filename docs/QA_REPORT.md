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
| Fixed in this branch | 2 P1, 19 P2, 11 P3 |
| Open | 2 P2 and the P3 items under [Open issues](#open-issues) |
| Blocked / not tested | Real emails and notifications (the app has none), payments (none), Gemini-heavy flows beyond one run each |

Overall health is good. The two P1s were both broken object-level authorization in Convex functions, and both are fixed. All four cross-role state transitions now behave correctly in the UI and the database:
- public → private
- private → public
- public → deleted
- a non-owner editing by URL

The regression suite is `pnpm test` (vitest + convex-test, 16 tests).

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
- **Import link filter.** It was bypassed by redirects, trailing dots (`localhost.`), `*.localhost`, and the CGNAT / benchmark / `192.0.0.x` ranges. Redirects are now followed by hand and every hop is re-checked.
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

1. **P2: unmetered Gemini on every create/update.** Each `recipes.create` (and each update that changes ingredients) schedules `ai.tagRecipeIngredients` with no rate limit, so a script can burn the Gemini quota. Fix: rate-limit tagging per user, or batch it.
2. **P2: import is an unthrottled fetch proxy, and DNS rebinding isn't caught.** The page fetch runs before the rate limit. Hostnames that resolve to private IPs (e.g. `localtest.me`) pass, because the Convex runtime has no DNS lookup. Impact is limited by Convex's network. Fix: rate-limit before fetching, and move the fetch to a `"use node"` action that resolves and checks IPs.
3. **P3: orphan uploads.**
   - `generateUploadUrl` accepts any file type and size. Files are only checked when they are attached.
   - Abandoned uploads are never cleaned up.
   - `importRecipe.fromPhoto` accepts any `_storage` id. Today those ids are only discoverable for public images.
4. **P3: navigation guard.** Leaving a dirty create form through in-app links or browser Back loses it without asking. Only reload/close and Cancel are guarded.
5. **P3: `recipes.update` replaces everything.** Omitting optional fields unsets them. The app always sends every field, but the API is easy to misuse.
6. **P3: scaling.** `listAll`, `searchByIngredients`, `autoGenerate` and `getMealPlannerData` read whole tables and will hit Convex limits as data grows. The favorites page can come back short because filtering happens after pagination.
7. **P3: polish.**
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
