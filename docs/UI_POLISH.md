# UI Polish & Declutter Log

Tracks the UI/UX decluttering pass. Goal: simpler UI, **no lost functionality**.
Numbers refer to the original audit list.

Status: ✅ done · ⏳ planned

## Round 1 — 2026-09-24

### App-wide

| # | Change | Status | Files |
|---|--------|--------|-------|
| 1 | Removed redundant "← Back to Home/Recipes" buttons on top-level pages (Shopping List, Meal Planner, Pantry). Kept on drill-down pages (recipe detail → "Back", profile, profile edit) and "Cancel" on the create/edit form. | ✅ | `app/shopping-list/page.tsx`, `app/meal-planner/page.tsx`, `app/pantry/page.tsx`, `app/recipe/[id]/RecipeDetailClient.tsx`, `app/create/page.tsx` |
| 2 | Added `sonner` toasts; replaced "OK" modal dialogs used for simple feedback (meal-planner success/info/error, share "link copied", create-page validation/save errors). | ✅ | `components/ui/sonner.tsx`, `app/layout.tsx`, pages above |
| 3 | Removed confirmation dialogs for reversible actions ("Add to shopping list", "Shop week"). Replaced with a toast offering **Undo**. Destructive confirmations (delete recipe, delete all items, clear meal plan) are kept. | ✅ | `app/recipe/[id]/RecipeDetailClient.tsx`, `app/meal-planner/page.tsx`, `convex/shoppingList.ts` (`addBatch` now returns inserted ids) |
| 4 | Replaced plain "Loading..." text with skeletons on the pages touched in this round (shopping list, recipe detail, profile recipes). Remaining pages were done in round 2. | ✅ | same |
| 5 | Footer shrunk to one line: © · About · Privacy · Terms · Install App. Fixed Privacy/Terms links, which pointed to `#`. | ✅ | `components/footer.tsx` |

### Home page

| # | Change | Status | Files |
|---|--------|--------|-------|
| 6 | One clear control: removed the sidebar "Clear all" and the "Active filters:" label. The chip row keeps a single "Clear all". Chips are simpler ("Easy", "≤ 30 min", "Favorites", tag name) and the X is a proper button. The mobile filter button shows a count instead of "Active". | ✅ | `app/page.tsx`, `components/RecipeFilters.tsx` |
| 7 | Search moved out of the filter panel into a persistent search bar above the grid, with a clear (X) button. The search chip was dropped because the search box shows the query. | ✅ | `app/page.tsx` |
| 8 | Mobile filters apply immediately, like desktop, and have "Reset" / "Done". Deleted `MobileFilterSheet`, which also fixes a bug where unsaved choices were wiped on every parent re-render. | ✅ | `app/page.tsx`, ~~`components/MobileFilterSheet.tsx`~~ |
| 9 | Recipe cards: image at the top, edge to edge. A quiet chef-hat placeholder replaces the "No Image"/"Image Error" text. Cooking time is shown next to the author. | ✅ | `components/RecipeCard.tsx`, `components/RecipeCardSkeleton.tsx` |
| 10 | Sign-up banner is slimmer and dismissible (remembered in `localStorage["signUpBannerDismissed"]`). | ✅ | `app/page.tsx` |
| — | Tag search box inside filters only appears when there are more than 8 tags. | ✅ | `components/RecipeFilters.tsx` |

### Recipe detail

| # | Change | Status | Files |
|---|--------|--------|-------|
| 11 | Edit and Delete moved into a "⋯" menu (owner only). Favorite and Share stay visible. Delete still asks for confirmation. | ✅ | `app/recipe/[id]/RecipeDetailClient.tsx` |
| 12 | Share icon now uses the theme's muted color instead of hard-coded blue. | ✅ | same |
| 13 | Show cooking time / difficulty / calories on the detail page (round 2). | ✅ | `app/recipe/[id]/RecipeDetailClient.tsx` |

### Shopping list

| # | Change | Status | Files |
|---|--------|--------|-------|
| 14 | "Clear checked" and "Delete all" moved into a "⋯" menu. The group-by toggle and "Organize" (AI, formerly "Magic Organizer") share one row, shown only when the list has items. The add button is icon-only. AI errors show as toasts. | ✅ | `app/shopping-list/page.tsx` |
| 15 | Removed the wrapping card and per-item borders; the list is now a divided list under small uppercase group headings. Delete icons show on hover on desktop and always on mobile. | ✅ | same |

### Meal planner

| # | Change | Status | Files |
|---|--------|--------|-------|
| 16 | Redesigned the 7×3 card grid (round 2). See below. | ✅ | `app/meal-planner/page.tsx` |
| 17 | Header shows "Magic Fill" and "Shop Week" (icon-only on mobile), plus "Clear meal plan" in a "⋯" menu. Removed the `order-*` shuffling. | ✅ | `app/meal-planner/page.tsx` |

### Create recipe

| # | Change | Status | Files |
|---|--------|--------|-------|
| 18 | Collapsed the 4-step wizard into a single scrolling form (round 2). See below. | ✅ | `app/create/page.tsx` |
| 19 | Moved `<title>` out of `StepIndicator`; it now reads "Edit Recipe" when editing. | ✅ | `app/create/page.tsx` |

### Shared components / cleanup

| Change | Status | Files |
|--------|--------|-------|
| New shared `RecipeCard` used by home and public profile (replaces two copies of the card and `RecipeImage`). | ✅ | `components/RecipeCard.tsx`, `app/page.tsx`, `app/profile/[userId]/page.tsx` |
| Removed stale planning comments in the profile page; tidied meal-planner imports. | ✅ | |

## Round 2 — 2026-09-24

| # | Change | Status | Files |
|---|--------|--------|-------|
| 4 | Skeleton or spinner loading states for the remaining pages: home Suspense fallback, profile header, profile edit, pantry matches, create/edit loading, meal planner, cook mode. | ✅ | `app/page.tsx`, `app/profile/[userId]/page.tsx`, `app/profile/edit/page.tsx`, `app/pantry/page.tsx`, `app/create/page.tsx`, `app/meal-planner/page.tsx`, `app/recipe/[id]/cook/page.tsx` |
| 13 | Recipe detail shows a meta row (⏱ time · difficulty · 🔥 kcal) under the description when those fields exist. | ✅ | `app/recipe/[id]/RecipeDetailClient.tsx` |
| 16 | **Meal planner redesign.** Desktop: one bordered table with a row per day and Breakfast/Lunch/Dinner columns; today is highlighted; meals are compact chips (thumbnail + title, remove X on hover); empty slots show a dashed "+ Add". Mobile: Mon–Sun day tabs (a dot marks days with meals, defaults to today) showing one day's 3 slots. **Drag-and-drop kept**: drag between slots on desktop; on mobile, drag within a day or drop onto a day tab to move the meal to that day (same meal type). A 6px drag threshold means tapping the recipe title still navigates. Only one layout is mounted at a time (`useSyncExternalStore` media query), so drop-target ids stay unique. | ✅ | `app/meal-planner/page.tsx` |
| 18 | **Single-page create/edit form.** Details, Ingredients and Instructions are stacked sections with one sticky Save/Cancel bar (placed above the mobile tab bar). The Review step was dropped because the whole recipe is visible on the page. Validation runs on save; blank ingredient/step rows are removed first so a stray Enter doesn't block saving; a missing image shows a toast and scrolls to the image field. Validation mode changed from `onChange` to `onTouched` so errors don't appear while typing. Removed the duplicate "Add ingredient" header button (one add button per list plus a hint). Removed the auto-focus on the last list row, which would have stolen focus from Title on a single page. | ✅ | `app/create/page.tsx` |
| — | Mobile tab bar now matches desktop order and names: Recipes · Planner · Add · Shopping · Pantry. Pantry uses a refrigerator icon (desktop too) instead of a search icon. Removed a leftover comment block. | ✅ | `components/mobile-nav.tsx`, `components/navbar.tsx` |
| — | Cook mode: the timer was rendered twice (separate state for desktop and mobile). Now one compact timer in the header, with the progress bar as a thin strip under the header on all sizes. | ✅ | `app/recipe/[id]/cook/page.tsx` |
| — | Fixed recipe page `<title>`, which read "X \| CHEF \| CHEF" because the layout template already adds " \| CHEF". | ✅ | `app/recipe/[id]/page.tsx` |

## Round 3 — 2026-09-24 (feedback on #18)

Feedback: the single-page form felt like "a lot of controls in a vertical stack". The wizard existed to let people do a few things at a time. Kept the single page (no hidden steps, everything editable at once) but brought back the step-by-step feel:

| Change | Status | Files |
|--------|--------|-------|
| The form is split into **5 numbered section cards**: 1 Basics (title, description) · 2 Photo · 3 Ingredients · 4 Instructions · 5 Extras. Each card has a one-line hint, and its number turns into a ✓ once that section is complete (it updates live as you type). | ✅ | `app/create/page.tsx` (`FormSection`, `StatusBadge`) |
| Optional fields (time, calories, difficulty, tags, public/private) are grouped in **Extras**, collapsed by default and showing a summary line (e.g. "30 min · Easy · 2 tags · Public"). It opens automatically if saving fails on one of its fields. | ✅ | same (`ExtrasFields`) |
| **Progress sidebar** on large screens: "N of 4 required", a progress bar, and the section list with status. Clicking an item scrolls to that section. | ✅ | same (`SectionNav`) |
| The old `DetailsSection` is split into `BasicsFields`, `PhotoField` and `ExtrasFields`. The photo drop zone now lists accepted formats and size. | ✅ | same |
| Fixed a hydration mismatch: the sortable ingredient/step lists now render on first load, and dnd-kit's generated aria ids differed between server and client. `DndContext` now gets a stable `useId()`. | ✅ | same (`ListSection`) |

## Round 4 — 2026-09-24 (AI model + pantry matching)

| Change | Status | Files |
|--------|--------|-------|
| All Gemini calls now use **`gemini-3.8-flash`** (GA) instead of `gemini-3-flash-preview`. The duplicated `fetch` code is replaced by one helper with a single `GEMINI_MODEL` constant. | ✅ | `convex/gemini.ts`, `convex/ai.ts` |
| **Pantry matching fixed (deterministic).** The old substring match (`"eggplant".includes("egg")`) is replaced by whole-word matching after removing quantities and units and folding simple plurals: "egg" ≠ eggplant, "rice" ≠ licorice, "tomato" = tomatoes, "olive oil" matches "extra virgin olive oil". | ✅ | `convex/ingredientMatch.ts`, `convex/recipes.ts` (`searchByIngredients`) |
| **Pantry matching, AI-assisted at save time.** When a recipe is created, or its ingredients change, a background action asks Gemini for canonical names per ingredient line ("200g spaghetti" → `spaghetti, pasta`) and stores them in `recipes.ingredientKeys`. Pantry search matches against these too, so "pasta" finds spaghetti recipes. Search itself never calls AI, so it stays instant and free. Output is validated (same number of lines, strings only, at most 5 keys per line), and stale keys are cleared when ingredients are edited. If Gemini fails, the word matcher still works. | ✅ | `convex/ai.ts` (`tagRecipeIngredients`, `saveIngredientKeys`), `convex/schema.ts`, `convex/recipes.ts`, `convex/seed.ts` |
| Backfill for existing recipes: `npx convex run ai:backfillIngredientKeys` | ⏳ run after deploying Convex functions | `convex/ai.ts` |

## Backlog

All items from the original audit are done. Ideas for a future round:

- After editing a recipe, return to that recipe's page instead of home.
- Meal planner: show which week/dates the day names refer to (the data model stores day names only).

## Notes

- Convex backend changes need a deploy (`npx convex deploy`, or `npx convex dev` for the dev deployment): `addBatch` returns ids (for Undo), the new `recipes.ingredientKeys` field, the ingredient tagging actions, and the Gemini 3.8 Flash switch. After deploying, run `npx convex run ai:backfillIngredientKeys` once.
- `convex/shoppingList.ts` changed (`addBatch` returns ids). Until Convex functions are redeployed, Undo is simply hidden, so nothing breaks.
- `sonner` was added with pnpm; `package-lock.json` was not updated.
- Verification: `tsc --noEmit` is clean, `next build` succeeds for all routes, and ESLint shows no new issues compared with `HEAD` (two old ones fixed). Signed-in pages (shopping list, meal planner, create, cook) were checked by type-check and build only, because the preview browser wasn't logged in.
