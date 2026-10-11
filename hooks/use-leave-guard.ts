"use client";

import { useEffect, useRef } from "react";

/**
 * While `active`, asks before leaving the page through an in-app link or the
 * browser's Back button (reload and close are covered by `beforeunload`).
 *
 * `onAttempt` receives a `proceed` callback; call it to leave after all.
 * Returns `back`, which leaves for the previous page without being stopped
 * (use it for a confirmed Cancel/Discard).
 */
export function useLeaveGuard(active: boolean, onAttempt: (proceed: () => void) => void) {
  const leavingRef = useRef(false);
  const onAttemptRef = useRef(onAttempt);
  const back = () => {
    leavingRef.current = true;
    // Skip the guard's extra entry along with the page itself
    window.history.go(window.history.state?.leaveGuard ? -2 : -1);
  };
  const backRef = useRef(back);
  useEffect(() => {
    onAttemptRef.current = onAttempt;
    backRef.current = back;
  });

  useEffect(() => {
    if (!active) return;
    leavingRef.current = false;

    // Links: catch the click before Next's <Link> handler sees it
    const onClick = (event: MouseEvent) => {
      if (leavingRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      onAttemptRef.current(() => {
        leavingRef.current = true;
        link.click();
      });
    };

    // Back: keep an extra history entry for this page, so pressing Back lands
    // on it instead of leaving. The copied state keeps Next's router happy.
    const addGuardEntry = () => {
      if (window.history.state?.leaveGuard) return;
      window.history.pushState({ ...window.history.state, leaveGuard: true }, "", window.location.href);
    };
    addGuardEntry();
    const onPopState = () => {
      if (leavingRef.current) return;
      addGuardEntry();
      onAttemptRef.current(() => backRef.current());
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    // The extra entry stays if the guard ends on the page (e.g. after saving);
    // removing it would race with the navigation that usually follows.
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [active]);

  return { back };
}
