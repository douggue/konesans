/**
 * Shared plumbing for timed activities (quiz, Peyi, Vwayaj run…):
 * - `useQuitGuard`: Android back, the swipe-back gesture and browser back open the activity's own "Ou vle kite?" sheet
 *   instead of dropping the kid on Lakay; `leave()` lifts the guard right before navigating away on purpose.
 * - `useQuestionClock`: the per-question countdown. It pauses while the quit sheet is open or the app is in the
 *   background, freezes during the answer feedback, and starts fresh on the next question.
 * - `questionTimeMs`: 6–8 get twice the time (the question is read aloud first and they read slowly).
 * - `scoredNow`: the quiz engine scores against its fixed 15 s; this maps our clock onto it, so a pause, the time spent
 *   reading the feedback, or the longer 6–8 timer never turns a right answer into a "time's up".
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { usePreventRemove } from 'expo-router';
import { QUESTION_TIME_MS, type AgeBand, type SoloSession } from '@konesans/core';

export const questionTimeMs = (age: AgeBand) => (age === '6-8' ? 30_000 : QUESTION_TIME_MS);

export function useQuitGuard(active: boolean, onRequest: () => void) {
  const [leaving, setLeaving] = useState(false);
  const cb = useRef(onRequest); cb.current = onRequest;
  const disable = usePreventRemove(active && !leaving, () => cb.current());
  /** Call right before router.replace/back when the kid really wants to go. */
  return (go: () => void) => { setLeaving(true); disable(); setTimeout(go, 0); };
}

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => { const sub = AppState.addEventListener('change', (s) => setActive(s === 'active')); return () => sub.remove(); }, []);
  return active;
}

/**
 * `key` changes with each question; the clock resets when it starts running for a new key.
 * `running` = a question is on screen and unanswered; `paused` = a sheet is covering it.
 */
export function useQuestionClock({ timeMs, key, running, paused, onTimeout }: { timeMs: number; key: string | number; running: boolean; paused: boolean; onTimeout: () => void }) {
  const [left, setLeft] = useState(timeMs);
  const appActive = useAppActive();
  const live = useRef({ key, base: timeMs, start: 0, on: false });
  const fire = useRef(onTimeout); fire.current = onTimeout;
  const go = running && !paused && appActive;
  useEffect(() => {
    const L = live.current;
    if (running && L.key !== key) { L.key = key; L.base = timeMs; setLeft(timeMs); }
    if (!go) return;
    L.start = Date.now(); L.on = true;
    const b = L.base;
    const id = setInterval(() => {
      const rem = Math.max(0, b - (Date.now() - L.start));
      setLeft(rem);
      if (rem <= 0) { clearInterval(id); L.on = false; L.base = 0; fire.current(); }
    }, 200);
    return () => { clearInterval(id); if (L.on) { L.base = Math.max(0, b - (Date.now() - L.start)); L.on = false; setLeft(L.base); } };
  }, [key, go]);
  /** ms used on the current question so far (pauses excluded) */
  const elapsed = () => { const L = live.current; return timeMs - (L.on ? Math.max(0, L.base - (Date.now() - L.start)) : L.base); };
  return { left, elapsed };
}

/** The `now` to hand to answerSolo so its elapsed time = our clock's, scaled to the engine's 15 s. */
export function scoredNow(s: SoloSession, elapsedMs: number, timeMs: number) {
  return s.questionStartedAt + Math.min(QUESTION_TIME_MS, Math.round((Math.max(0, elapsedMs) * QUESTION_TIME_MS) / timeMs));
}

/** Set by the onboarding trial quiz ("Ann kòmanse!") so onboarding resumes at the age step, not at the language. */
export const onboardingResume = { step: 0 };
