import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { coursePath, courseSummary, courseById, type CourseId } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Progress, Stars, Icon, Motif } from '@/ui';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT, useL } from '@/lib/i18n';
import { tap } from '@/lib/audio';

export default function Course() {
  const t = useT(); const l = useL();
  const { courses, courseLang: lang, setCourseLang: setLang } = useStore();
  const path = coursePath(lang, courses[lang]);
  const sum = courseSummary(lang, courses[lang]);
  const accent = lang === 'en' ? colors.blue : colors.teal;
  const course = courseById(lang);
  const current = path.find((u) => u.lessons.some((x) => x.state === 'open')) ?? path[path.length - 1];

  return (
    <Screen bottom={<BottomNav />}>
      <Row>
        <View style={{ flex: 1 }}>
          <T v="display">{l(course.name)}</T>
          <T v="small" color={colors.muted}>{t('learn_in', { x: l(course.name).toLowerCase() })}</T>
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderWidth: 2, borderColor: colors.line, borderRadius: 14, padding: 3, gap: 2 }}>
          {(['en', 'es'] as CourseId[]).map((id) => (
            <Pressable role="button" key={id} onPress={() => { tap(); setLang(id); }} style={{ minWidth: 48, minHeight: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: lang === id ? accent : 'transparent' }}>
              <T v="h3" color={lang === id ? '#fff' : colors.muted}>{id.toUpperCase()}</T>
            </Pressable>
          ))}
        </View>
      </Row>

      <View style={{ backgroundColor: accent, borderRadius: 22, padding: 18, gap: 6, borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <Motif kind="drapo" opacity={0.2} height={130} />
        <T v="label" color="#E6ECFB">{t('unit').toUpperCase()} {path.indexOf(current) + 1} · {current.emoji}</T>
        <T v="h1" color="#fff">{current.title}</T>
        <Row>
          <Progress style={{ flex: 1 }} value={sum.lessonsTotal ? sum.lessonsDone / sum.lessonsTotal : 0} color="#fff" track="rgba(255,255,255,0.3)" />
          <T v="small" color="#E6ECFB">{sum.lessonsDone} / {sum.lessonsTotal} {t('lesson')} · {sum.wordsLearned} {t('words')}</T>
        </Row>
      </View>

      {path.map((u, ui) => (
        <View key={u.id} style={{ gap: 10 }}>
          <Row>
            <T v="h2" style={{ flex: 1 }}>{u.emoji} {u.title}</T>
            <T v="small" color={colors.muted}>{u.done}/{u.total}</T>
          </Row>
          {u.lessons.map((ls, i) => {
            const locked = ls.state === 'locked';
            const done = ls.state === 'done';
            return (
              <Card key={ls.id} onPress={locked ? undefined : () => router.push(`/course/${lang}/${ls.id}`)}
                edge={ls.state === 'open' ? accent : colors.line} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: locked ? 0.55 : 1, marginLeft: (i % 3) * 18 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: done ? colors.green : ls.state === 'open' ? accent : colors.line, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: done ? '#1E7A33' : ls.state === 'open' ? 'rgba(0,0,0,0.2)' : colors.lineStrong }}>
                  {done ? <T v="h2" color="#fff">✓</T> : locked ? <Icon name="femen_kle" size={26} /> : <Icon name="zetwal_gri" size={28} />}
                </View>
                <View style={{ flex: 1 }}>
                  <T v="h3">{ls.title}</T>
                  {done ? <Stars n={ls.stars} size={14} /> : <T v="small" color={ls.state === 'open' ? accent : colors.muted}>{locked ? t('locked') : t('start_lesson')}</T>}
                </View>
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}
