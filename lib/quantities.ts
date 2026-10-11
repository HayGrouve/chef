// Ingredient amounts: finding them in free-text lines, scaling them and
// converting cups, spoons, ounces and pounds to grams and millilitres.
//
// When a recipe is saved, Gemini marks the amounts in each line
// (convex/ai.ts → `ingredientAmounts`). It knows things a regex can't: that
// "(400g)" after a can is the can's size, that a cup of flour weighs ~120 g,
// and how "скилидка" inflects. Lines it hasn't marked yet, or marked
// inconsistently, fall back to `parseAmounts` below. Either way the scaling
// itself happens here, instantly and offline.

export type UnitSystem = "original" | "metric";

export type Split = "any" | "half" | "whole";

export type Amount = {
  /** Exact text in the line: the number plus its unit or counted word, e.g. "1½ cups", "250 г", "2 onions" */
  text: string;
  value: number;
  /** Upper end of a range ("2-3") */
  max?: number;
  /** The unit or counted word inside `text`, and its singular and plural forms */
  unit?: string;
  one?: string;
  other?: string;
  /** How finely the amount divides: flour any, onions in halves, eggs whole */
  split?: Split;
  /** Doesn't change with the recipe size, e.g. the can size in "1 can (400g)" */
  fixed?: boolean;
  /** Metric equivalent of `value`, for cups, spoons, ounces, pounds */
  metric?: { value: number; unit: "g" | "ml" };
  /** Repeats the previous amount in other units, e.g. "(360mL)"; `text` includes the brackets */
  restates?: boolean;
};

// --- Units --------------------------------------------------------------------

type UnitInfo = {
  /** Already metric: the base unit and how many of it one of these is */
  base?: { unit: "g" | "ml"; factor: number };
  /** Converts to metric (a volume, so ml; Gemini gives grams where it knows the density) */
  metric?: { unit: "g" | "ml"; factor: number };
  split?: Split;
  forms?: [string, string];
};

// "one/other|variant|…"
function unitWords(spec: string, info: Omit<UnitInfo, "forms">): [string, UnitInfo][] {
  return spec.split("|").flatMap((variant) => {
    const [one, other] = variant.split("/");
    const forms: [string, string] | undefined = other ? [one, other] : undefined;
    return (other ? [one, other] : [one]).map((word): [string, UnitInfo] => [word, { ...info, forms }]);
  });
}

const UNIT_TABLE: [string, UnitInfo][] = [
  ...unitWords("g|gr|gram/grams|г|гр|грам/грама", { base: { unit: "g", factor: 1 } }),
  ...unitWords("kg|kgs|kilo/kilos|kilogram/kilograms|кг|килограм/килограма", {
    base: { unit: "g", factor: 1000 },
  }),
  ...unitWords("ml|milliliter/milliliters|millilitre/millilitres|мл|милилитър/милилитра", {
    base: { unit: "ml", factor: 1 },
  }),
  ...unitWords("l|liter/liters|litre/litres|л|литър/литра", { base: { unit: "ml", factor: 1000 } }),
  ...unitWords(
    "tsp|tsps|teaspoon/teaspoons|ч.л.|ч.л|ч. л.|чаена лъжица/чаени лъжици|чаена лъжичка/чаени лъжички|кафена лъжичка/кафени лъжички",
    { metric: { unit: "ml", factor: 5 } }
  ),
  ...unitWords("tbsp|tbsps|tbs|tablespoon/tablespoons|с.л.|с.л|с. л.|супена лъжица/супени лъжици", {
    metric: { unit: "ml", factor: 15 },
  }),
  ...unitWords("cup/cups", { metric: { unit: "ml", factor: 240 } }),
  // A Bulgarian tea cup ("чаена чаша") is smaller than a US cup
  ...unitWords("ч.ч.|ч.ч|ч. ч.|чаена чаша/чаени чаши|чаша/чаши", { metric: { unit: "ml", factor: 200 } }),
  ...unitWords("fl oz|fl. oz.|fluid ounce/fluid ounces", { metric: { unit: "ml", factor: 29.57 } }),
  ...unitWords("oz|ounce/ounces", { metric: { unit: "g", factor: 28.35 } }),
  ...unitWords("lb|lbs|pound/pounds", { metric: { unit: "g", factor: 453.6 } }),
  ...unitWords("pint/pints", { metric: { unit: "ml", factor: 473 } }),
  ...unitWords("quart/quarts", { metric: { unit: "ml", factor: 946 } }),
  ...unitWords(
    "clove/cloves|скилидка/скилидки|бр.|бр|брой/броя|egg/eggs|яйце/яйца|pack/packs|packet/packets|package/packages|sachet/sachets|пакет/пакета|пакетче/пакетчета|bay leaf/bay leaves|лист/листа|зърно/зърна|slice/slices|филия/филии|scoop/scoops|sprig/sprigs|стрък/стръка|stalk/stalks|rib/ribs|pinch/pinches|щипка/щипки|piece/pieces|парче/парчета|fillet/fillets|гнездо/гнезда|handful/handfuls|шепа/шепи",
    { split: "whole" }
  ),
  ...unitWords(
    "can/cans|tin/tins|кутия/кутии|консерва/консерви|jar/jars|буркан/буркана|бурканче/бурканчета|bottle/bottles|бутилка/бутилки|head/heads|глава/глави|bunch/bunches|връзка/връзки",
    { split: "half" }
  ),
];

const UNITS = new Map(UNIT_TABLE.map(([word, info]) => [word.toLowerCase(), info]));

function unitInfo(unit: string | undefined): UnitInfo | undefined {
  return unit ? UNITS.get(unit.toLowerCase()) : undefined;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Longest first, so "чаена чаша" wins over "чаша" and "листа" over "лист"
const UNIT_PATTERN = [...UNITS.keys()]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegex)
  .join("|");

// --- Numbers ------------------------------------------------------------------

const FRACTIONS: Record<string, number> = {
  "⅛": 1 / 8, "¼": 1 / 4, "⅓": 1 / 3, "½": 1 / 2, "⅔": 2 / 3, "¾": 3 / 4,
};

// "1 1/2", "1/2", "1½", "½", "1.5", "1,5"
const NUMBER = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d*[⅛¼⅓½⅔¾]|\d+(?:[.,]\d+)?`;
const RANGE_SEPARATOR = String.raw`\s*(?:-|–|—|\bto\b|до)\s*`;
// A number (or range) not glued to a word before it, and not a percentage or temperature
const NUMBER_RANGE = String.raw`(?<![\p{L}\p{N}.,/])(${NUMBER})(?:(${RANGE_SEPARATOR})(${NUMBER}))?(?![\p{N}%°])`;

const NUMBER_RANGE_RE = new RegExp(NUMBER_RANGE, "u");
const AMOUNT_RE = new RegExp(
  String.raw`${NUMBER_RANGE}(?:\s*(?:an?\s+)?(${UNIT_PATTERN})(?![\p{L}\p{N}]))?`,
  "giu"
);

function parseNumber(text: string): number {
  const t = text.trim().replace(",", ".");
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = t.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const unicode = t.match(/^(\d*)([⅛¼⅓½⅔¾])$/);
  if (unicode) return Number(unicode[1] || 0) + FRACTIONS[unicode[2]];
  return Number(t);
}

/** The first number or range in `text`, as written and as values. */
function findNumber(text: string) {
  const m = text.match(NUMBER_RANGE_RE);
  if (!m || m.index === undefined) return null;
  const low = parseNumber(m[1]);
  const high = m[3] === undefined ? undefined : parseNumber(m[3]);
  if (!Number.isFinite(low) || (high !== undefined && !Number.isFinite(high))) return null;
  return { index: m.index, length: m[0].length, low, high, separator: m[2] ?? "-" };
}

// --- Parsing (regex fallback) -----------------------------------------------------

const isMeasure = (info: UnitInfo | undefined) => !!(info?.base || info?.metric);

/** How many "(" are still open at `index`. */
function parenDepth(line: string, index: number) {
  let depth = 0;
  for (let i = 0; i < index; i++) {
    if (line[i] === "(") depth++;
    else if (line[i] === ")") depth = Math.max(0, depth - 1);
  }
  return depth;
}

/**
 * Finds the amounts in an ingredient line with no outside help:
 * "кайма - 250 г + 1 - 2 с.л. ориз" → "250 г" and "1 - 2 с.л.".
 * Bracketed amounts are treated as a restatement when they follow a measured
 * amount ("1½ cups (360mL)"), and as a fixed size otherwise ("1 can (400g)").
 */
export function parseAmounts(line: string): Amount[] {
  const amounts: Amount[] = [];
  let previousEnd = -1;
  for (const m of line.matchAll(AMOUNT_RE)) {
    const index = m.index ?? 0;
    const value = parseNumber(m[1]);
    const max = m[3] === undefined ? undefined : parseNumber(m[3]);
    if (!(value > 0) || (max !== undefined && !(max > value))) continue;
    const unit = m[4];
    const info = unitInfo(unit);
    const amount: Amount = { text: m[0], value };
    if (max !== undefined) amount.max = max;
    if (unit) amount.unit = unit;
    if (info?.forms) [amount.one, amount.other] = info.forms;
    // A bare count: whole eggs, half an onion; a bare fraction ("1/2 red onion") divides freely
    amount.split =
      info?.split ??
      (unit || !Number.isInteger(value) ? "any" : /eggs?\b|яйц/i.test(line) ? "whole" : "half");
    if (info?.metric) {
      amount.metric = { value: value * info.metric.factor, unit: info.metric.unit };
    }

    if (parenDepth(line, index) > 0) {
      const previous = amounts[amounts.length - 1];
      const open = line.lastIndexOf("(", index);
      const close = line.indexOf(")", index + m[0].length);
      const between = previous ? line.slice(previousEnd, open) : "x";
      const alone = close !== -1 && line.slice(open + 1, close).trim() === m[0].trim();
      if (previous && isMeasure(unitInfo(previous.unit)) && isMeasure(info) && !between.trim() && alone) {
        amount.text = line.slice(open, close + 1);
        amount.restates = true;
        if (previous.fixed) amount.fixed = true;
        // The recipe's own metric figure beats a generic cup or spoon conversion
        if (info?.base && previous.metric) {
          previous.metric = { value: value * info.base.factor, unit: info.base.unit };
        }
      } else {
        amount.fixed = true;
      }
    }
    amounts.push(amount);
    previousEnd = index + m[0].length;
  }
  return amounts;
}

// --- Checking Gemini's output -------------------------------------------------------

const MAX_AMOUNTS_PER_LINE = 8;
const MAX_WORD_LENGTH = 40;

/**
 * Validates one line's AI-marked amounts against the line itself. Returns
 * null when anything doesn't line up, so the line falls back to the parser.
 */
export function sanitizeAmounts(line: string, raw: unknown): Amount[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_AMOUNTS_PER_LINE) return null;
  const amounts: Amount[] = [];
  let cursor = 0;
  let previousEnd = 0;
  const word = (w: unknown) =>
    typeof w === "string" && w.trim() && w.length <= MAX_WORD_LENGTH ? w : undefined;
  const positive = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n) && n > 0 && n < 100_000;

  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const a = item as Record<string, unknown>;
    if (typeof a.text !== "string" || !a.text.trim()) return null;
    // A span cutting through brackets ("200g) packages") is misread
    if (a.text.split("(").length !== a.text.split(")").length) return null;
    const index = line.indexOf(a.text, cursor);
    if (index === -1) return null;
    cursor = index + a.text.length;
    if (!positive(a.value)) return null;

    const amount: Amount = { text: a.text, value: a.value };
    // "7-oz/200g": the slash and what follows restate the previous amount
    const slash = amounts.length > 0 && /^\s*\/\s*$/.test(line.slice(previousEnd, index));
    if (slash) amount.text = line.slice(previousEnd, cursor);
    previousEnd = cursor;
    if (a.max !== undefined && a.max !== null) {
      if (!positive(a.max) || a.max <= a.value) return null;
      amount.max = a.max;
    }
    // Where the number is written out, it must agree with Gemini's reading
    const written = findNumber(a.text);
    if (written) {
      const off = (x: number, y: number) => Math.abs(x - y) > 0.01 * Math.max(x, y);
      if (off(written.low, amount.value)) return null;
      if (written.high !== undefined && (amount.max === undefined || off(written.high, amount.max))) {
        return null;
      }
    }
    // "a cup" → "cup": the renderer drops the article ("1½ a cups")
    const article = (w: string | undefined) => w?.replace(/^an?\s+/i, "");
    const unit = article(word(a.unit));
    if (unit && a.text.includes(unit)) {
      amount.unit = unit;
      const one = article(word(a.one));
      const other = article(word(a.other));
      if (one && other) Object.assign(amount, { one, other });
    }
    if (a.split === "any" || a.split === "half" || a.split === "whole") amount.split = a.split;
    if (a.fixed === true) amount.fixed = true;
    if ((a.restates === true || slash) && amounts.length > 0) {
      amount.restates = true;
      if (amounts[amounts.length - 1].fixed) amount.fixed = true;
    }
    const metric = a.metric as Record<string, unknown> | null | undefined;
    if (metric && positive(metric.value) && (metric.unit === "g" || metric.unit === "ml")) {
      amount.metric = { value: metric.value, unit: metric.unit };
    }
    amounts.push(amount);
  }
  amounts.forEach((amount, i) => {
    const info = unitInfo(amount.unit);
    // A count with a "metric" weight ("1 egg" ≈ 50 g) would read as "50 g egg"
    if (!amount.unit || info?.base || (info && !info.metric)) delete amount.metric;
    // The recipe's own metric figure beats the AI's estimate
    const previous = amounts[i - 1];
    if (amount.restates && info?.base && previous?.metric) {
      previous.metric = { value: amount.value * info.base.factor, unit: info.base.unit };
    }
  });
  return amounts;
}

// --- Formatting -------------------------------------------------------------------

const NICE = [0, 1 / 8, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1];
const GLYPH = new Map<number, string>(Object.entries(FRACTIONS).map(([g, f]) => [f, g]));

const isCyrillic = (text: string) => /[Ѐ-ӿ]/.test(text);

function decimal(value: number, places: number, comma: boolean) {
  const s = String(Number(value.toFixed(places)));
  return comma ? s.replace(".", ",") : s;
}

/** Kitchen numbers: 1½, ⅓, 12. */
function formatCount(value: number, split: Split): string {
  if (split === "whole") return String(Math.max(1, Math.round(value)));
  if (split === "half") value = Math.max(0.5, Math.round(value * 2) / 2);
  if (value >= 10) return String(Math.round(value));
  let whole = Math.floor(value);
  const rest = value - whole;
  let fraction = NICE.reduce((best, f) => (Math.abs(f - rest) < Math.abs(best - rest) ? f : best));
  if (whole === 0 && fraction === 0) fraction = 1 / 8;
  if (fraction === 1) {
    whole += 1;
    fraction = 0;
  }
  return `${whole || (fraction ? "" : "0")}${fraction ? GLYPH.get(fraction) : ""}`;
}

/**
 * A metric quantity (or range) in its base unit, g or ml → numbers and unit
 * to show, moving up to kg or l from 1000. Converted amounts are estimates,
 * so larger ones round to 5.
 */
function formatMetric(
  low: number,
  high: number | undefined,
  unit: "g" | "ml",
  comma: boolean,
  estimate: boolean
) {
  const big = (high ?? low) >= 1000;
  const format = (base: number) =>
    big ? decimal(base / 1000, estimate ? 1 : 2, comma)
    : base < 1 ? decimal(base, 1, comma)
    : base < 10 ? decimal(Math.round(base * 2) / 2, 1, comma)
    : String(estimate && base >= 100 ? Math.round(base / 5) * 5 : Math.round(base));
  return {
    low: format(low),
    high: high === undefined ? undefined : format(high),
    unit: big ? (unit === "g" ? "kg" : "l") : unit,
  } as const;
}

const METRIC_LABELS = {
  latin: { g: "g", kg: "kg", ml: "ml", l: "l" },
  cyrillic: { g: "г", kg: "кг", ml: "мл", l: "л" },
} as const;

function matchCase(word: string, like: string) {
  return like[0] && like[0] !== like[0].toLowerCase() ? word[0].toUpperCase() + word.slice(1) : word;
}

type RenderOptions = { scale: number; system: UnitSystem };

/** One amount at the chosen scale and units; `null` drops it from the line. */
function renderAmount(
  amount: Amount,
  previousConverted: boolean,
  line: string,
  opts: RenderOptions
): string | null {
  const metricMode = opts.system === "metric";
  if (amount.restates && metricMode && (previousConverted || amount.metric)) return null;

  const factor = amount.fixed ? 1 : opts.scale;
  const comma = isCyrillic(line);
  const labels = comma ? METRIC_LABELS.cyrillic : METRIC_LABELS.latin;

  // Cups, spoons, ounces → grams or millilitres
  if (metricMode && amount.metric) {
    const perUnit = amount.metric.value / amount.value;
    const shown = formatMetric(
      amount.value * perUnit * factor,
      amount.max === undefined ? undefined : amount.max * perUnit * factor,
      amount.metric.unit,
      comma,
      true
    );
    const range = shown.high !== undefined && shown.high !== shown.low;
    return `${shown.low}${range ? `-${shown.high}` : ""} ${labels[shown.unit]}`;
  }
  if (factor === 1) return amount.text;

  const info = unitInfo(amount.unit);
  let low: string;
  let high: string | undefined;
  let unitWord = amount.unit;
  if (info?.base) {
    const shown = formatMetric(
      amount.value * info.base.factor * factor,
      amount.max === undefined ? undefined : amount.max * info.base.factor * factor,
      info.base.unit,
      comma,
      false
    );
    ({ low, high } = shown);
    // Keep the cook's own word ("грама", "grams") unless g became kg or similar
    const written = info.base.factor === 1 ? info.base.unit : info.base.unit === "g" ? "kg" : "l";
    if (shown.unit !== written) unitWord = labels[shown.unit];
  } else {
    const split = amount.split ?? info?.split ?? "any";
    low = formatCount(amount.value * factor, split);
    high = amount.max === undefined ? undefined : formatCount(amount.max * factor, split);
  }
  if (high === low) high = undefined;
  const [one, other] = amount.one && amount.other ? [amount.one, amount.other] : (info?.forms ?? []);
  if (unitWord === amount.unit && amount.unit && one && other) {
    const plural = parseNumber(high ?? low) > 1;
    unitWord = matchCase(plural ? other : one, amount.unit);
  }

  // "1/2 a cup" reads fine, "1½ a cups" doesn't
  let text = amount.text.replace(/^(\S+)\s+an?\s+/i, "$1 ");
  const unitAt = amount.unit ? text.lastIndexOf(amount.unit) : -1;
  if (amount.unit && unitWord && unitAt !== -1) {
    text = text.slice(0, unitAt) + unitWord + text.slice(unitAt + amount.unit.length);
  }
  const number = findNumber(text);
  const numberText = `${low}${high === undefined ? "" : `${number?.separator ?? "-"}${high}`}`;
  if (number) {
    return text.slice(0, number.index) + numberText + text.slice(number.index + number.length);
  }
  // Written out ("half a cup", "една глава"): number plus the unit
  return unitWord ? `${numberText} ${unitWord}` : numberText;
}

/** Applies a scale and unit system to one ingredient line. */
export function renderLine(line: string, amounts: Amount[], opts: RenderOptions): string {
  if (amounts.length === 0 || (opts.scale === 1 && opts.system === "original")) return line;
  let out = "";
  let cursor = 0;
  let previousConverted = false;
  for (const amount of amounts) {
    const index = line.indexOf(amount.text, cursor);
    if (index === -1) continue;
    const rendered = renderAmount(amount, previousConverted, line, opts);
    previousConverted = !amount.restates && opts.system === "metric" && !!amount.metric;
    out += line.slice(cursor, index) + (rendered ?? "");
    cursor = index + amount.text.length;
  }
  out += line.slice(cursor);
  // Tidy up after a dropped "(360mL)"
  return out.replace(/ {2,}/g, " ").replace(/ ([,.;)])/g, "$1").trim();
}

/** Stored AI amounts for each line, or the parser's reading where there are none. */
export function resolveAmounts(lines: string[], stored: (Amount[] | null)[] | undefined): Amount[][] {
  const usable = stored && stored.length === lines.length ? stored : undefined;
  return lines.map((line, i) => usable?.[i] ?? parseAmounts(line));
}

/** Whether switching to metric would change anything. */
export function hasMetricConversions(amounts: Amount[][]): boolean {
  return amounts.some((line) => line.some((a) => a.metric));
}

/** Ingredient lines at a scale and unit system, and whether metric would change any. */
export function formatIngredients(
  lines: string[],
  stored: (Amount[] | null)[] | undefined,
  opts: RenderOptions
) {
  const amounts = resolveAmounts(lines, stored);
  return {
    lines: lines.map((line, i) => renderLine(line, amounts[i], opts)),
    canConvert: hasMetricConversions(amounts),
  };
}
