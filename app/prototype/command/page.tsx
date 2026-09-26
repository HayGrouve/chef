// PROTOTYPE — /prototype/command: explainer and switch for the ⌘K palette.
import type { Metadata } from "next";
import { CommandDemo } from "@/components/prototype/command/CommandDemo";

export const metadata: Metadata = { title: "Command palette · Prototype" };

export default function CommandPrototypePage() {
  return <CommandDemo />;
}
