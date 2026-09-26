// PROTOTYPE — list of experimental directions shown in /prototype.
import { Command, CookingPot, LayoutDashboard, Sparkles, type LucideIcon } from "lucide-react";

export type PrototypeInfo = {
  id: string;
  href: string;
  name: string;
  direction: string;
  summary: string;
  tryThis: string[];
  replaces: string;
  icon: LucideIcon;
};

export const PROTOTYPES: PrototypeInfo[] = [
  {
    id: "import",
    href: "/prototype/import",
    name: "Smart Import",
    direction: "AI-native",
    summary:
      "Get recipes in without typing: paste a link, paste a caption or message, or snap a cookbook page. Review the draft, then save.",
    tryThis: [
      "Paste https://www.bbcgoodfood.com/recipes/easy-pancakes (structured data, no AI)",
      "Paste an Instagram-style caption into Text",
      "Photograph a cookbook page or handwritten card",
    ],
    replaces: "Typing every ingredient and step into /create",
    icon: Sparkles,
  },
  {
    id: "today",
    href: "/prototype/today",
    name: "Today",
    direction: "Workflow-first",
    summary:
      "A personal home built around plan → shop → cook. Tonight's meal first, a week strip, staples-aware shopping and what you can cook right now.",
    tryThis: [
      "Start tonight's dinner from the hero card",
      "Mark staples you always have, then \"Shop for the week\"",
      "Compare with the current home feed at /",
    ],
    replaces: "The public recipe feed as the signed-in home page",
    icon: LayoutDashboard,
  },
  {
    id: "cook",
    href: "/prototype/cook",
    name: "Cook Mode 2.0",
    direction: "Minimal evolution",
    summary:
      "The same cook mode, fixed where it hurts: one step at a time, the ingredients each step needs, tap-to-start named timers, scaling and voice control.",
    tryThis: [
      "Open Chicken Tikka Masala and tap \"20 minutes\" in step 1",
      "Scale to 2× and watch the step ingredients update",
      "Turn on voice and say \"next\"",
    ],
    replaces: "/recipe/[id]/cook",
    icon: CookingPot,
  },
  {
    id: "command",
    href: "/prototype/command",
    name: "Command Palette",
    direction: "Power user",
    summary:
      "Press ⌘K / Ctrl+K anywhere to find a recipe, add it to a day, drop an item on the shopping list or jump to any page without leaving the keyboard.",
    tryThis: [
      "Enable it below, then press ⌘K on any page",
      "Type \"risotto\" and plan it for Thursday dinner",
      "Type \"add milk\" to put milk on the list",
    ],
    replaces: "Nothing. It's an extra layer over the current navigation",
    icon: Command,
  },
];
