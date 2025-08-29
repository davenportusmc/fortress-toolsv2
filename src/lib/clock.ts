export type Unsubscribe = () => void;

export interface ClockControls {
  start: () => void;
  pause: () => void;
  reset: () => void;
  getElapsedMs: () => number;
  subscribe: (listener: (elapsedMs: number) => void) => Unsubscribe;
  isRunning: () => boolean;
}

// High-precision, drift-resistant clock using performance.now() + requestAnimationFrame
export function createClock(): ClockControls {
  let rafId: number | null = null;
  let running = false;
  let startTs = 0; // performance.now() when last started
  let accumulated = 0; // ms accumulated across runs
  const listeners = new Set<(elapsedMs: number) => void>();

  const notify = (elapsed: number) => {
    listeners.forEach((fn) => fn(elapsed));
  };

  const loop = () => {
    if (!running) return;
    const now = performance.now();
    const elapsed = accumulated + (now - startTs);
    notify(elapsed);
    rafId = requestAnimationFrame(loop);
  };

  const start = () => {
    if (running) return;
    running = true;
    startTs = performance.now();
    rafId = requestAnimationFrame(loop);
  };

  const pause = () => {
    if (!running) return;
    const now = performance.now();
    accumulated += now - startTs;
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    notify(accumulated);
  };

  const reset = () => {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    accumulated = 0;
    notify(0);
  };

  const getElapsedMs = () => {
    if (!running) return accumulated;
    return accumulated + (performance.now() - startTs);
  };

  const subscribe = (listener: (elapsedMs: number) => void): Unsubscribe => {
    listeners.add(listener);
    listener(getElapsedMs()); // emit immediately
    return () => listeners.delete(listener);
  };

  const isRunning = () => running;

  return { start, pause, reset, getElapsedMs, subscribe, isRunning };
}
