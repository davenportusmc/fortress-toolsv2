// Web Audio-based sound utility with sample-accurate scheduling
// Exposes: initSounds, primeSounds, playBeep/playLongBeep (immediate), scheduleBeepAt/scheduleLongBeepAt (unix ms)

let initialized = false;
let audioCtx: AudioContext | null = null;
let beepBuf: AudioBuffer | null = null;
let longBeepBuf: AudioBuffer | null = null;

// Fallback HTMLAudio for very old browsers or if context creation fails
let beepEl: HTMLAudioElement | null = null;
let longBeepEl: HTMLAudioElement | null = null;

const LS_KEY = 'ff_audio_early_ms';

function detectAutoEarlyMs(ctx: AudioContext | null): number {
  try {
    if (ctx) {
      const base = (ctx as any).baseLatency ?? 0;
      const out = (ctx as any).outputLatency ?? 0;
      const ms = Math.round((base + out) * 1000);
      if (ms > 0 && ms < 300) return ms; // sane bounds
    }
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod|Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua)) return 90;
    if (/Android/.test(ua)) return 60;
    if (/Safari/.test(ua)) return 60;
    return 30; // default desktop chrome/edge
  } catch {
    return 40;
  }
}

function getEarlyMs(ctx: AudioContext | null): number {
  try {
    const saved = Number(localStorage.getItem(LS_KEY) || 'NaN');
    if (!Number.isNaN(saved)) return saved;
  } catch {}
  const auto = detectAutoEarlyMs(ctx);
  try { localStorage.setItem(LS_KEY, String(auto)); } catch {}
  return auto;
}

export async function initSounds() {
  if (typeof window === 'undefined') return;
  if (initialized) return;
  initialized = true;
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    audioCtx = null;
  }

  // Create fallback HTMLAudio elements regardless
  beepEl = new Audio('/sounds/beep.wav');
  longBeepEl = new Audio('/sounds/long_beep.wav');
  [beepEl, longBeepEl].forEach((el) => { if (el) el.preload = 'auto'; });

  // Start async buffer decode; primeSounds() will await it if needed
  if (audioCtx) {
    // Fetch and decode in parallel
    const load = async (url: string) => {
      const res = await fetch(url, { cache: 'force-cache' });
      const arr = await res.arrayBuffer();
      return await audioCtx!.decodeAudioData(arr);
    };
    try {
      [beepBuf, longBeepBuf] = await Promise.all([
        load('/sounds/beep.wav'),
        load('/sounds/long_beep.wav'),
      ]);
    } catch {
      // fall back silently; immediate play() will still work
    }
  }
}

// Ensure buffers are decoded and context is resumed
export async function primeSounds() {
  try {
    await initSounds();
    if (audioCtx && audioCtx.state === 'suspended') {
      try { await audioCtx.resume(); } catch {}
    }
    // Touch decode if still missing
    if (audioCtx && (!beepBuf || !longBeepBuf)) {
      try {
        const load = async (url: string) => {
          const res = await fetch(url, { cache: 'force-cache' });
          const arr = await res.arrayBuffer();
          return await audioCtx!.decodeAudioData(arr);
        };
        beepBuf = beepBuf || await load('/sounds/beep.wav');
        longBeepBuf = longBeepBuf || await load('/sounds/long_beep.wav');
      } catch {}
    }
  } catch {}
}

function startNow(buf: AudioBuffer | null) {
  if (audioCtx && buf) {
    try {
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtx.destination);
      const when = Math.max(audioCtx.currentTime + 0.02, 0);
      src.start(when);
      return;
    } catch {}
  }
  // fallback
  const el = buf === longBeepBuf ? longBeepEl : beepEl;
  try { el && el.play(); } catch {}
}

export function playBeep() { startNow(beepBuf); }
export function playLongBeep() { startNow(longBeepBuf); }

function scheduleAtUnix(buf: AudioBuffer | null, unixMs: number) {
  if (!audioCtx || !buf) {
    // fallback: compute delay and use setTimeout + immediate play
    const delay = Math.max(0, unixMs - Date.now());
    setTimeout(() => startNow(buf), delay);
    return;
  }
  const earlyMs = getEarlyMs(audioCtx);
  // Convert wall-clock to contextTime
  const ctxNow = audioCtx.currentTime;
  const nowMs = performance.timeOrigin + performance.now();
  const deltaMs = unixMs - nowMs - earlyMs;
  const when = Math.max(ctxNow + deltaMs / 1000, ctxNow + 0.02);
  try {
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(when);
  } catch {
    // fallback
    const delay = Math.max(0, unixMs - Date.now() - earlyMs);
    setTimeout(() => startNow(buf), delay);
  }
}

export function scheduleBeepAt(unixMs: number) { scheduleAtUnix(beepBuf, unixMs); }
export function scheduleLongBeepAt(unixMs: number) { scheduleAtUnix(longBeepBuf, unixMs); }

// Kept for API completeness; not used in new flow
export function playTripleBeep() { /* no-op in new system */ }
export async function playThreeTwoOne() { /* no-op in new system */ }
