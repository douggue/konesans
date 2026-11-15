/**
 * Answer feedback, shared by the quiz, lesson, Vwayaj and Defi Jodi a screens.
 * - `AnswerFeedbackSheet`: a full-width tinted panel that slides up from the bottom of the screen (pass it as
 *   <Screen bottom={…}>): icon + a varied praise / encouragement, the right answer when wrong, the explanation,
 *   Ti Zwazo reacting, and one big "Kontinye" button always in the same place under the thumb.
 *   6–8 mode: bigger title, and (voice on) the praise and right answer are read aloud.
 * - `StreakLabel`: "N swit" over the progress bar when the kid has 2+ right answers in a row.
 * The screens keep their own logic (timers, quit guards, sounds on pick); this file is only the look.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, Row, Button, Icon, Mascot, DEEP_GREEN } from './index';
import { Pop, Bounce, reduceMotion, smooth } from './motion';
import { colors } from '@/lib/theme';
import { useT, type StrKey } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { speak } from '@/lib/audio';

const OK_KEYS: StrKey[] = ['fb_ok_1', 'fb_ok_2', 'fb_ok_3', 'fb_ok_4', 'fb_ok_5', 'fb_ok_6'];
const NO_KEYS: StrKey[] = ['fb_no_1', 'fb_no_2', 'fb_no_3', 'fb_no_4'];
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

/** Right answers in a row at the end of the list (the "N swit" label). */
export const trailingStreak = (results: boolean[]) => { let n = 0; for (let i = results.length - 1; i >= 0 && results[i]; i--) n++; return n; };

export const FEEDBACK = {
  right: { bg: colors.greenSoft, edge: colors.green, ink: '#12632F', btn: colors.green, mood: 'cheer' as const },
  wrong: { bg: colors.redSoft, edge: colors.red, ink: '#8F0A22', btn: colors.red, mood: 'think' as const },
};

export function AnswerFeedbackSheet({ correct, timedOut, answer, explain, points, seed, streak = 0, onContinue }: {
  correct: boolean; timedOut?: boolean;
  /** the right answer, shown (and read to 6–8 kids) when the kid was wrong */
  answer?: string;
  explain?: string;
  /** points just won (quiz modes) */
  points?: number;
  /** same seed → same praise (one per question, stable across re-renders) */
  seed: string | number;
  /** right answers in a row, including this one: from 3 the sheet says so */
  streak?: number;
  onContinue: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const young = useStore((s) => s.profile.age) === '6-8';
  const voice = useStore((s) => s.settings.voice);
  const lang = useStore((s) => s.profile.lang);
  const m = correct ? FEEDBACK.right : FEEDBACK.wrong;
  const title = useMemo(() => {
    if (correct) return t(OK_KEYS[hash(String(seed)) % OK_KEYS.length]);
    if (timedOut) return t('fb_timeout');
    return t(NO_KEYS[hash(String(seed)) % NO_KEYS.length]);
  }, [seed, correct, timedOut, lang]);

  // slide up (springy end), the icon pops after it
  const v = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion()) return;
    Animated.timing(v, { toValue: 1, duration: 360, easing: smooth, useNativeDriver: true }).start();
  }, []);
  // 6–8: they may not read yet — say it
  useEffect(() => {
    if (!young || !voice) return;
    speak(correct || !answer ? title : `${title} ${t('fb_right_answer')} ${answer}`, lang === 'fr' ? 'fr' : 'ht');
  }, []);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: m.bg, borderTopWidth: 3, borderTopColor: m.edge,
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 + Math.max(insets.bottom, 4), gap: 10,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [280, 0] }) }],
      }}>
      <Row gap={12} center={false}>
        <Pop delay={160} from={0.3} rotate={-20}>
          <View style={{ width: young ? 48 : 40, height: young ? 48 : 40, borderRadius: 24, backgroundColor: correct ? DEEP_GREEN : colors.red, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.22)' }}>
            <T v="h2" color="#FFFFFF" style={{ fontSize: young ? 26 : 22, lineHeight: young ? 30 : 26 }}>{correct ? '✓' : '✕'}</T>
          </View>
        </Pop>
        <View style={{ flex: 1, gap: 2, justifyContent: 'center', minHeight: young ? 48 : 40 }}>
          <T v={young ? 'display' : 'h1'} color={m.ink} style={young ? { fontSize: 28, lineHeight: 32 } : undefined}>{title}</T>
          {correct && (points ?? 0) > 0 || streak >= 3 ? (
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {correct && (points ?? 0) > 0 ? <Bounce trigger={points} amount={0.15}><T v="bold" color={m.ink}>{t('fb_points', { n: points! })}</T></Bounce> : null}
              {correct && streak >= 3 ? <Row gap={2}><Icon name="seri" size={18} /><T v="bold" color="#A63A0A">{t('fb_streak', { n: streak })}</T></Row> : null}
            </Row>
          ) : null}
        </View>
        <View style={{ marginTop: -6, marginRight: -6 }}><Mascot size={young ? 72 : 64} mood={correct ? m.mood : timedOut ? 'nervous' : m.mood} /></View>
      </Row>
      {/* a long explanation (big text, small phone) scrolls inside the sheet: the question above stays reachable */}
      <ScrollView style={{ maxHeight: height * 0.3, flexGrow: 0 }} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
      {!correct && answer ? (
        <View style={{ gap: 0 }}>
          <T v="bold" color={m.ink}>{t('fb_right_answer')}</T>
          <T v={young ? 'h2' : 'h3'} color={colors.ink}>{answer}</T>
        </View>
      ) : null}
      {explain ? (
        <View style={{ gap: 0 }}>
          {correct ? <T v="bold" color={m.ink}>{t('fb_did_you_know')}</T> : null}
          <T v="body" color={colors.ink}>{explain}</T>
        </View>
      ) : null}
      </ScrollView>
      <Button title={t('continue')} color={m.btn} onPress={onContinue} style={{ marginTop: 2, minHeight: young ? 60 : 54 }} />
    </Animated.View>
  );
}

/** "🔥 N swit" over a progress bar (2+ right answers in a row). Pops each time it grows. */
export function StreakLabel({ n }: { n: number }) {
  const t = useT();
  const show = n >= 2;
  return (
    <View style={{ minHeight: 20, justifyContent: 'flex-end' }} accessible={show} accessibilityLabel={show ? t('fb_streak_a11y', { n }) : undefined}>
      {show ? (
        <Bounce trigger={n} amount={0.18} style={{ alignSelf: 'flex-start' }}>
          <Row gap={3}><Icon name="seri" size={16} /><T v="label" color="#A63A0A">{t('fb_streak', { n }).toUpperCase()}</T></Row>
        </Bounce>
      ) : null}
    </View>
  );
}

/** The white footer that holds a lesson's "Verifye" button where the feedback sheet will appear. */
export function ActionFooter({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 + Math.max(insets.bottom, 4), borderTopWidth: 2, borderTopColor: colors.line, backgroundColor: colors.bg }}>{children}</View>;
}
