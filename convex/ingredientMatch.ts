import { extractItemName } from "./categories";

/**
 * Pantry matching helpers.
 *
 * Matching is word-based (not substring-based) so "egg" no longer matches
 * "eggplant", and simple plurals are folded so "tomato" matches "tomatoes".
 * Recipes can also carry AI-generated canonical keys per ingredient line
 * (e.g. "200g spaghetti" -> ["spaghetti", "pasta"]) so broader pantry terms
 * like "pasta" still find the recipe.
 */

// Very small singularizer; it only needs to be consistent, since both the
// pantry term and the ingredient text go through it.
function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y"; // berries -> berry
  if (word.endsWith("oes")) return word.slice(0, -2); // tomatoes -> tomato
  if (/(ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2); // peaches -> peach
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1); // eggs -> egg
  return word;
}

export function toWords(text: string): string[] {
  return extractItemName(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(singularize);
}

function containsSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (needle.every((word, j) => haystack[i + j] === word)) return true;
  }
  return false;
}

/**
 * True when a pantry term (e.g. "olive oil") matches an ingredient line
 * ("2 tbsp extra virgin olive oil") or any of the line's canonical keys.
 */
export function pantryTermMatches(
  term: string,
  ingredientLine: string,
  keys: string[] = []
): boolean {
  const termWords = toWords(term);
  if (termWords.length === 0) return false;
  return [ingredientLine, ...keys].some((candidate) =>
    containsSequence(toWords(candidate), termWords)
  );
}
