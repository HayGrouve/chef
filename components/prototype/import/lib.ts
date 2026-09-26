// PROTOTYPE — Smart Import: shared types and helpers.
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel";
import type { RecipeDraft } from "@/convex/prototype/importRecipe";

export type SourceKind = "link" | "text" | "photo";

export type Row = { id: number; value: string };

export type Difficulty = "Easy" | "Medium" | "Hard";

/** The draft as the user edits it (numbers kept as strings while typing). */
export type EditableDraft = {
  title: string;
  description: string;
  ingredients: Row[];
  steps: Row[];
  cookingTime: string;
  calories: string;
  difficulty: Difficulty | "";
  tags: string[];
  isPublic: boolean;
};

export type ImageState =
  | { kind: "none" }
  | { kind: "remote"; url: string }
  /** Already in Convex storage (the photo the recipe was read from). */
  | { kind: "stored"; storageId: Id<"_storage">; previewUrl: string }
  | { kind: "file"; file: File; previewUrl: string };

export type ImportResult = {
  kind: SourceKind;
  draft: RecipeDraft;
  /** The photo that was read (photo imports only). */
  sourcePhoto?: { storageId: Id<"_storage">; previewUrl: string };
  /** Page the user was trying to import when they fell back to pasting text. */
  contextUrl?: string;
};

export type Editor = {
  result: ImportResult;
  form: EditableDraft;
  image: ImageState;
};

let nextRowId = 1;
export const newRow = (value = ""): Row => ({ id: nextRowId++, value });

export function toEditor(result: ImportResult): Editor {
  const { draft } = result;
  const rows = (list: string[]) => (list.length ? list.map((v) => newRow(v)) : [newRow()]);
  return {
    result,
    form: {
      title: draft.title,
      description: draft.description,
      ingredients: rows(draft.ingredients),
      steps: rows(draft.steps),
      cookingTime: draft.cookingTime ? String(draft.cookingTime) : "",
      calories: draft.calories ? String(draft.calories) : "",
      difficulty: draft.difficulty ?? "",
      tags: draft.tags,
      isPublic: false,
    },
    // A photo of a cookbook page or card shows text, not the dish, so it's
    // offered via the "Use this photo" switch instead of being used by default
    image: result.sourcePhoto
      ? { kind: "none" }
      : draft.imageUrl
        ? { kind: "remote", url: draft.imageUrl }
        : { kind: "none" },
  };
}

export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return "Something went wrong. Please try again.";
}

/** "Rate limit exceeded. Please wait 12 seconds." -> 12 */
export function rateLimitSeconds(message: string): number | null {
  const match = message.match(/Rate limit exceeded\. Please wait (\d+) seconds?/i);
  return match ? Number(match[1]) : null;
}

/** The link couldn't be read, but the text of the page could be pasted. */
export function suggestsPastingText(message: string): boolean {
  return /copy(ing)? the recipe text|paste the recipe text|No recipe found/i.test(message);
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function looksLikeUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

export const AI_COOLDOWN_MS = 30_000;

export const EXAMPLE_CAPTION = `🍋 15-MINUTE LEMON GARLIC SHRIMP PASTA 🍝 my go-to weeknight dinner when I can't be bothered (save this!!)

You'll need:
200g spaghetti
300g raw king prawns, peeled
3 garlic cloves, thinly sliced
2 tbsp butter + a glug of olive oil
zest & juice of 1 lemon
pinch of chilli flakes
big handful of parsley, chopped
salt + pepper
parmesan to serve

How to:
1️⃣ Cook the spaghetti in well salted water, save a mug of pasta water before draining
2️⃣ Meanwhile melt the butter with the oil, add garlic + chilli and sizzle 1 min (don't let it burn!)
3️⃣ Add prawns, 2 min each side till pink
4️⃣ Toss in the pasta, lemon zest + juice and a splash of pasta water till glossy
5️⃣ Parsley, parmesan, done ✨ serves 2

#pasta #shrimppasta #easydinner #15minutemeals #weeknightdinner`;

// --- Session persistence ------------------------------------------------------
// Phones often discard a backgrounded tab (e.g. while copying a caption from
// Instagram), so the inputs and the draft survive a reload for this tab.

const SESSION_KEY = "chef-proto-import";

export type SessionState = {
  tab: SourceKind;
  url: string;
  text: string;
  textContextUrl: string | null;
  editor: Editor | null;
};

export function saveSession(state: SessionState) {
  try {
    const editor = state.editor && {
      ...state.editor,
      // A picked-but-unsaved file can't be serialized
      image: state.editor.image.kind === "file" ? { kind: "none" as const } : state.editor.image,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...state, editor }));
  } catch {
    // Storage full or unavailable: persistence is best effort
  }
}

export function loadSession(): SessionState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as SessionState;
    if (state.editor) {
      // Row ids come from a module counter that restarted with the page
      const fresh = (rows: Row[]) => rows.map((r) => newRow(r.value));
      state.editor.form.ingredients = fresh(state.editor.form.ingredients);
      state.editor.form.steps = fresh(state.editor.form.steps);
    }
    return state;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
