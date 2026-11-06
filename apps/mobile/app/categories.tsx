import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { categoryLevel, type Difficulty } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Progress, IconTile, PressScale, FadeIn } from '@/ui';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { useCategories, hasContent } from '@/lib/content';
import { useFeatures } from '@/lib/remote';
import { tap } from '@/lib/audio';
import { usePrefs } from '@/lib/prefs';

/** Difficulty instead of an age switch: the age band is set at sign-up and changed only by request (admin approves). */
const LEVELS: { d: Difficulty; key: 'diff_easy' | 'diff_mid' | 'diff_hard'; color: string }[] = [
  { d: 1, key: 'diff_easy', color: colors.green }, { d: 2, key: 'diff_mid', color: colors.orange }, { d: 3, key: 'diff_hard', color: colors.red },
];

export default function Categories() {
  const t = useT();
  const { profile, stats } = useStore();
  const { difficulty, setDifficulty } = usePrefs();
  const cats = useCategories().filter((c) => c.ages.includes(profile.age));
  const features = useFeatures();
  return (
    <Screen bottom={<BottomNav />}>
      <View><T v="display">{t('categories')}</T><T v="body" color={colors.muted}>{t('cat_sub')}</T></View>
      <View style={{ gap: 6 }}>
        <T v="label" color={colors.muted}>{t('diff_label').toUpperCase()}</T>
        <Row gap={8}>
          {LEVELS.map(({ d, key, color }) => {
            const on = d === difficulty;
            return (
              <PressScale debounceMs={0} role="button" key={d} accessibilityState={{ selected: on }} onPress={() => { tap(); setDifficulty(d); }}
                style={{ flex: 1, minHeight: 48, borderRadius: 16, borderWidth: 2, borderBottomWidth: on ? 2 : 4, borderColor: on ? color : colors.line, backgroundColor: on ? color : colors.card, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 2 }}>{[1, 2, 3].map((k) => <View key={k} style={{ width: 5, height: 6 + k * 3, borderRadius: 2, alignSelf: 'flex-end', backgroundColor: k <= d ? (on ? '#fff' : color) : (on ? 'rgba(255,255,255,0.35)' : colors.line) }} />)}</View>
                <T v="bold" color={on ? '#fff' : colors.ink}>{t(key)}</T>
              </PressScale>
            );
          })}
        </Row>
      </View>
      {features.math && <FadeIn delay={60}><Card onPress={() => router.push('/math')} soft={colors.orangeSoft} edge={colors.orange} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconTile name="kalkil" bg="#FFFFFF" size={48} />
        <View style={{ flex: 1 }}><T v="h3">{t('math_title')}</T><T v="small" color={colors.muted}>{t('math_60s')} · {stats.mathBest ? t('math_record', { n: stats.mathBest }) : t('math_how_many')}</T></View>
        <T v="h2" color={colors.orange}>›</T>
      </Card></FadeIn>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {cats.filter((c) => c.id !== 'peyi' || features.peyi).map((m, idx) => {
          const id = m.id;
          const ok = hasContent(id, profile.age);
          const correct = stats.perCategoryCorrect[id] ?? 0;
          const lvl = categoryLevel(correct);
          const into = (correct % 15) / 15;
          return (
            <FadeIn key={id} delay={120 + idx * 45} style={{ width: '47.5%' }}><Card onPress={ok ? () => router.push(id === 'peyi' ? '/peyi' : `/quiz/${id}`) : undefined} style={{ gap: 8, opacity: ok ? 1 : 0.5 }}>
              <Row gap={6}><IconTile name={m.icon as never} bg={m.soft} />{m.isNew && <View style={{ backgroundColor: colors.red, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}><T v="small" color="#fff">{t('new_badge')}</T></View>}</Row>
              <T v="h3">{m[profile.lang]}</T>
              <View style={{ gap: 4 }}>
                <T v="small" color={colors.muted}>{ok ? `${t('level')} ${lvl}` : t('soon')}</T>
                <Progress value={ok ? into : 0} color={m.color} />
              </View>
            </Card></FadeIn>
          );
        })}
      </View>
    </Screen>
  );
}
