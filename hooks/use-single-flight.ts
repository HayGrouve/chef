import { useCallback, useRef, useState } from "react";

/**
 * Wraps an async handler so repeat calls are ignored while one is running.
 * A ref (not state) guards it, so even same-tick double clicks can't slip through.
 */
export function useSingleFlight<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>
) {
  const running = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(async (...args: Args): Promise<R | undefined> => {
    if (running.current) return undefined;
    running.current = true;
    setPending(true);
    try {
      return await fn(...args);
    } finally {
      running.current = false;
      setPending(false);
    }
  }, [fn]);

  return [run, pending] as const;
}

/** Lets a callback (e.g. a toast's Undo) run only once, however often it's clicked. */
export function once<Args extends unknown[]>(fn: (...args: Args) => unknown) {
  let done = false;
  return (...args: Args) => {
    if (done) return;
    done = true;
    void fn(...args);
  };
}
