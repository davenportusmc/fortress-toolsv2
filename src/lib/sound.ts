let audioCtx: AudioContext | null = null;
let masterVolume = 0.25; // default louder
let sampleCache: Record<string, AudioBuffer | null> = {};

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  // @ts-ignore - Safari prefix
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') {
    // Try to resume; will work after a user gesture
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playBeep(options?: {
  freq?: number;
  durationMs?: number;
  type?: OscillatorType;
  volume?: number;
}) {
  const { freq = 880, durationMs = 150, type = 'sine', volume = 0.2 } = options || {};
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = Math.max(0, Math.min(1, volume)) * masterVolume;
  osc.connect(gain).connect(ctx.destination);
  const now = ctx.currentTime;
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

export function unlockAudio() {
  // Call on a user gesture (e.g., Start button) to ensure audio works
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

export function setMasterVolume(vol0to1: number) {
  masterVolume = Math.max(0, Math.min(1, vol0to1));
}

export function getMasterVolume() {
  return masterVolume;
}

// Helpers for common cues
export async function doubleBeep(options?: { freq1?: number; freq2?: number; gapMs?: number; volume?: number }) {
  const { freq1 = 900, freq2 = 900, gapMs = 120, volume = 0.25 } = options || {};
  playBeep({ freq: freq1, durationMs: 140, volume });
  await new Promise((r) => setTimeout(r, gapMs));
  playBeep({ freq: freq2, durationMs: 140, volume });
}

export function longEndTone(options?: { freq?: number; durationMs?: number; volume?: number }) {
  const { freq = 420, durationMs = 1500, volume = 0.35 } = options || {};
  playBeep({ freq, durationMs, type: 'square', volume });
}

export async function countdown321Go(options?: { baseFreq?: number; stepHz?: number; gapMs?: number; volume?: number }) {
  const { baseFreq = 450, stepHz = 80, gapMs = 250, volume = 0.25 } = options || {};
  playBeep({ freq: baseFreq, durationMs: 200, volume }); // 3
  await new Promise((r) => setTimeout(r, gapMs));
  playBeep({ freq: baseFreq + stepHz, durationMs: 200, volume }); // 2
  await new Promise((r) => setTimeout(r, gapMs));
  playBeep({ freq: baseFreq + stepHz * 2, durationMs: 200, volume }); // 1
  await new Promise((r) => setTimeout(r, gapMs));
  playBeep({ freq: baseFreq + stepHz * 3, durationMs: 500, type: 'square', volume }); // GO
}

// ===== Sample-based playback =====
async function fetchArrayBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return await res.arrayBuffer();
}

export async function loadSample(name: string, url: string) {
  const ctx = getCtx();
  if (!ctx) return null;
  try {
    const data = await fetchArrayBuffer(url);
    const buf = await ctx.decodeAudioData(data.slice(0));
    sampleCache[name] = buf;
    return buf;
  } catch (e) {
    sampleCache[name] = null;
    return null;
  }
}

export async function ensureSamplesLoaded() {
  const mappings: Array<[string, string]> = [
    ["bell", "/sounds/bell.mp3"],
    ["tick", "/sounds/tick.wav"],
    ["go", "/sounds/go.mp3"],
    ["rest", "/sounds/rest.mp3"],
  ];
  await Promise.all(
    mappings.map(async ([name, url]) => {
      if (!(name in sampleCache)) {
        await loadSample(name, url);
      }
    })
  );
}

export function playSample(name: string, options?: { volume?: number }) {
  const ctx = getCtx();
  if (!ctx) return false;
  const buf = sampleCache[name] ?? null;
  if (!buf) return false;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = Math.max(0, Math.min(1, options?.volume ?? 1)) * masterVolume;
  src.connect(gain).connect(ctx.destination);
  src.start();
  return true;
}

// ===== Synth alternatives to real samples (no external files) =====
let masterChain: { gain: GainNode; compressor: DynamicsCompressorNode } | null = null;
function getMasterChain() {
  const ctx = getCtx();
  if (!ctx) return null;
  if (!masterChain) {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 20;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.250;
    const gain = ctx.createGain();
    gain.gain.value = masterVolume;
    compressor.connect(gain).connect(ctx.destination);
    masterChain = { gain, compressor };
  } else {
    masterChain.gain.gain.value = masterVolume;
  }
  return { ctx, ...masterChain } as const;
}

function noiseBurst(ctx: AudioContext, dur = 0.06, vol = 0.6) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.7;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  src.connect(gain);
  const chain = getMasterChain();
  if (chain) gain.connect(chain.compressor);
  src.start();
}

export function playTickSynth(volume = 0.6) {
  const chain = getMasterChain();
  if (!chain) return;
  const { ctx, compressor } = chain;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(2000, ctx.currentTime);
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
  osc.connect(gain).connect(compressor);
  osc.start();
  osc.stop(ctx.currentTime + 0.07);
}

export function playRestCue(volume = 0.8) {
  const chain = getMasterChain();
  if (!chain) return;
  const { ctx, compressor } = chain;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
  osc.connect(gain).connect(compressor);
  osc.start();
  osc.stop(ctx.currentTime + 0.26);
}

export function playGoCue(volume = 0.9) {
  const chain = getMasterChain();
  if (!chain) return;
  const { ctx, compressor } = chain;
  // Two quick chirps
  const playChirp = (t: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(1100, t + 0.09);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain).connect(compressor);
    osc.start(t);
    osc.stop(t + 0.13);
  };
  const t0 = chain.ctx.currentTime;
  playChirp(t0);
  playChirp(t0 + 0.16);
}

export function playEndBuzzer(volume = 1.0) {
  const chain = getMasterChain();
  if (!chain) return;
  const { ctx, compressor } = chain;
  // Strong square with slight overdrive via waveshaper
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(420, ctx.currentTime);
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1;
    curve[i] = Math.tanh(3 * x);
  }
  shaper.curve = curve; shaper.oversample = '4x';
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
  osc.connect(shaper).connect(gain).connect(compressor);
  osc.start();
  osc.stop(ctx.currentTime + 1.25);
}

export function playBellSynth(volume = 0.9) {
  const chain = getMasterChain();
  if (!chain) return;
  const { ctx, compressor } = chain;
  const partials = [
    { ratio: 1.0, decay: 1.0 },
    { ratio: 2.7, decay: 1.4 },
    { ratio: 3.8, decay: 1.8 },
    { ratio: 5.1, decay: 2.2 },
  ];
  const base = 450;
  noiseBurst(ctx, 0.04, 0.5 * volume);
  partials.forEach((p, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const f0 = base * p.ratio;
    osc.frequency.setValueAtTime(f0 * 1.02, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f0, ctx.currentTime + 0.08);
    const g = volume * (idx === 0 ? 1.0 : 0.6 / (idx + 0.2));
    gain.gain.setValueAtTime(Math.max(0.001, g), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + p.decay);
    osc.connect(gain).connect(compressor);
    osc.start();
    osc.stop(ctx.currentTime + p.decay + 0.05);
  });
}

export function countdown321GoSynth(volume = 0.8) {
  const chain = getMasterChain();
  if (!chain) return;
  const { ctx } = chain;
  const t0 = ctx.currentTime;
  const beeps = [
    { t: 0.0, f: 500, d: 0.20 },
    { t: 0.28, f: 580, d: 0.20 },
    { t: 0.56, f: 660, d: 0.20 },
    { t: 0.84, f: 740, d: 0.50, type: 'square' as OscillatorType },
  ];
  beeps.forEach(b => {
    const type = b.type ?? 'sine';
    const t = t0 + b.t;
    const ctx2 = getCtx();
    if (!ctx2) return;
    const osc = ctx2.createOscillator();
    const gain = ctx2.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(b.f, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + b.d);
    const chainNow = getMasterChain();
    if (chainNow) osc.connect(gain).connect(chainNow.compressor);
    osc.start(t);
    osc.stop(t + b.d + 0.01);
  });
}

// Stronger, longer start beep to kick off a workout
export function playStartBeep(volume = 0.9) {
  const chain = getMasterChain();
  if (!chain) return;
  const { ctx, compressor } = chain;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(750, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
  osc.connect(gain).connect(compressor);
  osc.start();
  osc.stop(ctx.currentTime + 0.62);
}

// Repeating end alarm (bell-like) until stopped by user action
let endAlarmInterval: number | null = null;
export function startEndAlarmLoop(volume = 1.0, periodMs = 1600) {
  stopEndAlarmLoop();
  playBellSynth(volume);
  if (typeof window !== 'undefined') {
    endAlarmInterval = window.setInterval(() => {
      playBellSynth(volume);
    }, Math.max(600, periodMs));
  }
}

export function stopEndAlarmLoop() {
  if (endAlarmInterval !== null && typeof window !== 'undefined') {
    window.clearInterval(endAlarmInterval);
    endAlarmInterval = null;
  }
}
