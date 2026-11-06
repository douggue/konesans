import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { categoryLevel, type AgeBand } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Progress, IconTile } from '@/ui';
import { colors, CATEGORY_META } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { CATEGORY_ORDER, hasContent } from '@/lib/content';
import { tap } from '@/lib/audio';

const AGES: AgeBand[] = ['6-8', '9-11', '12-14'];

export default function Categories() {
  const t = useT();
  const { profile, stats, setAge } = useStore();
  return (
    <Screen bottom={<BottomNav />}>
      <View><T v="display">{t('categories')}</T><T v="body" color={colors.muted}>{t('cat_sub')}</T></View>
      <Row gap={8}>
        <T v="bold" color={colors.muted}>{t('age')}:</T>
        {AGES.map((a) => {
          const on = a === profile.age;
          return <Pressable role="button" key={a} onPress={() => { tap(); setAge(a); }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 2, borderColor: on ? colors.blue : colors.line, backgroundColor: on ? colors.blue : colors.card, alignItems: 'center', justifyContent: 'center' }}><T v="bold" color={on ? '#fff' : colors.ink}>{a}</T></Pressable>;
        })}
      </Row>
      <Card onPress={() => router.push('/math')} soft={colors.orangeSoft} edge={colors.orange} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconTile name="kalkil" bg="#FFFFFF" size={48} />
        <View style={{ flex: 1 }}><T v="h3">Kalkil Mantal</T><T v="small" color={colors.muted}>60 segonn · {stats.mathBest ? `rekò: ${stats.mathBest} pwen` : 'Konbyen w ka fè?'}</T></View>
        <T v="h2" color={colors.orange}>›</T>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {CATEGORY_ORDER.map((id) => {
          const m = CATEGORY_META[id];
          const ok = hasContent(id, profile.age);
          const correct = stats.perCategoryCorrect[id] ?? 0;
          const lvl = categoryLevel(correct);
          const into = (correct % 15) / 15;
          return (
            <Card key={id} onPress={ok ? () => router.push(id === 'peyi' ? '/peyi' : `/quiz/${id}`) : undefined} style={{ width: '47.5%', gap: 8, opacity: ok ? 1 : 0.5 }}>
              <IconTile name={m.icon as never} bg={m.soft} />
              <T v="h3">{m[profile.lang]}</T>
              <View style={{ gap: 4 }}>
                <T v="small" color={colors.muted}>{ok ? `${t('level')} ${lvl}` : t('soon')}</T>
                <Progress value={ok ? into : 0} color={m.color} />
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
