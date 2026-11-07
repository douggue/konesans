import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { chestReady, nextLesson, courseById, type QuestState } from '@konesans/core';
import { RankUpListener } from '@/ui/RankUp';
import { AccountHomeCard } from '@/ui/AccountCard';
import { Screen, T, Card, Row, BottomNav, Pill, CountPill, Progress, Mascot, IconTile, Button, Motif, Avatar, PressScale, FadeIn, Pop, Pulse, Icon } from '@/ui';
import { colors, fonts } from '@/lib/theme';
import { categoryInfo } from '@/lib/content';
import { useAnnouncement, useFeatures, useDailyCount } from '@/lib/remote';
import { useStore, useLevel, useAvatar } from '@/lib/store';
import { useT, useL } from '@/lib/i18n';
import { tap, music } from '@/lib/audio';

export default function Home() {
  const t = useT(); const l = useL();
  const { profile, progress, courses, touch } = useStore();
  const lvl = useLevel();
  const ann = useAnnouncement();
  const features = useFeatures();
  const daily = useDailyCount();
  const avatar = useAvatar();
  useEffect(() => { touch(); }, []);
  useFocusEffect(useCallback(() => { music(null); }, [])); // no music in menus (concentration); music only in duels
  const quests: QuestState[] = progress.quests;
  const questsDone = quests.filter((q) => q.done).length;
  const chestOpened = useStore((s) => s.missions?.chestDay) === progress.questsDay && !!progress.questsDay;
  const questsReady = chestReady(progress) && !chestOpened;
  const nextEn = nextLesson('en', courses.en); const nextEs = nextLesson('es', courses.es);
  const course = nextEn ? { lang: 'en' as const, lesson: nextEn } : nextEs ? { lang: 'es' as const, lesson: nextEs } : null;

  return (
    <Screen pad={20} bottom={<BottomNav />}>
      <FadeIn><Row gap={12}>
        <PressScale accessibilityLabel={t('profile')} scaleTo={0.9} onPress={() => { tap(); router.push('/profile'); }}><Avatar a={avatar} size={52} live /></PressScale>
        <View style={{ flex: 1 }}>
          <T v="h1">{t('hello')}, {profile.username}!</T>
          <T v="small" color={colors.muted}>{t('what_learn')}</T>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <CountPill value={progress.streak.count} k="streak" suffix={` ${t(progress.streak.count === 1 ? 'day_one' : 'days')}`} icon="seri" color="#A63A0A" bg="#FFE8DC" pulse={progress.streak.count > 0} />
          <CountPill value={progress.coins} k="coins" icon="kob" color="#5C4600" bg={colors.yellowSoft} />
        </View>
      </Row></FadeIn>

      {ann && (ann.ht || ann.fr) ? (
        <FadeIn delay={40}><View style={{ backgroundColor: ({ blue: colors.blueSoft, yellow: colors.yellowSoft, red: colors.redSoft, green: colors.greenSoft } as const)[ann.color], borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <IconTile name="siyale" bg="#FFFFFF" size={36} />
          <T v="bold" style={{ flex: 1 }} color={({ blue: colors.blue, yellow: '#5C4600', red: '#8F0A22', green: '#12632F' } as const)[ann.color]}>{profile.lang === 'fr' && ann.fr ? ann.fr : ann.ht || ann.fr}</T>
        </View></FadeIn>
      ) : null}

      <AccountHomeCard />
      {/* Daily challenge */}
      <FadeIn delay={80}><View style={{ backgroundColor: colors.blue, borderRadius: 24, padding: 20, paddingRight: 118, gap: 6, borderBottomWidth: 5, borderBottomColor: '#14307D', overflow: 'hidden' }}>
        <Motif kind="drapo" opacity={0.2} height={170} />
        <T v="label" color="#E6ECFB">{t('daily')}</T>
        <T v="h1" color="#fff">{t('daily_title')}</T>
        <T v="small" color="#E6ECFB">{t('daily_sub')}</T>
        <Button small title={t('play_now')} variant="secondary" color={colors.blue} onPress={() => router.push(`/quiz/mix?count=${daily}`)} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
        <View style={{ position: 'absolute', right: 2, bottom: 0 }}><Mascot size={118} mood="happy" /></View>
      </View></FadeIn>

      {/* Quests → Misyon Jodi a */}
      <FadeIn delay={160}><Card onPress={() => router.push('/quests' as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 16 }}>
        {questsReady ? <Pulse amount={0.1}><Icon name="kof" size={44} /></Pulse> : <Icon name="kof" size={44} />}
        <View style={{ flex: 1, gap: 5 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <T v="h3" style={{ fontFamily: fonts.display, fontSize: 17, lineHeight: 21 }}>{t('quests')}</T>
            <T v="small" color={colors.muted}>{questsDone} / {quests.length || 3}</T>
          </Row>
          <Progress value={quests.length ? questsDone / quests.length : 0} color="#7048E8" />
          {questsReady && <Pop delay={300} style={{ alignSelf: 'flex-start', marginTop: 2 }}><Pill text={t('q_home_ready')} color="#5C4600" bg={colors.yellowSoft} icon="kado" pulse /></Pop>}
          {chestOpened && <T v="small" color={colors.green}>{t('q_home_opened')}</T>}
        </View>
      </Card></FadeIn>

      {/* Continue course */}
      {course && (
        <FadeIn delay={240} style={{ gap: 14 }}>
          <T v="h2">{t('continue_learning')}</T>
          <Card onPress={() => router.push(`/course/${course.lang}/${course.lesson.id}`)}>
            <Row>
              <IconTile name="lang" bg={colors.blueSoft} size={48} />
              <View style={{ flex: 1 }}>
                <T v="h3">{l(courseById(course.lang).name)} · {l({ ht: course.lesson.title, fr: course.lesson.titleFr })}</T>
                <T v="small" color={colors.muted}>{t('level')} {lvl.level} · {progress.xp} XP</T>
              </View>
              <T v="small" color={colors.blue}>›</T>
            </Row>
          </Card>
        </FadeIn>
      )}

      {/* Explore */}
      <FadeIn delay={300}><T v="h2">{t('explore')}</T></FadeIn>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          { icon: 'kesyon', bg: colors.yellowSoft, label: t('challenge'), href: '/categories', on: true },
          { icon: 'defi', bg: colors.redSoft, label: t('duel_bot'), href: '/duel', on: features.duels },
          { icon: 'lang', bg: colors.blueSoft, label: t('course'), href: '/course', on: features.courses },
          { icon: 'robo', bg: colors.purpleSoft, label: t('coding'), href: '/coding', on: features.coding },
          { icon: 'vwayaj', bg: colors.greenSoft, label: t('vw_title'), href: '/vwayaj', on: true },
          { icon: 'kalkil', bg: colors.greenSoft, label: t('math_title'), href: '/math', on: features.math },
        ].filter((x) => x.on).map((x, i) => (
          <FadeIn key={x.href} delay={340 + i * 50} style={{ width: '31%' }}>
            <Card onPress={() => router.push(x.href as never)} soft={x.bg} edge={x.bg} style={{ alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 6 }}>
              <IconTile name={x.icon as never} bg="#FFFFFF" size={48} />
              <T v="small" center numberOfLines={1} adjustsFontSizeToFit>{x.label}</T>
            </Card>
          </FadeIn>
        ))}
      </View>
      <RankUpListener />
    </Screen>
  );
}
