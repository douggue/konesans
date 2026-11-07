import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { categoryLevel } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Progress, IconTile, PressScale, FadeIn } from '@/ui';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { useCategories, hasContent } from '@/lib/content';
import { useFeatures } from '@/lib/remote';
import { tap } from '@/lib/audio';
import { usePrefs } from '@/lib/prefs';
import { LevelPicker } from '@/ui/LevelPicker';

/** Difficulty instead of an age switch: the age band is set at sign-up and changed only by request (admin approves). */

export default function Categories() {
  const t = useT();
  const { profile, stats } = useStore();
  const { difficulty, setDifficulty } = usePrefs();
  const cats = useCategories().filter((c) => c.ages.includes(profile.age));
  const features = useFeatures();
  return (
    <Screen bottom={<BottomNav />}>
      <View><T v="display">{t('categories')}</T><T v="body" color={colors.muted}>{t('cat_sub')}</T></View>
      {features.math && <FadeIn delay={60}><Card onPress={() => router.push('/math')} soft={colors.orangeSoft} edge={colors.orange} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconTile name="kalkil" bg="#FFFFFF" size={48} />
        <View style={{ flex: 1 }}><T v="h3">{t('math_title')}</T><T v="small" color={colors.muted}>{t('math_60s')} · {stats.mathBest ? t('math_record', { n: stats.mathBest }) : t('math_how_many')}</T></View>
        <T v="h2" color={colors.orange}>›</T>
      </Card></FadeIn>}
      {/* the difficulty sits with what it changes: the categories below (and Peyi), not Kalkil Mantal */}
      <View style={{ gap: 6 }}>
        <T v="label" color={colors.muted}>{t('diff_label').toUpperCase()} · <T v="small" color={colors.muted}>{t('diff_scope')}</T></T>
        <LevelPicker value={difficulty} onChange={setDifficulty} labels={[t('diff_easy'), t('diff_mid'), t('diff_hard')]} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {cats.filter((c) => c.id !== 'peyi' || features.peyi).map((m, idx) => {
          const id = m.id;
          const ok = hasContent(id, profile.age);
          const correct = stats.perCategoryCorrect[id] ?? 0;
          const lvl = categoryLevel(correct);
          const into = lvl >= 10 ? 1 : (correct % 15) / 15; // full bar at the last stage
          return (
            <FadeIn key={id} delay={120 + idx * 45} style={{ width: '47.5%' }}><Card onPress={ok ? () => router.push(id === 'peyi' ? '/peyi' : `/quiz/${id}`) : undefined} style={{ gap: 8, opacity: ok ? 1 : 0.5 }}>
              <Row gap={6}><IconTile name={m.icon as never} bg={m.soft} />{m.isNew && <View style={{ backgroundColor: colors.red, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}><T v="small" color="#fff">{t('new_badge')}</T></View>}</Row>
              <T v="h3">{m[profile.lang]}</T>
              <View style={{ gap: 4 }}>
                <T v="small" color={colors.muted}>{ok ? t('stage', { n: lvl }) : t('soon')}</T>
                <Progress value={ok ? into : 0} color={m.color} />
              </View>
            </Card></FadeIn>
          );
        })}
      </View>
    </Screen>
  );
}
