import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import type { AgeBand, Lang } from '@konesans/core';
import { Screen, T, Button, Card, Mascot, Icon, Progress, PressScale, FadeIn, SlideSwap, Pop, Avatar } from '@/ui';
import { AvatarBuilder } from '@/ui/AvatarBuilder';
import { colors } from '@/lib/theme';
import { useStore, useAvatar } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { tap } from '@/lib/audio';
import { serverConfigured } from '@/lib/remote';

const AGES: { id: AgeBand; label: 'age_6_8' | 'age_9_11' | 'age_12_14'; grade: 'grade_6_8' | 'grade_9_11' | 'grade_12_14'; color: string }[] = [
  { id: '6-8', label: 'age_6_8', grade: 'grade_6_8', color: colors.greenSoft },
  { id: '9-11', label: 'age_9_11', grade: 'grade_9_11', color: colors.blueSoft },
  { id: '12-14', label: 'age_12_14', grade: 'grade_12_14', color: colors.purpleSoft },
];

export default function Onboarding() {
  const t = useT();
  const { profile, setLang, setAge, rerollName, finishOnboarding, setAvatar } = useStore();
  const avatar = useAvatar();
  const [step, setStep] = useState(0);
  const [nameBump, setNameBump] = useState(0);
  const LAST = 3;
  const pick = <X,>(v: X, cur: X) => (v === cur ? { borderColor: colors.blue, borderWidth: 3, backgroundColor: colors.blueSoft } : {});

  return (
    <Screen scroll={step === LAST}>
      <Progress value={(step + 1) / (LAST + 1)} color={colors.blue} />
      {step < LAST && <View style={{ alignItems: 'center', marginTop: 6 }}><Pop key={step}><Mascot size={step === 2 ? 90 : 120} mood={step === 2 ? 'cheer' : 'happy'} /></Pop></View>}
      <SlideSwap id={step} style={{ gap: 12 }}>

      {step === 0 && (
        <View style={{ gap: 12 }}>
          <T v="display" center>{t('welcome_title')}</T>
          <T v="body" center color={colors.muted}>{t('pick_lang')}</T>
          {/* i18n-ok: the language picker shows each language in its own words */}
          {([['ht', 'Kreyòl ayisyen', 'Bonjou! Ann aprann ansanm.'], ['fr', 'Français', 'Bonjour ! Apprenons ensemble.']] as [Lang, string, string][]).map(([id, label, hello], i) => ( // i18n-ok
            <FadeIn key={id} delay={120 + i * 80}><Card onPress={() => setLang(id)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 14 }, pick(id, profile.lang)]}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center' }}><T v="h2">{id === 'ht' ? 'KR' : 'FR' /* i18n-ok */}</T></View>
              <View style={{ flex: 1 }}><T v="h3">{label}</T><T v="small" color={colors.muted}>{hello}</T></View>
            </Card></FadeIn>
          ))}
        </View>
      )}

      {step === 1 && (
        <View style={{ gap: 12 }}>
          <T v="h1" center>{t('pick_age')}</T>
          <T v="body" center color={colors.muted}>{t('age_hint')}</T>
          {AGES.map((a, i) => (
            <FadeIn key={a.id} delay={120 + i * 80}><Card onPress={() => setAge(a.id)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 14 }, pick(a.id, profile.age)]}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: a.color, alignItems: 'center', justifyContent: 'center' }}><T v="h3">{a.id.replace('-', '–')}</T></View>
              <View style={{ flex: 1 }}><T v="h3">{t(a.label)}</T><T v="small" color={colors.muted}>{t(a.grade)}</T></View>
            </Card></FadeIn>
          ))}
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: 12 }}>
          <T v="h1" center>{t('your_name')}</T>
          <T v="body" center color={colors.muted}>{t('name_hint')}</T>
          <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 22 }}>
            <Avatar a={avatar} size={72} live />
            <Pop key={nameBump}><T v="display">{profile.username}</T></Pop>
            <PressScale role="button" onPress={() => { tap(); rerollName(); setNameBump((n) => n + 1); }} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44 }}><Icon name="chanje" size={20} /><T v="bold" color={colors.blue}>{t('another')}</T></PressScale>
          </Card>
        </View>
      )}

      {step === LAST && (
        <View style={{ gap: 12 }}>
          <T v="h1" center>{t('av_title')}</T>
          <T v="body" center color={colors.muted}>{t('av_hint')}</T>
          <AvatarBuilder value={avatar} onChange={setAvatar} size={150} />
        </View>
      )}
      </SlideSwap>

      <View style={{ marginTop: 'auto', gap: 10 }}>
        <Button title={step < LAST ? t('next') : t('start')} color={step < LAST ? colors.blue : colors.green} onPress={() => { if (step < LAST) { if (step === 2 && !profile.avatar) setAvatar(avatar); setStep(step + 1); } else { finishOnboarding(); router.replace('/home'); } }} />
        {step === 0 ? (
          <><Button variant="ghost" title={t('try_first')} onPress={() => router.push('/quiz/mix?count=3&trial=1')} />{serverConfigured() && <Button small variant="ghost" title={t('ac_have_code')} onPress={() => router.push('/recover' as never)} />}</>
        ) : (
          <Button variant="ghost" title={t('back')} onPress={() => setStep(step - 1)} />
        )}
      </View>
    </Screen>
  );
}
