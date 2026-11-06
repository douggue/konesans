import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { chestReady, nextLesson, courseById, type QuestState } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Pill, Progress, Mascot, IconTile, Button, Motif } from '@/ui';
import { colors, CATEGORY_META } from '@/lib/theme';
import { useStore, useLevel } from '@/lib/store';
import { useT, useL } from '@/lib/i18n';
import { tap } from '@/lib/audio';

const QUEST_TEXT: Record<string, [string, string]> = {
  win_duel: ['Genyen {n} defi', 'Gagner {n} duel'], finish_lessons: ['Fini {n} leson', 'Finir {n} leçons'], math_score: ['Fè {n} pwen nan Kalkil Mantal', 'Faire {n} points en calcul mental'],
  answer_correct: ['Bay {n} bon repons', 'Donner {n} bonnes réponses'], play_category: ['Reponn {n} kesyon nan yon kategori', 'Répondre à {n} questions dans une catégorie'], review_mistakes: ['Revize {n} erè', 'Revoir {n} erreurs'],
};

export default function Home() {
  const t = useT(); const l = useL();
  const { profile, progress, courses, touch } = useStore();
  const lvl = useLevel();
  useEffect(() => { touch(); }, []);
  const quests: QuestState[] = progress.quests;
  const questsDone = quests.filter((q) => q.done).length;
  const nextEn = nextLesson('en', courses.en); const nextEs = nextLesson('es', courses.es);
  const course = nextEn ? { lang: 'en' as const, lesson: nextEn } : nextEs ? { lang: 'es' as const, lesson: nextEs } : null;

  return (
    <Screen pad={20} bottom={<BottomNav />}>
      <Row gap={12}>
        <Pressable onPress={() => { tap(); router.push('/profile'); }} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }}><T v="h2" color="#fff">{profile.username[0]}</T></Pressable>
        <View style={{ flex: 1 }}>
          <T v="h1">{t('hello')}, {profile.username}!</T>
          <T v="small" color={colors.muted}>{t('what_learn')}</T>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Pill text={`${progress.streak.count} ${t('days')}`} icon="seri" color="#A63A0A" bg="#FFE8DC" />
          <Pill text={`${progress.coins}`} icon="kob" color="#5C4600" bg={colors.yellowSoft} />
        </View>
      </Row>

      {/* Daily challenge */}
      <View style={{ backgroundColor: colors.blue, borderRadius: 24, padding: 20, paddingRight: 118, gap: 6, borderBottomWidth: 5, borderBottomColor: '#14307D', overflow: 'hidden' }}>
        <Motif kind="drapo" opacity={0.2} height={170} />
        <T v="label" color="#E6ECFB">{t('daily')}</T>
        <T v="h1" color="#fff">{t('daily_title')}</T>
        <T v="small" color="#E6ECFB">{t('daily_sub')}</T>
        <Button small title={t('play_now')} variant="secondary" color={colors.blue} onPress={() => router.push('/quiz/mix?count=10')} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
        <View style={{ position: 'absolute', right: 2, bottom: 0 }}><Mascot size={118} mood="cheer" /></View>
      </View>

      {/* Quests */}
      <Card onPress={() => router.push('/profile')} style={{ gap: 8 }}>
        <Row>
          <IconTile name="kof" bg={colors.purpleSoft} size={44} />
          <View style={{ flex: 1 }}><T v="h3">{t('quests')}</T><Progress value={quests.length ? questsDone / quests.length : 0} color={colors.purple} /></View>
          <T v="small" color={colors.muted}>{questsDone} / {quests.length || 3}</T>
        </Row>
        {quests.slice(0, 3).map((q) => (
          <Row key={q.id} gap={8}>
            <T v="small" color={q.done ? colors.green : colors.muted}>{q.done ? '✓' : '○'}</T>
            <T v="small" color={q.done ? colors.muted : colors.ink} style={{ flex: 1 }}>{(QUEST_TEXT[q.kind] ?? ['', ''])[profile.lang === 'fr' ? 1 : 0].replace('{n}', String(q.goal))}</T>
            <T v="small" color={colors.muted}>{Math.min(q.progress, q.goal)}/{q.goal} · +{q.xp} XP</T>
          </Row>
        ))}
        {chestReady(progress) && <Pill text="Kòf la louvri! +100 XP" color="#5C4600" bg={colors.yellowSoft} icon="kado" />}
      </Card>

      {/* Continue course */}
      {course && (
        <>
          <T v="h2">{t('continue_learning')}</T>
          <Card onPress={() => router.push(`/course/${course.lang}/${course.lesson.id}`)}>
            <Row>
              <IconTile name="lang" bg={colors.blueSoft} size={48} />
              <View style={{ flex: 1 }}>
                <T v="h3">{l(courseById(course.lang).name)} · {course.lesson.title}</T>
                <T v="small" color={colors.muted}>{t('level')} {lvl.level} · {progress.xp} XP</T>
              </View>
              <T v="small" color={colors.blue}>›</T>
            </Row>
          </Card>
        </>
      )}

      {/* Explore */}
      <T v="h2">{t('explore')}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          { icon: 'kesyon', bg: colors.yellowSoft, label: t('challenge'), href: '/categories' },
          { icon: 'defi', bg: colors.redSoft, label: t('duel_bot'), href: '/duel' },
          { icon: 'lang', bg: colors.blueSoft, label: t('course'), href: '/course' },
          { icon: 'robo', bg: colors.purpleSoft, label: t('coding'), href: '/coding' },
          { icon: 'kalkil', bg: colors.greenSoft, label: 'Kalkil Mantal', href: '/math' },
          { icon: 'drapo', bg: colors.orangeSoft, label: CATEGORY_META.peyi[profile.lang], href: '/peyi' },
        ].map((x) => (
          <Card key={x.href} onPress={() => router.push(x.href as never)} soft={x.bg} edge={x.bg} style={{ width: '31%', alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 6 }}>
            <IconTile name={x.icon as never} bg="#FFFFFF" size={48} />
            <T v="small" center>{x.label}</T>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
