import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import type { AgeBand, Lang } from '@konesans/core';
import { Screen, T, Button, Card, Row, Mascot, Icon, Progress } from '@/ui';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { tap } from '@/lib/audio';

const AGES: { id: AgeBand; label: string; grade: string; color: string }[] = [
  { id: '6-8', label: '6–8 an', grade: '1ye–3yèm AF', color: colors.greenSoft },
  { id: '9-11', label: '9–11 an', grade: '4yèm–6yèm AF', color: colors.blueSoft },
  { id: '12-14', label: '12–14 an', grade: '7yèm–9yèm AF', color: colors.purpleSoft },
];

export default function Onboarding() {
  const t = useT();
  const { profile, setLang, setAge, rerollName, finishOnboarding } = useStore();
  const [step, setStep] = useState(0);
  const pick = <X,>(v: X, cur: X) => (v === cur ? { borderColor: colors.blue, borderWidth: 3, backgroundColor: colors.blueSoft } : {});

  return (
    <Screen scroll={false}>
      <Progress value={(step + 1) / 3} color={colors.blue} />
      <View style={{ alignItems: 'center', marginTop: 6 }}><Mascot size={step === 2 ? 90 : 120} mood={step === 2 ? 'cheer' : 'happy'} /></View>

      {step === 0 && (
        <View style={{ gap: 12 }}>
          <T v="display" center>{t('welcome_title')}</T>
          <T v="body" center color={colors.muted}>{t('pick_lang')}</T>
          {([['ht', 'Kreyòl ayisyen', 'Bonjou! Ann aprann ansanm.'], ['fr', 'Français', 'Bonjour ! Apprenons ensemble.']] as [Lang, string, string][]).map(([id, label, hello]) => (
            <Card key={id} onPress={() => setLang(id)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 14 }, pick(id, profile.lang)]}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center' }}><T v="h2">{id === 'ht' ? 'KR' : 'FR'}</T></View>
              <View style={{ flex: 1 }}><T v="h3">{label}</T><T v="small" color={colors.muted}>{hello}</T></View>
            </Card>
          ))}
        </View>
      )}

      {step === 1 && (
        <View style={{ gap: 12 }}>
          <T v="h1" center>{t('pick_age')}</T>
          <T v="body" center color={colors.muted}>{t('age_hint')}</T>
          {AGES.map((a) => (
            <Card key={a.id} onPress={() => setAge(a.id)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 14 }, pick(a.id, profile.age)]}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: a.color, alignItems: 'center', justifyContent: 'center' }}><T v="h3">{a.label.split(' ')[0]}</T></View>
              <View style={{ flex: 1 }}><T v="h3">{a.label}</T><T v="small" color={colors.muted}>{a.grade}</T></View>
            </Card>
          ))}
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: 12 }}>
          <T v="h1" center>{t('your_name')}</T>
          <T v="body" center color={colors.muted}>{t('name_hint')}</T>
          <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 22 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }}><T v="display" color="#fff">{profile.username[0]}</T></View>
            <T v="display">{profile.username}</T>
            <Pressable role="button" onPress={() => { tap(); rerollName(); }} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44 }}><Icon name="chanje" size={20} /><T v="bold" color={colors.blue}>{t('another')}</T></Pressable>
          </Card>
        </View>
      )}

      <View style={{ marginTop: 'auto', gap: 10 }}>
        <Button title={step < 2 ? t('next') : t('start')} color={step < 2 ? colors.blue : colors.green} onPress={() => { if (step < 2) setStep(step + 1); else { finishOnboarding(); router.replace('/home'); } }} />
        {step === 0 ? (
          <Button variant="ghost" title={t('try_first')} onPress={() => router.push('/quiz/mix?count=3&trial=1')} />
        ) : (
          <Button variant="ghost" title={t('back')} onPress={() => setStep(step - 1)} />
        )}
      </View>
    </Screen>
  );
}
