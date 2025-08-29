// Minimal lazy-loaded HTMLAudioElement sound utility
// Provides: initSounds, playBeep, playLongBeep, playTripleBeep, playThreeTwoOne

let initialized = false;
let beepEl: HTMLAudioElement | null = null;
let longBeepEl: HTMLAudioElement | null = null;
let tripleBeepEl: HTMLAudioElement | null = null;

export function initSounds() {
  if (typeof window === 'undefined') return;
  if (initialized) return;
  // Lazy create elements; srcs point to files in public/sounds/
  beepEl = new Audio('/sounds/beep.wav');
  longBeepEl = new Audio('/sounds/long_beep.wav');
  tripleBeepEl = new Audio('/sounds/triple_beep.wav');
  // Prevent multiple overlapping default by enabling parallel playback via cloning when needed
  [beepEl, longBeepEl, tripleBeepEl].forEach((el) => {
    if (el) {
      el.preload = 'auto';
    }
  });
  initialized = true;
}

function play(el: HTMLAudioElement | null) {
  if (!el) return;
  try {
    // Prefer the primed base element if it's idle for lowest latency
    if ((el as HTMLAudioElement).paused || (el as HTMLAudioElement).ended) {
      try {
        el.currentTime = 0;
      } catch {}
      void el.play().catch(() => {});
      return;
    }
    // Otherwise, use a clone to allow overlapping playback
    const node = el.cloneNode(true) as HTMLAudioElement;
    void node.play().catch(() => {});
  } catch {}
}

export function playBeep() {
  play(beepEl);
}

export function playLongBeep() {
  play(longBeepEl);
}

export function playTripleBeep() {
  play(tripleBeepEl);
}

export async function playThreeTwoOne() {
  // 3 short beeps then a long beep
  playBeep();
  await new Promise((r) => setTimeout(r, 700));
  playBeep();
  await new Promise((r) => setTimeout(r, 700));
  playBeep();
  await new Promise((r) => setTimeout(r, 700));
  playLongBeep();
}

// Silently warm up audio to avoid the first audible beep being delayed by decode/fetch
export async function primeSounds() {
  try {
    const els = [beepEl, longBeepEl, tripleBeepEl];
    for (const el of els) {
      if (!el) continue;
      const prevVol = el.volume;
      el.volume = 0;
      try {
        await el.play();
        // Give a short tick to ensure buffer is primed
        await new Promise((r) => setTimeout(r, 60));
      } catch {}
      try {
        el.pause();
        el.currentTime = 0;
      } catch {}
      el.volume = prevVol;
    }
  } catch {}
}
