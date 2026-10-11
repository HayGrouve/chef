"use client";

import { useRef } from "react";

type AutoFocusHandlers = {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
};

/**
 * Radix modals hand focus back to their `Trigger` on close, and to nothing at
 * all when they're opened from state. This remembers what had focus when the
 * dialog opened and returns focus there, unless the caller handles it.
 */
export function useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus }: AutoFocusHandlers) {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: (event: Event) => {
      const active = document.activeElement;
      // Opened from a menu item: the item is about to disappear, so use the
      // button that opened the menu (Radix labels the menu with its trigger)
      const menuTriggerId = active?.closest('[role="menu"]')?.getAttribute("aria-labelledby");
      const target = menuTriggerId ? document.getElementById(menuTriggerId) : active;
      opener.current = target instanceof HTMLElement && target !== document.body ? target : null;
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event);
      if (event.defaultPrevented) return;
      const element = opener.current;
      if (element?.isConnected) {
        event.preventDefault();
        element.focus();
      }
    },
  };
}
