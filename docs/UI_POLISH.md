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

## Round 5 — 2026-09-24 (combine duplicate shopping items)

| Change | Status | Files |
|--------|--------|-------|
| **Organize now combines duplicates.** Gemini returns groups (`ids`, combined `ingredient`, `category`) instead of one row per item, adding up quantities ("1 egg" ×3 + "4 eggs" ×2 + "6 eggs" ×2 + "3 eggs" → "26 eggs"), converting compatible units, and keeping incompatible ones side by side ("2 cups + 200 g flour"). Each group keeps one item and deletes the rest. | ✅ | `convex/ai.ts` (`organizeShoppingList`, `applyOrganizedShoppingList`) |
| Safety checks: the list is read on the server (the client no longer sends it); unknown or made-up ids are dropped; each item is used at most once; only the user's own items are touched; checked and unchecked items are never merged; items Gemini leaves out stay unchanged. A combined item from several recipes shows under "General Items" in the By recipe view. | ✅ | same |
| **Undo** in the result toast restores names/aisles and recreates any items that were merged away. | ✅ | `convex/ai.ts` (`restoreShoppingListItems`), `app/shopping-list/page.tsx` |

## Round 6 — 2026-09-28 (import, command palette, new cook mode)

These three were chosen from the product-exploration prototypes (draft PR #5). The Today hub prototype was dropped.

| Change | Status | Files |
|--------|--------|-------|
| **Recipe import** at `/import`. Paste a link, paste text (a message or social caption), or take a photo of a cookbook page or card. Links are read from the page's schema.org recipe data when it has it (exact, no AI); otherwise Gemini extracts the recipe. You review an editable draft in numbered sections, with a banner saying where it came from ("from the page's recipe data" vs "extracted by AI, double-check"), then save. The photo is optional, and a photographed card is only used as the recipe image if you switch that on. Sites that block server fetches (e.g. Allrecipes) show a one-click "Paste the text instead". Reached from a "Import from a link or photo" button on `/create` and from the palette. | ✅ | `app/import/page.tsx`, `components/import/*`, `convex/importRecipe.ts`, `convex/gemini.ts` (`generateJsonFromParts`), `app/create/page.tsx` |
| **Command palette** (⌘K / Ctrl+K) for signed-in users. It suggests today's planned meals and your recent recipes. Search a recipe, then open it, cook it, **Plan it** (day × meal, with occupied slots shown), add its ingredients to the list, or favorite it. `add 2 lemons` adds a list item. Every action has Undo. Navbar trigger: a compact pill on wide screens, a search icon on phones, hidden at mid widths where the centered links need the room. | ✅ | `components/command-palette/*`, `convex/commandPalette.ts`, `app/layout.tsx`, `components/navbar.tsx` |
| **New cook mode** replaces `/recipe/[id]/cook`: <ul><li>An optional "Get ready" overview, then one step at a time in large type.</li><li>"You'll need" shows that step's ingredients, scaled (½×–3×).</li><li>Durations in the text are tap-to-start **named timers**; several can run at once, and they persist across reloads.</li><li>Voice next/back/repeat/timer (Chromium).</li><li>The wake lock is requested again when you return to the tab.</li><li>Progress is saved per recipe.</li></ul>Per feedback, **no left or right panels**: the full ingredient list is in the Ingredients sheet, jumping to a step is a menu under "Step N of M" in the header, and timers are a row under the header. | ✅ | `components/cook/*`, `app/recipe/[id]/cook/*`, `lib/recipe-text.ts` |
| **Privacy fixes.** `recipes.get` returned private recipes to anyone with the id; it now returns them only to their owner. `users.get` returned the whole user document, including email and `tokenIdentifier`; it now returns public profile fields only. `mealPlans.add` rejects recipes you can't read, and planned meals, shopping items and palette suggestions no longer show the title of a recipe you can't read. The shared check is `canReadRecipe`. | ✅ | `convex/access.ts`, `convex/recipes.ts`, `convex/users.ts`, `convex/mealPlans.ts`, `convex/shoppingList.ts`, `convex/commandPalette.ts` |
| **Cook mode finish screen**: brings back the recipe photo with a "Completed!" overlay (a chef-hat placeholder when there's no photo) and larger buttons. The small buttons came from `flex-1` in a stacked mobile layout, which gives each button a zero base height. They're now full width when stacked and share the row on wider screens. | ✅ | `components/cook/CookMode.tsx` |
| `seed:seedDatabase` and `migrations:backfillSearchText` were **public** mutations, so anyone could insert demo recipes or run the migration on production. Both are now internal (still runnable with `npx convex run`). | ✅ | `convex/seed.ts`, `convex/migrations.ts` |
| Test data: `convex/devSeed.ts` seeds a Clerk **test** user only (refuses real accounts). | ✅ | `convex/devSeed.ts` |

## Round 7 — 2026-09-28 (recipe detail header)

| Change | Status | Files |
|--------|--------|-------|
| On phones the header was squeezed into a narrow column, because the title, author, description, meta and tags all sat beside the favorite/share/⋯ icons, leaving empty space under them. Now only the title shares a row with the icons, and everything else spans the full width. The description is clamped to 3 lines, with "Show more" appearing only when it is actually cut off. The card has less side padding on mobile (`px-4 sm:px-6`) and a smaller title (`text-2xl sm:text-3xl`). | ✅ | `app/recipe/[id]/RecipeDetailClient.tsx` |

## Round 8 — 2026-09-30 (navbar actions)

| Change | Status | Files |
|--------|--------|-------|
| The right side of the navbar had controls of four sizes (36/32/32/28px), and the ⌘K pill showed only an icon plus keys. Now every control is 36px. The palette trigger looks like a search field ("Search recipes…" plus the shortcut) and sits next to the logo, because it didn't fit beside the centered nav. The header is a 3-column grid, so the centered nav can't overlap either side. The theme toggle is a quiet ghost icon placed next to the avatar. Between `md` and `lg`, "Add Recipe" is icon-only and nav links don't wrap. The auth-loading "Loading..." text is now an avatar skeleton. `Link`-wrapped buttons now use `asChild`, which removes the invalid `<a><button>` nesting. | ✅ | `components/navbar.tsx`, `components/command-palette/CommandPaletteTrigger.tsx`, `components/ui/mode-toggle.tsx` |

## Round 9 — 2026-10-01 (Cookbook redesign)

Three design directions were prototyped (Workspace, Cookbook, Spaces; draft PR #14). The user chose **Cookbook**, now applied to the whole app. The prototype code was not merged.

| Change | Status | Files |
|--------|--------|-------|
| **Look.** Monochrome with one tomato red (`oklch(0.56 0.2 30)`, AA with white text; brighter in dark mode). Bricolage Grotesque headings (`font-display` utility), Geist body text. Shape rule: buttons are pills, containers 12px (`--radius: 0.75rem`), inputs slightly less. Red/orange/yellow one-offs (like buttons, Magic Fill icon, planner favorites, share image) now use the accent. | ✅ | `app/globals.css`, `app/layout.tsx`, `components/ui/button.tsx`, `components/ui/like-button.tsx`, `app/recipe/[id]/opengraph-image.tsx` |
| **Geist was never applied.** The font variables were on `<body>` but Tailwind reads `--font-sans` on `<html>`, so the app rendered in the system font. They now sit on `<html>`. | ✅ | `app/layout.tsx` |
| **Three sections: Cook, Plan, Shop.** Header: `chef.` wordmark, a segmented Cook/Plan/Shop control (Shop shows the list count), search (opens ⌘K), "Add recipe" menu (write it / import), theme, avatar. Phones: a 3-tab bar; Add is the + in the header. | ✅ | `components/navbar.tsx`, `components/mobile-nav.tsx` |
| **Pantry folded into the Cook search.** Typing ingredients separated by commas ("eggs, feta") runs the pantry match (you have X of Y, what's missing). `/pantry` redirects to `/`; the ⌘K "What can I make?" entry goes there too. | ✅ | `app/page.tsx`, `app/pantry/page.tsx`, `components/command-palette/CommandPalette.tsx` |
| **Cook home.** "What are we cooking?" search, a feature card (tonight's planned dinner, else the newest recipe with a photo), shelves (Quick weeknights, Your recipes, Favorites, top two tags; only shown with 3+ recipes), then All recipes with Load more. "See all" on a shelf applies that filter. Every existing filter is kept (difficulty, max time, favorites, my recipes, tags) in a Filters sheet with active chips and Clear all, and still synced to the URL. Sign-up banner and install prompt are unchanged. | ✅ | `app/page.tsx` |
| **Recipe cards** are portrait photo tiles with the title underneath, plus the like button. Used on home and public profiles. | ✅ | `components/RecipeCard.tsx`, `components/RecipeCardSkeleton.tsx`, `app/profile/[userId]/page.tsx` |
| **Recipe page**, magazine style: big title, description (still clamped to 3 lines), author, actions (Start cooking, Add to list with Undo, favorite, share, ⋯ edit/delete with confirmation), wide photo, a facts row (time, difficulty, kcal per serving, steps), sticky ingredients with **½×–3× scaling** (Add to list uses the scaled amounts), numbered method, and tags that link to a filtered Cook. | ✅ | `app/recipe/[id]/RecipeDetailClient.tsx` |
| Plan, Shop, Create, Import, Profile and About use the display headings and the same top spacing. Clerk sign-in and the account menu drop their hard-coded orange theme and follow the app tokens (so they work in dark mode too). | ✅ | `app/meal-planner/page.tsx`, `app/shopping-list/page.tsx`, `app/create/page.tsx`, `components/import/SmartImport.tsx`, `app/about/page.tsx`, `app/ConvexClientProvider.tsx` |
| Removed the unused palette triggers (the header has a search button now). | ✅ | ~~`components/command-palette/CommandPaletteTrigger.tsx`~~ |
| Test data: `scripts/attach-demo-photos.sh` uploads real dish photos (Wikimedia Commons) to the seeded test recipes on dev, via test-user-only helpers in `convex/devSeed.ts`. | ✅ | `scripts/attach-demo-photos.sh`, `convex/devSeed.ts` |

## Round 10 — 2026-10-05 (Web Interface Guidelines)

An audit of `app/` and `components/` (excluding the shadcn primitives in `components/ui`) against the Vercel Web Interface Guidelines, then fixes.

| Change | Status | Files |
|--------|--------|-------|
| **Keyboard and screen readers.** Skip link plus a single `<main id="main">` in the layout. The create photo picker and meal-selector rows were `<div onClick>` and are now buttons. Icon-only controls have names (mobile Magic fill/Shop week, Paste, tag remove, row delete and reorder handles). Filter and import labels are tied to their Select/Slider (slider thumbs now take `aria-label`/`aria-labelledby`), and tag groups use `fieldset`/`legend`. The week grid is a real `<table>` with row and column headers. Cook Mode announces step changes; the import "working" status is one stable live region. | ✅ | `app/layout.tsx`, `app/create/page.tsx`, `components/meal-planner/MealSelector.tsx`, `app/meal-planner/page.tsx`, `components/RecipeFilters.tsx`, `components/ui/slider.tsx`, `components/import/*`, `components/cook/CookMode.tsx` |
| **Meal planner without dragging.** The drag handle no longer wraps the recipe link (pointer drags start anywhere on the card; keyboard drags start from the thumbnail button). Each meal has a ⋯ menu with "Move to" a day and Remove. | ✅ | `app/meal-planner/page.tsx` |
| **Undo instead of instant loss.** Removing a planned meal, removing a shopping item and "Clear checked" now show an Undo toast (shopping items come back through `ai.restoreShoppingListItems`). Leaving the create form with unsaved changes asks first, and reload/close triggers `beforeunload`. | ✅ | `app/meal-planner/page.tsx`, `app/shopping-list/page.tsx`, `app/create/page.tsx` |
| **Forms.** Import submit buttons stay enabled and explain an empty field inline. Review-step errors focus the first bad field and are linked with `aria-describedby`. Autofocus only happens with a mouse (`hasFinePointer`), so phones don't pop the keyboard. Inputs get `name`/`autoComplete`/`spellCheck`/`inputMode`, and placeholders and loading text use `…`. | ✅ | `components/import/SourceStep.tsx`, `components/import/ReviewStep.tsx`, `app/create/page.tsx`, `app/profile/edit/page.tsx`, `app/shopping-list/page.tsx` |
| **Motion and layout.** Confetti, pulse, ping and zoom respect reduced motion. Global `scroll-padding` keeps focused fields clear of the sticky header, tab bar and save bars (`data-sticky-actions`). `touch-action: manipulation`. Per-scheme `theme-color`. Popover and sheet widths no longer overflow phones; sheets get `overscroll-contain`. | ✅ | `app/globals.css`, `app/layout.tsx`, `components/cook/*`, `app/page.tsx` |
| **State and copy.** Recipe scale is in the URL (`?scale=2`). Pluralization (`pluralize`), non-breaking spaces in `20 min`/`5 MB`, curly apostrophes, sentence case for stragglers, error toasts that say what to do next, and a fallback for Back when there's no history. | ✅ | `lib/utils.ts`, `app/recipe/[id]/RecipeDetailClient.tsx`, many |

Not done: day abbreviations in the planner still use English `slice(0, 3)`, because the stored day keys are English and locale-formatting only the short names would mix languages and risk hydration mismatches.

## Round 11 — 2026-10-05 (QA audit)

A full Guest/Host QA pass. The complete findings, including the security fixes, are in [QA_REPORT.md](QA_REPORT.md). UI-facing changes:

| Change | Status | Files |
|--------|--------|-------|
| **Clear dead ends.** Branded 404 and root error pages. Meals whose recipe went private read "Recipe no longer available". `/create?edit=` for a recipe you don't own says so instead of showing a form. Public profiles open while signed out. "Sign in to cook" returns to cook mode. | ✅ | `app/not-found.tsx`, `app/error.tsx`, `app/meal-planner/page.tsx`, `app/create/page.tsx`, `middleware.ts`, `app/recipe/[id]/RecipeDetailClient.tsx` |
| **No accidental duplicates or lost work.** Planning a meal, Shop week, adding a list item and every Undo are single-flight (`hooks/use-single-flight.ts`). The edit form no longer resets on live updates. Saving offline explains itself. Undecodable photos are rejected. Server validation messages reach the toast. | ✅ | `app/meal-planner/page.tsx`, `app/shopping-list/page.tsx`, `app/create/page.tsx`, `app/profile/edit/page.tsx` |
| **Layout.** Cook mode is exactly one screen (no footer, no tab-bar padding). Long unbreakable words wrap on the recipe page and the shopping list. Planner drops go where the pointer is. | ✅ | `components/footer.tsx`, `app/layout.tsx`, `components/cook/CookMode.tsx`, `app/recipe/[id]/RecipeDetailClient.tsx`, `app/shopping-list/page.tsx` |

## Backlog

All items from the original audit are done. Ideas for a future round:

- After editing a recipe, return to that recipe's page instead of home.
- Meal planner: show which week/dates the day names refer to (the data model stores day names only).
- Meal types are now normalized to lowercase by the server (Round 11); existing dev and prod rows were already lowercase.
- Shelves are built from the first page of recipes (24). With a large library, "Your recipes" or "Favorites" may look short until "See all" (which queries the server).

## Notes

- Round 11 adds indexes (`recipes.by_storageId`, `by_recipe` on favorites/mealPlans/shoppingList); `npx convex deploy` builds them. Run `pnpm test` for the Convex regression suite.

- Convex backend changes need a deploy (`npx convex deploy`, or `npx convex dev` for the dev deployment): `addBatch` returns ids (for Undo), the new `recipes.ingredientKeys` field, the ingredient tagging actions, and the Gemini 3.8 Flash switch. After deploying, run `npx convex run ai:backfillIngredientKeys` once.
- `convex/shoppingList.ts` changed (`addBatch` returns ids). Until Convex functions are redeployed, Undo is simply hidden, so nothing breaks.
- `sonner` was added with pnpm; `package-lock.json` was not updated.
- Verification: `tsc --noEmit` is clean, `next build` succeeds for all routes, and ESLint shows no new issues compared with `HEAD` (two old ones fixed). Signed-in pages (shopping list, meal planner, create, cook) were checked by type-check and build only, because the preview browser wasn't logged in.
