/** Misyon Jodi a — today's three missions, the daily chest, and the weekly 7/7 mission (design/project/Quests.dc.html). */
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Path, Rect, Defs, LinearGradient, Stop, Polyline } from 'react-native-svg';
import { router } from 'expo-router';
import { chestReady, canOpenChest, weekProgress, emptyMissionLog, msToLocalMidnight, CHEST_BONUS_XP, CHEST_BONUS_COINS, type QuestState, type QuestKind } from '@konesans/core';
import { Screen, T, Row, TopBar, Icon, Progress, CountPill, PressScale, FadeIn, Pop, Bounce, Burst, Confetti, reduceMotion } from '@/ui';
import { RankUpListener } from '@/ui/RankUp';
import { colors } from '@/lib/theme';
import { useStore, todayLocal, KID_TZ } from '@/lib/store';
import { useT, type StrKey } from '@/lib/i18n';
import { useDailyCount } from '@/lib/remote';
import { sfx, tap } from '@/lib/audio';

const INK = '#14213D';
const DONE = '#2F9E44';
const QUEST_META: Record<QuestKind, { title: StrKey; color: string; href: (daily: number) => string }> = {
  win_duel: { title: 'q_k_win_duel', color: '#D21034', href: () => '/duel' },
  finish_lessons: { title: 'q_k_finish_lessons', color: '#1F47B5', href: () => '/course' },
  math_score: { title: 'q_k_math_score', color: '#FF9F43', href: () => '/math' },
  answer_correct: { title: 'q_k_answer_correct', color: '#0E7C86', href: (n) => `/quiz/mix?count=${n}` },
  play_category: { title: 'q_k_play_category', color: '#7048E8', href: () => '/categories' },
  review_mistakes: { title: 'q_k_review_mistakes', color: '#C99400', href: () => '/categories' },
};

/** "Nouvo misyon nan 6 è 12 min", ticking; rolls the quests over at local midnight. */
function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 20_000); return () => clearInterval(id); }, []);
  const day = todayLocal();
  useEffect(() => { if (useStore.getState().progress.questsDay !== day) useStore.getState().touch(); }, [day]);
  const ms = msToLocalMidnight(now, KID_TZ);
  const mins = Math.ceil(ms / 60_000);
  return { h: Math.floor(mins / 60), m: mins % 60 };
}

/** Wooden chest: shakes when ready, lid swings open, a star pops out. */
function Chest({ ready, opened, justOpened }: { ready: boolean; opened: boolean; justOpened: boolean }) {
  const shake = useRef(new Animated.Value(0)).current;
  const lid = useRef(new Animated.Value(opened ? 1 : 0)).current;
  useEffect(() => {
    if (!ready || opened || reduceMotion()) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
      Animated.delay(500),
    ]));
    a.start();
    return () => { a.stop(); shake.setValue(0); };
  }, [ready, opened]);
  useEffect(() => {
    if (!opened) { lid.setValue(0); return; }
    if (!justOpened || reduceMotion()) { lid.setValue(1); return; }
    Animated.spring(lid, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 14 }).start();
  }, [opened]);
  const rot = shake.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: ['0deg', '-8deg', '8deg', '-6deg', '6deg', '0deg'] });
  const S = 96;
  return (
    <Animated.View style={{ width: S, height: S, opacity: ready || opened ? 1 : 0.7, transform: [{ rotate: rot }] }}>
      <Svg width={S} height={S} viewBox="0 0 48 48" style={{ position: 'absolute' }}>
        <Rect x="4" y="18" width="40" height="24" rx="4" fill="#B5651D" stroke={INK} strokeWidth={2.5} />
        <Path d="M4 30h40" stroke="#7A4212" strokeWidth={1.5} />
        {opened && <Path d="M7 21h34v5H7z" fill="#3B1E9C" opacity={0.6} />}
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: S, height: S, transformOrigin: '12% 54%', transform: [{ translateY: lid.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }, { rotate: lid.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-32deg'] }) }] }}>
        <Svg width={S} height={S} viewBox="0 0 48 48">
          <Path d="M4 22a20 10 0 0 1 40 0v4H4z" fill="#D98A3A" stroke={INK} strokeWidth={2.5} />
          <Path d="M10 17a16 7 0 0 1 12-4" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={2} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Svg width={S} height={S} viewBox="0 0 48 48" style={{ position: 'absolute' }} pointerEvents="none">
        {!opened && <Rect x="20" y="20" width="8" height="10" rx="2" fill="#FFD43B" stroke={INK} strokeWidth={2} />}
        {opened && <Rect x="20" y="27" width="8" height="7" rx="2" fill="#FFD43B" stroke={INK} strokeWidth={2} />}
      </Svg>
      {opened && (
        <Pop delay={justOpened ? 220 : 0} from={0.2} rotate={-40} style={{ position: 'absolute', left: 22, top: -6, width: 60, alignItems: 'center' }}>
          <Svg width={46} height={46} viewBox="0 0 24 24"><Path d="M12 2l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 15.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="#FFD43B" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" /></Svg>
        </Pop>
      )}
    </Animated.View>
  );
}

/** "+100 XP" floating up from the chest. */
function FloatUp({ children, delay }: { children: React.ReactNode; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 1500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  return <Animated.View pointerEvents="none" style={{ opacity: v.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, -70] }) }, { scale: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.15, 1] }) }] }}>{children}</Animated.View>;
}

function QuestRow({ q, i, onGo }: { q: QuestState; i: number; onGo: () => void }) {
  const t = useT();
  const meta = QUEST_META[q.kind];
  const v = Math.min(q.progress, q.goal);
  const c = q.done ? DONE : meta.color;
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderBottomWidth: 5, borderColor: q.done ? colors.greenLight : colors.line, opacity: q.done ? 0.9 : 1 }}>
      <Bounce trigger={q.done ? q.id : null} amount={0.15}>
        <View style={{ width: 50, height: 50, borderRadius: 15, borderWidth: 2, borderColor: INK, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}>
          {q.done
            ? <Pop delay={200 + i * 80}><Svg width={30} height={30} viewBox="0 0 24 24"><Polyline points="20 6 9 17 4 12" fill="none" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" /></Svg></Pop>
            : <T v="h1" color="#FFFFFF" style={{ fontSize: 22, lineHeight: 26 }}>{i + 1}</T>}
        </View>
      </Bounce>
      <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
        <T v="h3" style={{ lineHeight: 19 }}>{t(meta.title, { n: q.goal })}</T>
        <Row gap={8}>
          <Progress style={{ flex: 1 }} value={v / q.goal} color={c} height={8} />
          <T v="small" color={colors.muted} style={{ fontVariant: ['tabular-nums'] }}>{v} / {q.goal}</T>
        </Row>
      </View>
      {q.done
        ? <T v="bold" color={DONE}>+{q.xp}</T>
        : <PressScale role="button" accessibilityLabel={`${t('q_go')}: ${t(meta.title, { n: q.goal })}`} scaleTo={0.92} onPress={() => { tap(); sfx('tap'); onGo(); }}
            style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.blue, borderWidth: 2, borderColor: INK, borderBottomWidth: 5, alignItems: 'center', justifyContent: 'center' }, pressed && { borderBottomWidth: 2, transform: [{ translateY: 3 }] }]}>
            <T v="h3" color="#FFFFFF">{t('q_go')}</T>
          </PressScale>}
    </View>
  );
}

export default function Quests() {
  const t = useT();
  const daily = useDailyCount();
  const progress = useStore((s) => s.progress);
  const missions = useStore((s) => s.missions) ?? emptyMissionLog();
  const { h, m } = useCountdown();
  const day = todayLocal();
  const quests = progress.questsDay === day ? progress.quests : [];
  const doneN = quests.filter((q) => q.done).length;
  const all = chestReady(progress) && progress.questsDay === day;
  const opened = missions.chestDay === day;
  const [justOpened, setJustOpened] = useState(false);
  const week = weekProgress(missions, day);
  const days = t('q_days').split(' ');

  function open() {
    if (!canOpenChest(missions, progress, day)) return;
    const r = useStore.getState().openChest();
    if (!r) return;
    tap('success'); sfx('badge');
    setJustOpened(true);
    setTimeout(() => sfx('coin'), 450);
    setTimeout(() => sfx('coin'), 800);
  }

  const title = opened ? t('q_chest_got', { xp: CHEST_BONUS_XP, c: CHEST_BONUS_COINS }) : all ? t('q_chest_ready') : t('q_chest_progress', { n: doneN });
  const sub = opened ? t('q_chest_tomorrow') : all ? t('q_chest_tap') : t('q_chest_hint');

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <FadeIn><TopBar title={t('q_title')} sub={h > 0 ? t('q_new_in', { h, m }) : t('q_new_in_min', { m })}
          right={<CountPill value={progress.coins} k="coins" icon="kob" color="#5C4600" bg={colors.yellowSoft} />} /></FadeIn>

        {/* Daily chest */}
        <FadeIn delay={60}>
          <View>
          <View style={{ borderRadius: 24, borderWidth: 3, borderColor: INK, borderBottomWidth: 8, overflow: 'hidden' }}>
            <Svg width="100%" height="100%" style={{ position: 'absolute' }} preserveAspectRatio="none" viewBox="0 0 100 100">
              <Defs><LinearGradient id="kns-chest" x1="0.2" y1="0" x2="0.8" y2="1"><Stop offset="0" stopColor="#7048E8" /><Stop offset="1" stopColor="#3B1E9C" /></LinearGradient></Defs>
              <Rect width="100" height="100" fill="url(#kns-chest)" />
            </Svg>
            <PressScale role="button" disabled={!all || opened} accessibilityLabel={all && !opened ? t('q_open_chest') : t('q_chest')} scaleTo={0.97} onPress={open}
              style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View>
                <Chest ready={all} opened={opened} justOpened={justOpened} />
                <Burst trigger={justOpened ? 'open' : null} count={14} radius={90} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <T v="label" color="#D0BFFF">{t('q_chest')}</T>
                {justOpened ? <Pop><T v="h2" color="#FFFFFF" style={{ fontSize: 22, lineHeight: 25 }}>{title}</T></Pop> : <T v="h2" color="#FFFFFF" style={{ fontSize: 22, lineHeight: 25 }}>{title}</T>}
                <T v="bold" color="#E5DBFF" style={{ fontSize: 14, lineHeight: 19 }}>{sub}</T>
                <Progress value={opened ? 1 : doneN / 3} color={colors.yellow} track="rgba(255,255,255,0.25)" height={10} style={{ marginTop: 4 }} />
              </View>
            </PressScale>
          </View>
            {justOpened && (
              <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 40, flexDirection: 'row', gap: 6 }}>
                <FloatUp delay={300}><View style={{ backgroundColor: colors.yellow, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 8 }}><T v="bold" color={INK}>+{CHEST_BONUS_XP} XP</T></View></FloatUp>
                <FloatUp delay={650}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFFFFF', borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 6 }}><Icon name="kob" size={16} /><T v="bold" color="#5C4600">+{CHEST_BONUS_COINS}</T></View></FloatUp>
              </View>
            )}
          </View>
        </FadeIn>

        {/* Today's quests */}
        <View style={{ gap: 10 }}>
          {quests.map((q, i) => (
            <FadeIn key={q.id} delay={120 + i * 70}><QuestRow q={q} i={i} onGo={() => router.push(QUEST_META[q.kind].href(daily) as never)} /></FadeIn>
          ))}
        </View>

        {/* Weekly mission */}
        <FadeIn delay={360}>
          <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: week.complete ? colors.yellowDark : colors.line, borderBottomWidth: 5, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, gap: 12 }}>
            <Row gap={12}>
              <Icon name="kalandriye" size={40} />
              <View style={{ flex: 1 }}>
                <T v="h3" style={{ fontSize: 15 }}>{t('q_week', { n: week.done })}</T>
                <T v="small" color={colors.muted} style={{ fontSize: 13, lineHeight: 17 }}>{week.complete ? t('q_week_done') : t('q_week_sub')}</T>
              </View>
              <Icon name="ewo" size={34} />
            </Row>
            <Row gap={6} style={{ justifyContent: 'space-between' }}>
              {week.days.map((d, i) => (
                <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                  <View style={{ width: '100%', height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: d.full ? colors.greenLight : d.today ? colors.yellowSoft : d.future ? colors.bg : colors.line, borderWidth: 2, borderColor: d.full ? DONE : d.today ? colors.yellowDark : 'transparent' }}>
                    {d.full ? <Pop delay={420 + i * 50}><Svg width={16} height={16} viewBox="0 0 24 24"><Polyline points="20 6 9 17 4 12" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></Svg></Pop> : null}
                  </View>
                  <T v="small" color={d.today ? colors.ink : colors.muted}>{days[i]}</T>
                </View>
              ))}
            </Row>
          </View>
        </FadeIn>
      </Screen>
      {justOpened && <Confetti count={22} />}
      <RankUpListener delayMs={1600} />
    </View>
  );
}
