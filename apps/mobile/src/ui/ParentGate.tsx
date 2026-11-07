/**
 * The one adult check used for every parent-only action (reset, online duels, age/class change, Google sign-in…).
 * - A fresh 2-digit × 2-digit multiplication each time it opens (beyond what the 6–14 drills cover), answered by typing
 *   on a keypad whose keys are shuffled — no multiple choice to guess.
 * - A wrong answer says so and swaps in a new question; 3 wrong answers lock the gate for 60 s (kept on the phone,
 *   so closing the sheet or restarting the app doesn't skip the wait).
 * `onPass` runs only after the right answer, once the sheet has closed.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sheet, T, Button, PressScale, Shake } from './index';
import { colors, radius } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { tap } from '@/lib/audio';

const MAX_TRIES = 3;
const LOCK_MS = 60_000;
const LOCK_KEY = 'konesans-gate-lock';
let lockUntil = 0; // shared by every gate in the app
AsyncStorage.getItem(LOCK_KEY).then((v) => { const n = Number(v); if (n > lockUntil) lockUntil = n; }).catch(() => {});

const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
/** 13–39 × 12–19, never a round ten: 156 … 741, too big for a times-table guess. */
export function newGateProblem() {
  let a = randInt(13, 39), b = randInt(12, 19);
  while (a % 10 === 0) a = randInt(13, 39);
  if (Math.random() < 0.5) [a, b] = [b, a];
  return { a, b, answer: a * b };
}
function shuffledKeys() {
  const d = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

export function ParentGate({ open, title, note, onPass, onClose }: { open: boolean; title: string; note?: string; onPass: () => void; onClose: () => void }) {
  const t = useT();
  const [p, setP] = useState(newGateProblem);
  const [keys, setKeys] = useState(shuffledKeys);
  const [typed, setTyped] = useState('');
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState(0); // bumps on each miss (shake + message)
  const [now, setNow] = useState(Date.now());
  const locked = lockUntil > now;
  // every opening: a new question and a new key order
  useEffect(() => { if (open) { setP(newGateProblem()); setKeys(shuffledKeys()); setTyped(''); setWrong(0); setNow(Date.now()); } }, [open]);
  useEffect(() => {
    if (!open || !locked) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [open, locked]);
  const secs = Math.ceil((lockUntil - now) / 1000);

  const press = (k: string) => { if (locked) return; tap(); setTyped((s) => (k === '⌫' ? s.slice(0, -1) : s.length < 5 ? s + k : s)); };
  const submit = () => {
    if (locked || !typed) return;
    if (Number(typed) === p.answer) {
      tap('success'); setMisses(0); onClose(); setTimeout(onPass, 260);
      return;
    }
    tap('error');
    const m = misses + 1;
    if (m >= MAX_TRIES) {
      lockUntil = Date.now() + LOCK_MS; AsyncStorage.setItem(LOCK_KEY, String(lockUntil)).catch(() => {});
      setMisses(0); setNow(Date.now());
    } else setMisses(m);
    setWrong((w) => w + 1); setTyped(''); setP(newGateProblem()); setKeys(shuffledKeys());
  };
  const grid = useMemo(() => [...keys.slice(0, 9), '⌫', keys[9], 'OK'], [keys]);

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      {note ? <T v="small" center color={colors.muted}>{note}</T> : null}
      {locked ? (
        <T v="bold" center color={colors.red} style={{ paddingVertical: 18 }}>{t('pg_locked', { n: secs })}</T>
      ) : (
        <>
          <T v="bold" center>{t('pg_ask', { a: p.a, b: p.b })}</T>
          <Shake trigger={wrong || null}>
            <View accessibilityLabel={t('pg_type')} style={{ alignSelf: 'center', minWidth: 150, minHeight: 52, borderBottomWidth: 4, borderBottomColor: wrong ? colors.red : colors.blue, alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontFamily: 'Baloo2_800ExtraBold', fontSize: 34, lineHeight: 42 }} color={colors.blue}>{typed || ' '}</T>
            </View>
          </Shake>
          {wrong > 0 ? <T v="small" center color={colors.red}>{t('pg_wrong')}</T> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
            {grid.map((k) => {
              const ok = k === 'OK';
              return (
                <PressScale key={k} role="button" debounceMs={0} scaleTo={0.92} accessibilityLabel={k === '⌫' ? t('pg_erase') : ok ? t('pg_ok') : k}
                  disabled={ok && !typed} onPress={() => (ok ? submit() : press(k))}
                  style={({ pressed }) => [{ width: '31.5%', minHeight: 50, borderRadius: radius.md, backgroundColor: ok ? colors.blue : k === '⌫' ? colors.redSoft : colors.card, borderWidth: 2, borderColor: ok ? colors.blue : colors.line, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center', opacity: ok && !typed ? 0.5 : 1 }, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}>
                  <T v="h2" color={ok ? '#FFFFFF' : k === '⌫' ? colors.red : colors.ink}>{ok ? t('pg_ok') : k}</T>
                </PressScale>
              );
            })}
          </View>
        </>
      )}
      <Button variant="ghost" title={t('close')} onPress={onClose} />
    </Sheet>
  );
}
