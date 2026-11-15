/**
 * Kou — the course path. A status row (EN/ES, streak, coins), then each unit: a coloured banner card and a winding
 * path of chunky 3D lesson nodes. The current lesson has a progress ring (the unit's progress) and a bobbing
 * "Kòmanse" bubble, with Ti Zwazo waving beside it. Lesson titles stay under the nodes (kids need the words).
 * States: done (unit colour, ✓, stars) · open · retry (orange, "Refè l") · locked (grey, padlock).
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { coursePath, courseSummary, courseById, type CourseId } from '@konesans/core';
import { Screen, T, Row, BottomNav, Progress, Stars, Icon, PressScale, FadeIn, Bob, Pulse, Mascot, DEEP_GREEN } from '@/ui';
import { colors } from '@/lib/theme';
import { Illustration } from '@/ui/Illustration';
import { useStore } from '@/lib/store';
import { useT, useL } from '@/lib/i18n';
import { tap } from '@/lib/audio';

type Path = ReturnType<typeof coursePath>;
type LessonNode = Path[number]['lessons'][number];

/** Unit banner colours (white text ≥ 4.5:1 on each). The first one is the course's own colour. */
const UNIT_COLORS = [DEEP_GREEN, '#A64B00', '#6741D9', colors.red, colors.teal];
const darken = (hex: string, k = 0.28) => {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - k)));
  return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
};
/** The winding: horizontal offsets (px) that repeat down the path. */
const WIND = [0, 46, 70, 46, 0, -46, -70, -46];
const NODE = 72;

export default function Course() {
  const t = useT(); const l = useL();
  const { courses, courseLang: lang, setCourseLang: setLang } = useStore();
  const streak = useStore((s) => s.progress.streak.count);
  const coins = useStore((s) => s.progress.coins);
  const streakOn = useStore((s) => s.kidSettings.streakEnabled);
  const path = coursePath(lang, courses[lang]);
  const sum = courseSummary(lang, courses[lang]);
  const accent = lang === 'en' ? colors.blue : colors.teal;
  const course = courseById(lang);
  // the lesson to play next: the first open one, else the first to redo
  const currentId = (path.flatMap((u) => u.lessons).find((x) => x.state === 'open') ?? path.flatMap((u) => u.lessons).find((x) => x.state === 'retry'))?.id;
  const unitColor = (ui: number) => (ui === 0 ? accent : UNIT_COLORS[(ui - 1) % UNIT_COLORS.length]);
  let k = 0; // running node index across units, so the winding flows from one unit into the next

  return (
    <Screen bottom={<BottomNav />}>
      {/* status row */}
      <Row style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderWidth: 2, borderColor: colors.line, borderRadius: 14, padding: 3, gap: 2 }}>
          {(['en', 'es'] as CourseId[]).map((id) => (
            <PressScale debounceMs={0} role="button" key={id} accessibilityLabel={l(courseById(id).name)} accessibilityState={{ selected: lang === id }} onPress={() => { tap(); setLang(id); }} style={{ minWidth: 48, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: lang === id ? accent : 'transparent' }}>
              <T v="h3" color={lang === id ? '#fff' : colors.muted}>{id.toUpperCase()}</T>
            </PressScale>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        {streakOn ? <StatusChip icon="seri" n={streak} color="#A63A0A" bg="#FFE8DC" label={t('streak')} pulse={streak > 0} /> : null}
        <StatusChip icon="kob" n={coins} color="#5C4600" bg={colors.yellowSoft} label={t('coins')} />
      </Row>
      <View>
        <T v="display">{l(course.name)}</T>
        <T v="small" color={colors.muted}>{t('learn_in', { x: l(course.name).toLowerCase() })} · {sum.lessonsDone} / {sum.lessonsTotal} {t(sum.lessonsTotal === 1 ? 'lesson' : 'lessons')} · {sum.wordsLearned} {t('words')}</T>
      </View>

      {path.map((u, ui) => {
        const c = unitColor(ui);
        return (
          <FadeIn key={lang + u.id} delay={Math.min(ui, 3) * 80} style={{ gap: 6 }}>
            <UnitBanner color={c} n={ui + 1} title={l({ ht: u.title, fr: u.titleFr })} id={u.id} done={u.done} total={u.total} />
            <View style={{ paddingVertical: 12, gap: 14 }}>
              {u.lessons.map((ls) => {
                const x = WIND[k++ % WIND.length];
                return <PathNode key={ls.id} ls={ls} x={x} color={c} current={ls.id === currentId} unitProgress={u.total ? u.done / u.total : 0}
                  title={l({ ht: ls.title, fr: ls.titleFr })} onPress={() => router.push(`/course/${lang}/${ls.id}`)} />;
              })}
            </View>
          </FadeIn>
        );
      })}
      {!currentId ? <View style={{ alignItems: 'center' }}><Mascot size={110} mood="proud" /></View> : null}
    </Screen>
  );
}

function StatusChip({ icon, n, color, bg, label, pulse }: { icon: 'seri' | 'kob'; n: number; color: string; bg: string; label: string; pulse?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${n} ${label}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, borderRadius: 14, paddingVertical: 6, paddingLeft: 8, paddingRight: 12, minHeight: 40 }}>
      {pulse ? <Pulse amount={0.15}><Icon name={icon} size={24} /></Pulse> : <Icon name={icon} size={24} />}
      <T v="h3" color={color} style={{ fontVariant: ['tabular-nums'] }}>{n}</T>
    </View>
  );
}

function UnitBanner({ color, n, title, id, done, total }: { color: string; n: number; title: string; id: string; done: number; total: number }) {
  const t = useT();
  return (
    <View accessibilityRole="header" style={{ backgroundColor: color, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 5, borderBottomColor: darken(color), flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <T v="label" color="#FFFFFF" style={{ opacity: 0.9 }}>{t('cp_unit', { n })}</T>
        <T v="h1" color="#FFFFFF">{title}</T>
        <Row gap={8}>
          <Progress style={{ flex: 1 }} value={total ? done / total : 0} color="#FFFFFF" track="rgba(255,255,255,0.3)" height={8} />
          <T v="small" color="#FFFFFF">{done}/{total}</T>
        </Row>
      </View>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 4 }}><Illustration id={'unit_' + id} size={52} /></View>
    </View>
  );
}

function PathNode({ ls, x, color, current, unitProgress, title, onPress }: { ls: LessonNode; x: number; color: string; current: boolean; unitProgress: number; title: string; onPress: () => void }) {
  const t = useT();
  const locked = ls.state === 'locked';
  const done = ls.state === 'done';
  const retry = ls.state === 'retry'; // played with 1 star: play again for 2 to open the next one
  const fill = locked ? '#D9DEEA' : retry ? colors.orange : color;
  const edge = locked ? '#B5BED0' : darken(fill);
  const stateLabel = locked ? t('locked') : done ? t('cp_done') : retry ? t('lesson_retry_path') : t('start_lesson');
  const ring = NODE + 30;
  const face = () => (
    <View style={{ width: NODE, height: NODE + 8 }}>
      <View style={{ position: 'absolute', top: 8, width: NODE, height: NODE, borderRadius: NODE / 2, backgroundColor: edge }} />
      <View style={{ position: 'absolute', top: 0, width: NODE, height: NODE, borderRadius: NODE / 2, backgroundColor: fill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* a soft highlight, top left: the "3D" sheen */}
        <View style={{ position: 'absolute', top: 10, left: 16, width: 16, height: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ rotate: '-30deg' }] }} />
        {done ? <T v="display" color="#FFFFFF" style={{ fontSize: 34, lineHeight: 38 }}>✓</T>
          : retry ? <Icon name="chanje" size={36} />
          : locked ? <Icon name="femen_kle" size={32} />
          : <T v="display" color="#FFFFFF" style={{ fontSize: 34, lineHeight: 38 }}>★</T>}
      </View>
    </View>
  );
  const mascotLeft = x >= 0;
  return (
    <View style={{ alignItems: 'center' }}>
      {current && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 30, [mascotLeft ? 'left' : 'right']: 0 }}>
          <Bob amount={5}><Mascot size={84} mood="wave" /></Bob>
        </View>
      )}
      <View style={{ alignItems: 'center', transform: [{ translateX: x }] }}>
        {current && (
          <Bob amount={4} duration={1600} style={{ marginBottom: 6, zIndex: 2 }}>
            {/* the bubble says "Kòmanse": tapping it starts the lesson too (kids tap the word, not only the node) */}
            <PressScale role="button" accessibilityLabel={t('cp_node_a11y', { x: title, s: stateLabel })} scaleTo={0.94} onPress={() => { tap(); onPress(); }}
              style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: retry ? colors.orange : colors.line, borderBottomWidth: 4, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4 }}>
              <T v="h3" color={retry ? '#A64B00' : colors.ink} center>{retry ? t('cp_retry') : t('cp_start')}</T>
            </PressScale>
            <View style={{ alignSelf: 'center', width: 12, height: 12, marginTop: -8, backgroundColor: colors.card, borderRightWidth: 2, borderBottomWidth: 4, borderColor: retry ? colors.orange : colors.line, transform: [{ rotate: '45deg' }] }} />
          </Bob>
        )}
        {/* the ring is concentric with the node's face; the 3D edge hangs 8 px under it */}
        <View style={{ width: ring, height: current ? ring + 4 : NODE + 8, alignItems: 'center' }}>
          {current && (
            <Svg width={ring} height={ring} style={{ position: 'absolute', top: 0, left: 0 }}>
              <Circle cx={ring / 2} cy={ring / 2} r={ring / 2 - 5} stroke="#C9D0DE" strokeWidth={8} fill="none" />
              {unitProgress > 0 && <Circle cx={ring / 2} cy={ring / 2} r={ring / 2 - 5} stroke={retry ? colors.orange : color} strokeWidth={8} fill="none" strokeLinecap="round"
                strokeDasharray={`${unitProgress * Math.PI * (ring - 10)} ${Math.PI * (ring - 10)}`} transform={`rotate(-90 ${ring / 2} ${ring / 2})`} />}
            </Svg>
          )}
          <PressScale role="button" disabled={locked} accessibilityLabel={t('cp_node_a11y', { x: title, s: stateLabel })} accessibilityState={{ disabled: locked }} scaleTo={0.94} onPress={() => { tap(); onPress(); }}
            style={{ width: NODE, height: NODE + 8, marginTop: current ? (ring - NODE) / 2 : 0 }}>
            {current && !retry ? <Pulse amount={0.05} duration={1600}>{face()}</Pulse> : face()}
          </PressScale>
        </View>
        <View style={{ width: 150, alignItems: 'center', marginTop: 2 }}>
          <T v="bold" center color={locked ? colors.muted : colors.ink}>{title}</T>
          {(done || retry) && <Stars n={ls.stars} size={14} />}
        </View>
      </View>
    </View>
  );
}
