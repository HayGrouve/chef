import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "1 ingredient", "3 ingredients". */
export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

/** True on devices with a mouse/trackpad, where autofocus won't pop up a keyboard. */
export function hasFinePointer() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches
}
