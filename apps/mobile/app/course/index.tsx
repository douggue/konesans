import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { coursePath, courseSummary, courseById, type CourseId } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Progress, Stars, Icon, Motif, PressScale, FadeIn, Pulse } from '@/ui';
import { colors } from '@/lib/theme';
import { Illustration } from '@/ui/Illustration';
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
            <PressScale debounceMs={0} role="button" key={id} onPress={() => { tap(); setLang(id); }} style={{ minWidth: 48, minHeight: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: lang === id ? accent : 'transparent' }}>
              <T v="h3" color={lang === id ? '#fff' : colors.muted}>{id.toUpperCase()}</T>
            </PressScale>
          ))}
        </View>
      </Row>

      <FadeIn key={lang}><View style={{ backgroundColor: accent, borderRadius: 22, padding: 18, gap: 6, borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <Motif kind="drapo" opacity={0.2} height={130} />
        <Row style={{ alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 6 }}>
            <T v="label" color="#E6ECFB">{t('unit').toUpperCase()} {path.indexOf(current) + 1}</T>
            <T v="h1" color="#fff">{l({ ht: current.title, fr: current.titleFr })}</T>
          </View>
          <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 4 }}><Illustration id={'unit_' + current.id} size={64} /></View>
        </Row>
        <Row>
          <Progress style={{ flex: 1 }} value={sum.lessonsTotal ? sum.lessonsDone / sum.lessonsTotal : 0} color="#fff" track="rgba(255,255,255,0.3)" />
          <T v="small" color="#E6ECFB">{sum.lessonsDone} / {sum.lessonsTotal} {t('lesson')} · {sum.wordsLearned} {t('words')}</T>
        </Row>
      </View></FadeIn>

      {path.map((u, ui) => (
        <FadeIn key={lang + u.id} delay={Math.min(ui, 4) * 70 + 80} style={{ gap: 10 }}>
          <Row>
            <Illustration id={'unit_' + u.id} size={40} />
            <T v="h2" style={{ flex: 1 }}>{l({ ht: u.title, fr: u.titleFr })}</T>
            <T v="small" color={colors.muted}>{u.done}/{u.total}</T>
          </Row>
          {u.lessons.map((ls, i) => {
            const locked = ls.state === 'locked';
            const done = ls.state === 'done';
            return (
              <Card key={ls.id} onPress={locked ? undefined : () => router.push(`/course/${lang}/${ls.id}`)}
                edge={ls.state === 'open' ? accent : colors.line} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: locked ? 0.55 : 1, marginLeft: (i % 3) * 18 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: done ? colors.green : ls.state === 'open' ? accent : colors.line, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: done ? '#1E7A33' : ls.state === 'open' ? 'rgba(0,0,0,0.2)' : colors.lineStrong }}>
                  {done ? <T v="h2" color="#fff">✓</T> : locked ? <Icon name="femen_kle" size={26} /> : <Pulse amount={0.15}><Icon name="zetwal_gri" size={28} /></Pulse>}
                </View>
                <View style={{ flex: 1 }}>
                  <T v="h3">{l({ ht: ls.title, fr: ls.titleFr })}</T>
                  {done ? <Stars n={ls.stars} size={14} /> : <T v="small" color={ls.state === 'open' ? accent : colors.muted}>{locked ? t('locked') : t('start_lesson')}</T>}
                </View>
              </Card>
            );
          })}
        </FadeIn>
      ))}
    </Screen>
  );
}
