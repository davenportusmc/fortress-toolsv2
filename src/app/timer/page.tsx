"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createClock } from "@/lib/clock";
import { initSounds, playBeep, playLongBeep, primeSounds, scheduleBeepAt, scheduleLongBeepAt } from "@/utils/sounds";

function formatMMSS(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const mmStr = String(mm).padStart(2, "0");
  const ssStr = String(ss).padStart(2, "0");
  return `${mmStr}:${ssStr}`;
}

export default function TimerPage() {
  // Small advance to compensate for audio output latency and scheduling jitter
  const AUDIO_EARLY_MS = 60;
  const clockRef = useRef<ReturnType<typeof createClock> | null>(null);
  // Screen wake lock for mobile to prevent sleep during workouts
  const wakeLockRef = useRef<any | null>(null);
  // Pre-start countdown value (10..1), 0 means no overlay
  const [prestart, setPrestart] = useState(0);
  // Whether the fullscreen timer UI is active (during prestart and while running/paused until Exit)
  const [fullscreenActive, setFullscreenActive] = useState(false);
  // Local confirm dialog for Exit (avoids browser confirm issues in fullscreen)
  const [confirmExit, setConfirmExit] = useState(false);
  // Finished state to alter UI when a timer completes
  const [finished, setFinished] = useState(false);
  // Refs for precise final 3-2-1 scheduling (using Web Audio scheduler)
  const endCueTimeoutsRef = useRef<number[]>([]);
  const endBeepScheduledRef = useRef(false);
  const usingEndSchedulerRef = useRef(false);
  // Post-zero hold to delay finished UI reveal (keep 0:00 visible for 1s)
  const [postZeroHold, setPostZeroHold] = useState(false);
  const finishedTimeoutRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"for-time" | "amrap" | "emom" | "tabata">(
    "for-time"
  );
  // AMRAP duration controls
  const [amrapMin, setAmrapMin] = useState(20);
  const [amrapSec, setAmrapSec] = useState(0);
  // EMOM controls
  const [emomMin, setEmomMin] = useState(1);
  const [emomSec, setEmomSec] = useState(0);
  const [emomRounds, setEmomRounds] = useState(10);
  const [emomRestSec, setEmomRestSec] = useState(0);
  // Tabata controls
  const [tabataWorkSec, setTabataWorkSec] = useState(20);
  const [tabataRestSec, setTabataRestSec] = useState(10);
  const [tabataRounds, setTabataRounds] = useState(8);

  useEffect(() => {
    const clock = createClock();
    clockRef.current = clock;
    const unsub = clock.subscribe((ms) => setElapsed(ms));
    return () => unsub();
  }, []);

  // Acquire a screen wake lock on mobile while countdown/running/fullscreen is active
  useEffect(() => {
    const wantsWake = fullscreenActive || prestart > 0 || running;
    let canceled = false;
    async function acquire() {
      try {
        if (!wantsWake) return;
        const wl = await (navigator as any).wakeLock?.request?.('screen');
        if (canceled) {
          try { wl?.release?.(); } catch {}
          return;
        }
        wakeLockRef.current = wl;
        wl?.addEventListener?.('release', () => {
          // could attempt re-acquire on next visibilitychange
        });
      } catch {}
    }
    if (wantsWake) acquire();

    const onVis = () => {
      // Some browsers drop wake lock on tab hide; re-acquire when visible
      if (document.visibilityState === 'visible' && (fullscreenActive || prestart > 0 || running)) {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      canceled = true;
      document.removeEventListener('visibilitychange', onVis);
      try { wakeLockRef.current?.release?.(); } catch {}
      wakeLockRef.current = null;
    };
  }, [fullscreenActive, prestart, running]);


  // Keep a ref of running to allow aborting pre-start if user pauses
  const runningRef = useRef(running);
  useEffect(() => { runningRef.current = running; }, [running]);

  const onStart = async () => {
    // Ensure sound is initialized on first user gesture
    initSounds();
    // Warm up audio buffers so first beep at 3 is immediate
    await primeSounds();
    setRunning(true);
    runningRef.current = true;
    setFinished(false);
    // Try to enter fullscreen for an immersive timer
    try {
      if (typeof document !== 'undefined') {
        const el: any = document.documentElement;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) await el.msRequestFullscreen();
      }
    } catch {}
    setFullscreenActive(true);
    // 10-second prestart: precise scheduling for even 3-2-1 (no long beep at GO)
    const startAt = Date.now() + 10000;
    // Schedule short beeps at 3,2,1 seconds remaining using cancellable timeouts
    [3000, 2000, 1000].forEach((mark) => {
      const delay = Math.max(0, startAt - Date.now() - mark - AUDIO_EARLY_MS);
      window.setTimeout(() => {
        if (runningRef.current) playBeep();
      }, delay);
    });
    // Do NOT long-beep at GO during prestart per user preference

    // Drive digits by real time to avoid drift
    let rafId = 0 as number | 0;
    const tick = () => {
      if (!runningRef.current) return;
      const remaining = Math.max(0, startAt - Date.now());
      const val = Math.ceil(remaining / 1000);
      setPrestart(val > 0 ? val : 0);
      if (remaining <= 0) {
        setPrestart(0);
        clockRef.current?.start();
        return;
      }
      rafId = requestAnimationFrame(tick) as unknown as number;
    };
    rafId = requestAnimationFrame(tick) as unknown as number;
  };
  const onResume = () => {
    if (!running) {
      clockRef.current?.start();
      setRunning(true);
      runningRef.current = true;
      setFinished(false);
    }
  };
  function exitFullscreenIfAny() {
    try {
      if (typeof document !== 'undefined') {
        const d: any = document;
        if (d.fullscreenElement) {
          if (d.exitFullscreen) d.exitFullscreen();
          else if (d.webkitExitFullscreen) d.webkitExitFullscreen();
          else if (d.msExitFullscreen) d.msExitFullscreen();
        }
      }
    } catch {}
  }

  // Lightweight confetti without external deps
  function fireConfetti() {
    if (typeof document === 'undefined') return;
    const doc = document;
    // Ensure keyframes exist once
    const styleId = 'ff-confetti-styles';
    if (!doc.getElementById(styleId)) {
      const style = doc.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes ff-fall-spin {
          0% { transform: translate3d(var(--x,0), -10vh, 0) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translate3d(var(--x,0), 110vh, 0) rotate(720deg); opacity: 0; }
        }
      `;
      doc.head.appendChild(style);
    }
    // Container overlay
    const overlay = doc.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '140';
    overlay.style.pointerEvents = 'none';
    overlay.style.overflow = 'hidden';
    doc.body.appendChild(overlay);

    const colors = ['#7dd3fc','#60a5fa','#c084fc','#f472b6','#fca5a5','#fde68a','#86efac'];
    const count = 120;
    for (let i = 0; i < count; i++) {
      const p = doc.createElement('div');
      const size = 6 + Math.random() * 8;
      const left = Math.random() * 100;
      const delay = Math.random() * 0.3; // slight staggering
      const duration = 1.6 + Math.random() * 0.9;
      const xDrift = (Math.random() * 60 - 30).toFixed(1) + 'vw';
      p.style.position = 'absolute';
      p.style.top = '-10vh';
      p.style.left = left + 'vw';
      p.style.width = size + 'px';
      p.style.height = size * (0.6 + Math.random()*0.8) + 'px';
      p.style.background = colors[Math.floor(Math.random()*colors.length)];
      p.style.opacity = '0.95';
      p.style.transform = 'translate3d(0, -10vh, 0)';
      p.style.willChange = 'transform, opacity';
      p.style.animation = `ff-fall-spin ${duration}s cubic-bezier(0.2,0.7,0.2,1) ${delay}s forwards`;
      (p.style as any).setProperty('--x', xDrift);
      overlay.appendChild(p);
    }
    // Cleanup
    const ttl = 2800;
    setTimeout(() => {
      try { overlay.remove(); } catch {}
    }, ttl);
  }
  const onPause = () => {
    clockRef.current?.pause();
    setRunning(false);
    runningRef.current = false;
    // Keep fullscreen active; user can choose Exit explicitly
    setPrestart(0);
  };
  const onReset = () => {
    clockRef.current?.reset();
    setRunning(false);
    runningRef.current = false;
    // Keep fullscreen active unless user chooses Exit
    setPrestart(0);
    setFinished(false);
    setPostZeroHold(false);
    if (finishedTimeoutRef.current) { clearTimeout(finishedTimeoutRef.current); finishedTimeoutRef.current = null; }
    // Clear any pending end-cue timeouts
    endCueTimeoutsRef.current.forEach((id) => clearTimeout(id));
    endCueTimeoutsRef.current = [];
    endBeepScheduledRef.current = false;
    usingEndSchedulerRef.current = false;
  };

  // Cancel/Exit actions for prestart and running fullscreen
  const onCancelPrestart = () => {
    // Abort countdown and leave fullscreen view
    setRunning(false);
    runningRef.current = false;
    setPrestart(0);
    setFullscreenActive(false);
    exitFullscreenIfAny();
    setFinished(false);
    setPostZeroHold(false);
    if (finishedTimeoutRef.current) { clearTimeout(finishedTimeoutRef.current); finishedTimeoutRef.current = null; }
    endCueTimeoutsRef.current.forEach((id) => clearTimeout(id));
    endCueTimeoutsRef.current = [];
  };
  const onExit = () => {
    setConfirmExit(true);
  };
  const onConfirmExit = () => {
    // Pause and reset the timer when exiting
    clockRef.current?.pause();
    clockRef.current?.reset();
    setRunning(false);
    runningRef.current = false;
    setFullscreenActive(false);
    setPrestart(0);
    setFinished(false);
    exitFullscreenIfAny();
    setConfirmExit(false);
    setPostZeroHold(false);
    if (finishedTimeoutRef.current) { clearTimeout(finishedTimeoutRef.current); finishedTimeoutRef.current = null; }
    endCueTimeoutsRef.current.forEach((id) => clearTimeout(id));
    endCueTimeoutsRef.current = [];
  };
  const onCancelExit = () => {
    setConfirmExit(false);
  };

  const amrapTargetMs = useMemo(() => (amrapMin * 60 + amrapSec) * 1000, [amrapMin, amrapSec]);
  const amrapRemainingMs = Math.max(0, amrapTargetMs - elapsed);

  // EMOM derived values (work + optional rest per round)
  const emomWorkMs = useMemo(() => (emomMin * 60 + emomSec) * 1000, [emomMin, emomSec]);
  const emomRestMs = useMemo(() => Math.max(0, emomRestSec) * 1000, [emomRestSec]);
  const emomCycleMs = useMemo(() => emomWorkMs + emomRestMs, [emomWorkMs, emomRestMs]);
  const emomTotalMs = useMemo(() => Math.max(0, emomCycleMs * Math.max(0, emomRounds)), [emomCycleMs, emomRounds]);
  const emomRemainingMs = Math.max(0, emomTotalMs - elapsed);
  const emomCurrentRound = Math.min(
    Math.max(1, Math.floor(elapsed / Math.max(1, emomCycleMs)) + 1),
    Math.max(1, emomRounds)
  );
  const emomInCycleElapsed = emomCycleMs > 0 ? elapsed % emomCycleMs : 0;
  const emomInWorkPhase = emomInCycleElapsed < emomWorkMs;
  const emomPhaseRemaining = emomInWorkPhase
    ? Math.max(0, emomWorkMs - emomInCycleElapsed)
    : Math.max(0, emomCycleMs - emomInCycleElapsed);

  // Tabata derived values
  const tabataCycleMs = useMemo(() => (tabataWorkSec + tabataRestSec) * 1000, [tabataWorkSec, tabataRestSec]);
  const tabataTotalMs = useMemo(() => Math.max(0, tabataCycleMs * Math.max(0, tabataRounds)), [tabataCycleMs, tabataRounds]);
  const tabataRemainingMs = Math.max(0, tabataTotalMs - elapsed);
  const tabataCycleElapsed = tabataCycleMs > 0 ? elapsed % tabataCycleMs : 0;
  const tabataInWork = tabataCycleElapsed < tabataWorkSec * 1000;
  const tabataPhaseRemaining = tabataInWork
    ? Math.max(0, tabataWorkSec * 1000 - tabataCycleElapsed)
    : Math.max(0, tabataCycleMs - tabataCycleElapsed);
  const tabataCurrentRound = Math.min(
    Math.max(1, Math.floor(elapsed / Math.max(1, tabataCycleMs)) + 1),
    Math.max(1, tabataRounds)
  );

  // Track last-known values for phase-driven UI logic
  const prevRef = useRef({
    amrapRemainingMs: 0,
    emomInWorkPhase: true,
    emomRemainingMs: 0,
    tabataInWork: true,
    tabataRemainingMs: 0,
    emomPhaseRemainingMs: 0,
    tabataPhaseRemainingMs: 0,
  });

  // Precise scheduled 3-2-1 end beeps for AMRAP/Tabata using Web Audio (and long beep at 0)
  useEffect(() => {
    if (!running) { endCueTimeoutsRef.current.forEach((id) => clearTimeout(id)); endCueTimeoutsRef.current = []; return; }
    let remaining = 0;
    if (tab === 'amrap') remaining = amrapRemainingMs;
    else if (tab === 'tabata') remaining = tabataRemainingMs;
    else remaining = 0; // EMOM/For-time: do not schedule 3-2-1 here

    if (remaining <= 0) { endCueTimeoutsRef.current.forEach((id) => clearTimeout(id)); endCueTimeoutsRef.current = []; return; }
    if (remaining <= 5000 && !endBeepScheduledRef.current) {
      const now = Date.now();
      const targetAt = now + remaining;
      [3000, 2000, 1000].forEach((m) => {
        if (remaining >= m) scheduleBeepAt(targetAt - m);
      });
      scheduleLongBeepAt(targetAt);
      endBeepScheduledRef.current = true;
      usingEndSchedulerRef.current = true;
    } else if (remaining > 5000) {
      endBeepScheduledRef.current = false; // allow re-arm when getting closer again
      usingEndSchedulerRef.current = false;
    }
  }, [running, tab, amrapRemainingMs, tabataRemainingMs]);

  useEffect(() => {
    const prev = prevRef.current;
    // AMRAP: optional finish cues: last 3,2,1 seconds short beeps based on second-boundary transitions (only if not using scheduled cues); long beep at 0
    if (tab === 'amrap' && running && amrapTargetMs > 0) {
      const prevCeil = Math.ceil(prev.amrapRemainingMs / 1000);
      const curCeil = Math.ceil(amrapRemainingMs / 1000);
      if (
        amrapRemainingMs > 0 &&
        curCeil !== prevCeil &&
        (curCeil === 3 || curCeil === 2 || curCeil === 1) &&
        endCueTimeoutsRef.current.length === 0 &&
        !usingEndSchedulerRef.current
      ) {
        playBeep();
      }
      if (!endBeepScheduledRef.current && !usingEndSchedulerRef.current && amrapRemainingMs <= AUDIO_EARLY_MS && prev.amrapRemainingMs > AUDIO_EARLY_MS) {
        playLongBeep();
        // ensure any pending scheduled beeps are cleared
        endCueTimeoutsRef.current.forEach((id) => clearTimeout(id));
        endCueTimeoutsRef.current = [];
      }
    }

    // EMOM: short beep only when entering WORK phase; long beep at final minute mark
    if (tab === 'emom' && running && emomWorkMs > 0) {
      if (prev.emomInWorkPhase === false && emomInWorkPhase === true && emomRemainingMs > 0) {
        playBeep();
      }
      if (emomTotalMs > 0 && emomRemainingMs === 0 && prev.emomRemainingMs !== 0) {
        playLongBeep();
      }
    }

    // Tabata:
    // - Work -> Rest: short beep at boundary
    // - Rest -> Work: 3-2-1 short beeps (during last 3s of Rest) via ceil second transitions; long beep at Work start
    // - Optional: short beep at last 3 seconds of every Work interval via ceil transitions
    // - Finish: long beep at end of final interval
    if (tab === 'tabata' && running && tabataCycleMs > 0) {
      // Transitions
      if (prev.tabataInWork === true && tabataInWork === false) {
        // Work -> Rest
        playBeep();
      }
      if (prev.tabataInWork === false && tabataInWork === true) {
        // Rest -> Work starts now
        playLongBeep();
      }

      // Countdown beeps before Work starts (during Rest phase)
      if (!tabataInWork) {
        const prevRestCeil = Math.ceil(prev.tabataPhaseRemainingMs / 1000);
        const curRestCeil = Math.ceil(tabataPhaseRemaining / 1000);
        if (
          tabataPhaseRemaining > 0 &&
          curRestCeil !== prevRestCeil &&
          (curRestCeil === 3 || curRestCeil === 2 || curRestCeil === 1) &&
          endCueTimeoutsRef.current.length === 0 &&
          !(usingEndSchedulerRef.current && tabataRemainingMs <= 5000)
        ) {
          playBeep();
        }
      }

      // Optional short beeps at last 3 seconds of Work intervals
      if (tabataInWork) {
        const prevWorkCeil = Math.ceil(prev.tabataPhaseRemainingMs / 1000);
        const curWorkCeil = Math.ceil(tabataPhaseRemaining / 1000);
        if (
          tabataPhaseRemaining > 0 &&
          curWorkCeil !== prevWorkCeil &&
          (curWorkCeil === 3 || curWorkCeil === 2 || curWorkCeil === 1) &&
          endCueTimeoutsRef.current.length === 0 &&
          !(usingEndSchedulerRef.current && tabataRemainingMs <= 5000)
        ) {
          playBeep();
        }
      }

      // Finish long beep at final completion
      if (!endBeepScheduledRef.current && !usingEndSchedulerRef.current && tabataTotalMs > 0 && tabataRemainingMs <= AUDIO_EARLY_MS && prev.tabataRemainingMs > AUDIO_EARLY_MS) {
        playLongBeep();
        endCueTimeoutsRef.current.forEach((id) => clearTimeout(id));
        endCueTimeoutsRef.current = [];
      }
    }

    prevRef.current = {
      amrapRemainingMs,
      emomInWorkPhase,
      emomRemainingMs,
      tabataInWork,
      tabataRemainingMs,
      emomPhaseRemainingMs: emomPhaseRemaining,
      tabataPhaseRemainingMs: tabataPhaseRemaining,
    };
  }, [tab, running, amrapRemainingMs, amrapTargetMs, emomInWorkPhase, emomRemainingMs, emomTotalMs, emomWorkMs, emomPhaseRemaining, tabataInWork, tabataRemainingMs, tabataTotalMs, tabataCycleMs, tabataPhaseRemaining]);

  useEffect(() => {
    // Auto-pause when reaching 0, then hold 1s before revealing finished UI
    const hitAmrap = tab === 'amrap' && running && amrapTargetMs > 0 && amrapRemainingMs === 0;
    const hitEmom = tab === 'emom' && running && emomTotalMs > 0 && emomRemainingMs === 0;
    const hitTabata = tab === 'tabata' && running && tabataTotalMs > 0 && tabataRemainingMs === 0;
    if (hitAmrap || hitEmom || hitTabata) {
      clockRef.current?.pause();
      setRunning(false);
      setPostZeroHold(true);
      if (finishedTimeoutRef.current) { clearTimeout(finishedTimeoutRef.current); }
      finishedTimeoutRef.current = window.setTimeout(() => {
        setPostZeroHold(false);
        setFinished(true);
        fireConfetti();
        finishedTimeoutRef.current = null;
      }, 1000);
    }
  }, [tab, running, amrapRemainingMs, amrapTargetMs, emomRemainingMs, emomTotalMs, tabataRemainingMs, tabataTotalMs]);

  const display = useMemo(() => {
    if (tab === 'amrap') return formatMMSS(amrapRemainingMs);
    if (tab === 'emom') return formatMMSS(emomPhaseRemaining);
    if (tab === 'tabata') return formatMMSS(tabataPhaseRemaining);
    return formatMMSS(elapsed);
  }, [tab, elapsed, amrapRemainingMs, emomPhaseRemaining, tabataPhaseRemaining]);

  const tabBtn = (
    key: "for-time" | "amrap" | "emom" | "tabata",
    label: string,
    enabled = false
  ) => (
    <button
      key={key}
      onClick={() => enabled && setTab(key)}
      className={
        "px-3 py-2 rounded-md text-sm font-medium border " +
        (tab === key
          ? "bg-slate-700 text-white border-slate-600"
          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/60") +
        (enabled ? "" : " opacity-60 cursor-not-allowed")
      }
      aria-pressed={tab === key}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="relative flex items-center">
          <Link href="/" className="absolute left-0">
            <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="mx-auto text-2xl font-bold text-white">WOD Timer Hub</h1>
        </div>

        {/* Volume removed with old audio system */}

        {/* Tabs */}
        <div className="flex gap-2 justify-center flex-wrap">
          {tabBtn("for-time", "For Time", true)}
          {tabBtn("amrap", "AMRAP", true)}
          {tabBtn("emom", "EMOM", true)}
          {tabBtn("tabata", "Tabata", true)}
        </div>

        {/* Timer Card */}
        {tab === 'for-time' && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 text-center">
            <div className="text-slate-300 text-sm mb-2">For Time</div>
            <div className="text-6xl md:text-7xl font-mono tracking-widest select-none">
              {display}
            </div>
            <div className="mt-6 flex gap-3 justify-center">
              {!running ? (
                <Button className="fortress-button h-12 px-6" onClick={onStart}>Start</Button>
              ) : (
                <Button className="fortress-button h-12 px-6" onClick={onPause}>Pause</Button>
              )}
              <Button className="h-12 px-6 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600" onClick={onReset}>Reset</Button>
            </div>
          </div>
        )}

        {tab === 'emom' && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 text-center space-y-5">
            <div className="text-slate-300 text-sm">EMOM</div>

            {/* Stacked inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-3">
                <div className="text-right uppercase tracking-widest text-slate-300 text-sm">Every</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  value={emomMin}
                  onChange={(e) => setEmomMin(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                  className="w-full rounded-md bg-slate-900/60 border border-slate-600 px-3 py-3 text-white text-center text-xl font-mono appearance-none [appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="text-left uppercase tracking-widest text-slate-300 text-sm">Minutes</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-3">
                <div className="text-right uppercase tracking-widest text-slate-300 text-sm">And</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  value={emomSec}
                  onChange={(e) => setEmomSec(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                  className="w-full rounded-md bg-slate-900/60 border border-slate-600 px-3 py-3 text-white text-center text-xl font-mono appearance-none [appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="text-left uppercase tracking-widest text-slate-300 text-sm">Seconds</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-3">
                <div className="text-right uppercase tracking-widest text-slate-300 text-sm">For</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  value={emomRounds}
                  onChange={(e) => setEmomRounds(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  className="w-full rounded-md bg-slate-900/60 border border-slate-600 px-3 py-3 text-white text-center text-xl font-mono appearance-none [appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="text-left uppercase tracking-widest text-slate-300 text-sm">Rounds</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-3">
                <div className="text-right uppercase tracking-widest text-slate-300 text-sm">Rest</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={300}
                  value={emomRestSec}
                  onChange={(e) => setEmomRestSec(Math.max(0, Math.min(300, Number(e.target.value) || 0)))}
                  className="w-full rounded-md bg-slate-900/60 border border-slate-600 px-3 py-3 text-white text-center text-xl font-mono appearance-none [appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="text-left uppercase tracking-widest text-slate-300 text-sm">Seconds</div>
              </div>
            </div>

            <div className="text-slate-300 text-sm">Round {emomCurrentRound} / {Math.max(1, emomRounds)} — {emomInWorkPhase ? 'Work' : 'Rest'}</div>
            <div className="text-6xl md:text-7xl font-mono tracking-widest select-none">
              {display}
            </div>
            <div className="flex gap-3 justify-center">
              {!running ? (
                <Button className="fortress-button h-12 px-6" onClick={onStart} disabled={emomWorkMs <= 0 || emomRounds <= 0}>Start</Button>
              ) : (
                <Button className="fortress-button h-12 px-6" onClick={onPause}>Pause</Button>
              )}
              <Button
                className="h-12 px-6 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600"
                onClick={onReset}
              >
                Reset
              </Button>
            </div>
          </div>
        )}

        {tab === 'tabata' && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 text-center space-y-5">
            <div className="text-slate-300 text-sm">Tabata</div>

            {/* Stacked inputs like mockup */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-3">
                <div className="text-right uppercase tracking-widest text-slate-300 text-sm">For</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  value={tabataRounds}
                  onChange={(e) => setTabataRounds(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className="w-full rounded-md bg-slate-900/60 border border-slate-600 px-3 py-3 text-white text-center text-xl font-mono appearance-none [appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="text-left uppercase tracking-widest text-slate-300 text-sm">Round</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-3">
                <div className="text-right uppercase tracking-widest text-slate-300 text-sm">Work</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={600}
                  value={tabataWorkSec}
                  onChange={(e) => setTabataWorkSec(Math.max(1, Math.min(600, Number(e.target.value) || 1)))}
                  className="w-full rounded-md bg-slate-900/60 border border-slate-600 px-3 py-3 text-white text-center text-xl font-mono appearance-none [appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="text-left uppercase tracking-widest text-slate-300 text-sm">Seconds</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-3">
                <div className="text-right uppercase tracking-widest text-slate-300 text-sm">Rest</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={600}
                  value={tabataRestSec}
                  onChange={(e) => setTabataRestSec(Math.max(1, Math.min(600, Number(e.target.value) || 1)))}
                  className="w-full rounded-md bg-slate-900/60 border border-slate-600 px-3 py-3 text-white text-center text-xl font-mono appearance-none [appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="text-left uppercase tracking-widest text-slate-300 text-sm">Seconds</div>
              </div>
            </div>
            <div className="text-slate-300 text-sm">Round {tabataCurrentRound} / {Math.max(1, tabataRounds)} — {tabataInWork ? 'Work' : 'Rest'}</div>
            <div className="text-6xl md:text-7xl font-mono tracking-widest select-none">
              {display}
            </div>
            <div className="flex gap-3 justify-center">
              {!running ? (
                <Button className="fortress-button h-12 px-6" onClick={onStart} disabled={tabataCycleMs <= 0 || tabataRounds <= 0}>Start</Button>
              ) : (
                <Button className="fortress-button h-12 px-6" onClick={onPause}>Pause</Button>
              )}
              <Button
                className="h-12 px-6 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600"
                onClick={onReset}
              >
                Reset
              </Button>
            </div>
          </div>
        )}

        {tab === 'amrap' && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 text-center space-y-4">
            <div className="text-slate-300 text-sm">AMRAP</div>
            <div className="flex items-center justify-center gap-3 text-sm text-slate-300">
              <label className="flex items-center gap-2">
                <span>Minutes</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={120}
                  value={amrapMin}
                  onChange={(e) => setAmrapMin(Math.max(0, Math.min(120, Number(e.target.value) || 0)))}
                  className="w-20 rounded-md bg-slate-900/60 border border-slate-700 px-3 py-2 text-white text-center appearance-none [appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>Seconds</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  value={amrapSec}
                  onChange={(e) => setAmrapSec(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                  className="w-20 rounded-md bg-slate-900/60 border border-slate-700 px-3 py-2 text-white text-center appearance-none [appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                />
              </label>
            </div>
            <div className="text-6xl md:text-7xl font-mono tracking-widest select-none">
              {display}
            </div>
            <div className="flex gap-3 justify-center">
              {!running ? (
                <Button className="fortress-button h-12 px-6" onClick={onStart} disabled={amrapTargetMs <= 0}>Start</Button>
              ) : (
                <Button className="fortress-button h-12 px-6" onClick={onPause}>Pause</Button>
              )}
              <Button
                className="h-12 px-6 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600"
                onClick={onReset}
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Full-screen prestart countdown overlay */}
      {prestart > 0 && (
        <div
          role="dialog"
          aria-label="Starting countdown"
          className="fixed inset-0 z-[100] fortress-gradient flex items-center justify-center"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)'
          }}
        >
          <div className="text-center space-y-6">
            <div>
              <div className="text-slate-200 text-sm uppercase tracking-widest mb-3">Starting in</div>
              <div className="text-white font-mono font-bold text-[22vw] leading-none select-none">
                {prestart}
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={onCancelPrestart} className="h-16 sm:h-12 px-6 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600">Cancel</Button>
              <Button onClick={onExit} className="h-16 sm:h-12 px-6 fortress-button">Exit</Button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen running/paused/finished overlay */}
      {fullscreenActive && prestart === 0 && (
        <div
          role="dialog"
          aria-label={finished ? "Timer finished" : "Timer running"}
          className="fixed inset-0 z-[100] fortress-gradient"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)'
          }}
        >
          <div className="w-full h-full grid grid-rows-[1fr_auto_1fr]">
            <div />
            <div className="text-center">
              <div className="text-white font-mono font-bold text-[14vw] leading-none select-none">
                {display}
              </div>
            </div>
            <div className="text-center mt-6">
              {finished ? (
                <>
                  <div className="text-white font-extrabold text-[6vw] leading-tight select-none mt-1">Well done!</div>
                  <div className="text-slate-200 text-lg">Great work. Take a breath.</div>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <Button onClick={onConfirmExit} className="h-16 sm:h-14 px-8 fortress-button">Finished!</Button>
                  </div>
                </>
              ) : postZeroHold ? (
                <div className="h-[56px]" />
              ) : (
                <div className="flex items-center justify-center gap-4">
                  {running ? (
                    <Button onClick={onPause} className="h-16 sm:h-14 px-8 fortress-button">Pause</Button>
                  ) : (
                    <Button onClick={onResume} className="h-16 sm:h-14 px-8 fortress-button">Resume</Button>
                  )}
                  <Button onClick={onExit} className="h-16 sm:h-14 px-8 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600">Exit</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global full-screen confirm modal overlay to avoid shifting layout */}
      {confirmExit && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center">
          <div role="dialog" aria-modal="true" aria-label="Confirm exit" className="mx-4 max-w-sm w-full bg-slate-800 border border-slate-700 rounded-xl p-5 text-slate-200 shadow-xl">
            <div className="mb-4 text-base font-medium">Are you sure?</div>
            <div className="flex justify-center gap-3">
              <Button onClick={onConfirmExit} className="fortress-button h-11 px-6">Yes</Button>
              <Button onClick={onCancelExit} className="h-11 px-6 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
