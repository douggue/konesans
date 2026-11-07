import React, { useEffect, useState } from 'react';
import { View, Switch, ActivityIndicator, TextInput, ScrollView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import type { Lang, AgeBand } from '@konesans/core';
import { Screen, T, Card, Row, TopBar, Button, Sheet, PressScale, Pill } from '@/ui';
import { colors, fonts } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { tap, sfx, audioError, audioTest } from '@/lib/audio';
import { setOnlineAllowed, lastOnlineError, submitChangeRequest, changeRequestError, type ChangeRequest } from '@/lib/online';
import { GRADES, gradeKey, type GradeId } from '@/lib/strings/requests';
import { serverConfigured } from '@/lib/remote';

const AGE_BANDS: AgeBand[] = ['6-8', '9-11', '12-14'];
const ageKey = (a: AgeBand) => (a === '6-8' ? 'age_6_8' : a === '9-11' ? 'age_9_11' : 'age_12_14') as 'age_6_8';
const REQ_TONE = { pending: ['#7A5A00', colors.yellowSoft], approved: ['#12632F', colors.greenSoft], refused: ['#8F0A22', colors.redSoft] } as const;
const REQ_LABEL = { pending: 'req_st_pending', approved: 'req_st_approved', refused: 'req_st_refused' } as const;

/** Chip for the change-request form (selected = blue; the current value is greyed out). */
function Choice({ label, on, current, onPress, tight }: { label: string; on: boolean; current?: boolean; onPress: () => void; tight?: boolean }) {
  return (
    <PressScale debounceMs={0} role="button" disabled={current} onPress={() => { tap(); onPress(); }} style={{ minHeight: 44, paddingHorizontal: tight ? 4 : 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.blueSoft : colors.card, borderWidth: on ? 3 : 2, borderColor: on ? colors.blue : colors.lineStrong, borderBottomWidth: on ? 3 : 4, opacity: current ? 0.45 : 1 }}>
      <T v="bold" color={on ? colors.blue : colors.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</T>
    </PressScale>
  );
}

export default function Settings() {
  const t = useT();
  const { settings, setSettings, profile, setLang, resetAll, kidSettings, setKidSettings } = useStore();
  const [gate, setGate] = useState<null | 'reset' | 'online' | 'change'>(null);
  // ─── age / class change request (Espas Paran; an admin approves it) ───
  const changeReq = useStore((s) => s.changeReq);
  const { height } = useWindowDimensions();
  const [form, setForm] = useState(false);
  const [reqAge, setReqAge] = useState<AgeBand | null>(null);
  const [reqGrade, setReqGrade] = useState<GradeId | null>(null);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [reqMsg, setReqMsg] = useState<null | 'req_pick' | 'req_offline' | 'req_err' | 'req_limit' | 'req_already' | 'req_sent'>(null);
  // look for the admin's answer whenever a parent opens Paramèt
  useEffect(() => { if (serverConfigured() && useStore.getState().changeReq) useStore.getState().syncChangeReq().catch(() => {}); }, []);
  const ageText = (a: AgeBand | null) => (a ? t(ageKey(a)) : '–');
  const gradeText = (g: string | null | undefined) => ((GRADES as readonly string[]).includes(g ?? '') ? t(gradeKey(g as GradeId)) : t('req_grade_unset'));
  const changeText = (r: ChangeRequest) => [
    r.requested.age ? `${ageText(r.current.age)} → ${ageText(r.requested.age)}` : '',
    r.requested.grade ? `${gradeText(r.current.grade)} → ${gradeText(r.requested.grade)}` : '',
  ].filter(Boolean).join(' · ');
  const openForm = () => {
    setReqAge(null); setReqGrade(null); setReason(''); setReqMsg(null); setForm(true);
    useStore.getState().syncChangeReq().catch(() => setReqMsg('req_offline'));
  };
  const sendRequest = async () => {
    const age = reqAge && reqAge !== profile.age ? reqAge : undefined;
    const grade = reqGrade && reqGrade !== profile.grade ? reqGrade : undefined;
    if (!age && !grade) { setReqMsg('req_pick'); return; }
    setSending(true); setReqMsg(null);
    try {
      const r = await submitChangeRequest({ age, grade, reason: reason.trim() || undefined, current: { age: profile.age, grade: profile.grade ?? null }, name: profile.username });
      useStore.getState().setChangeReq(r); setReqMsg('req_sent'); sfx('correct');
    } catch (e) {
      const k = changeRequestError(e);
      setReqMsg(k === 'offline' ? 'req_offline' : k === 'pending' ? 'req_already' : k === 'limit' ? 'req_limit' : 'req_err');
      if (k === 'pending') useStore.getState().syncChangeReq().catch(() => {});
    } finally { setSending(false); }
  };
  const reqPending = changeReq?.status === 'pending';
  const statusBlock = (r: ChangeRequest & { applied?: boolean }) => (
    <View style={{ gap: 4 }}>
      <Row gap={8}>
        <T v="bold" style={{ flexShrink: 1 }}>{t('req_title')}</T>
        <Pill text={t(REQ_LABEL[r.status])} color={REQ_TONE[r.status][0]} bg={REQ_TONE[r.status][1]} />
      </Row>
      <T v="small" color={colors.ink}>{changeText(r)}</T>
      {r.status === 'pending' ? <T v="small" color={colors.muted}>{t('req_wait')}</T> : r.status === 'approved' && r.applied ? <T v="small" color={colors.green}>{t('req_applied')}</T> : null}
      {r.note ? <T v="small" color={colors.muted}>{t('req_note', { x: r.note })}</T> : null}
    </View>
  );
  const [audioInfo, setAudioInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  /** Tell the server (it refuses duels against strangers without this), then remember it on the phone. */
  const applyOnline = async (on: boolean) => {
    setBusy(true); setErr(false);
    try { await setOnlineAllowed(on, profile.age); setKidSettings({ randomDuelsAllowed: on }); }
    catch { if (on) setErr(true); else setKidSettings({ randomDuelsAllowed: false }); }
    finally { setBusy(false); }
  };
  const toggles: { key: keyof typeof settings; label: string; locked?: boolean }[] = [
    { key: 'sfx', label: t('sfx') }, { key: 'music', label: t('music') }, { key: 'voice', label: t('voice'), locked: profile.age === '6-8' }, { key: 'haptic', label: t('haptic') },
  ];
  const seg = (on: boolean) => ({ flex: 1, minHeight: 60, borderRadius: 16, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.card, borderWidth: on ? 3 : 2, borderColor: on ? colors.blue : colors.lineStrong, borderBottomWidth: on ? 3 : 5 });
  return (
    <Screen>
      <TopBar title={t('settings')} onBack={() => router.back()} />
      <T v="label" color={colors.muted}>{t('sound').toUpperCase()}</T>
      <Card style={{ paddingVertical: 4 }}>
        {toggles.map((x, i) => (
          <Row key={x.key} style={{ minHeight: 56, borderBottomWidth: i < toggles.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
            <T v="bold" style={{ flex: 1 }}>{x.label}</T>
            <Switch value={!!settings[x.key]} disabled={x.locked} onValueChange={(v) => { tap(); setSettings({ [x.key]: v }); if (v && x.key === 'sfx') setTimeout(() => sfx('correct'), 50); }} trackColor={{ true: colors.green, false: '#B9C2D6' }} thumbColor="#fff" />
          </Row>
        ))}
      </Card>
      <Button small variant="secondary" title={t('sound_test')} onPress={async () => setAudioInfo(await audioTest())} />
      {audioInfo || audioError ? <T v="small" color={colors.muted} style={{ fontSize: 11 }}>{audioInfo || audioError}</T> : null}
      <T v="label" color={colors.muted}>{t('app_lang').toUpperCase()}</T>
      <Row>
        {/* i18n-ok: each language named in its own words */ ([['ht', 'KR', 'Kreyòl ayisyen'], ['fr', 'FR', 'Français']] as [Lang, string, string][]).map(([id, code, label]) => ( // i18n-ok
          <PressScale debounceMs={0} role="button" key={id} onPress={() => { tap(); setLang(id); }} style={seg(profile.lang === id)}><T v="h2">{code}</T><T v="small">{label}</T></PressScale>
        ))}
      </Row>
      <T v="label" color={colors.muted}>{t('text_size').toUpperCase()}</T>
      <Row>
        {([t('small'), t('normal'), t('big')]).map((label, i) => (
          <PressScale debounceMs={0} role="button" key={label} onPress={() => { tap(); setSettings({ textSize: i as 0 | 1 | 2 }); }} style={seg(settings.textSize === i)}><T style={{ fontSize: [14, 18, 24][i], lineHeight: [16, 20, 28][i], fontFamily: 'Baloo2_800ExtraBold' }}>{'Aa' /* i18n-ok: font size sample */}</T><T v="small">{label}</T></PressScale>
        ))}
      </Row>
      <Card><T v="bold">{t('sample_question')}</T></Card>
      <T v="label" color={colors.muted}>{t('parent').toUpperCase()}</T>
      <Card style={{ gap: 6 }}>
        <T v="small" color={colors.muted}>{t('parent_only')}</T>
        {serverConfigured() && <>
          <Row style={{ minHeight: 56 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="bold">{t('online_duels')}</T>
              <T v="small" color={colors.muted}>{t('online_duels_sub')}</T>
            </View>
            {busy ? <ActivityIndicator color={colors.blue} /> : <Switch value={!!kidSettings.randomDuelsAllowed} onValueChange={(v) => { tap(); if (v) setGate('online'); else applyOnline(false); }} trackColor={{ true: colors.green, false: '#B9C2D6' }} thumbColor="#fff" />}
          </Row>
          {err && <><T v="small" color={colors.red}>{t('online_err')}</T>{lastOnlineError ? <T v="small" color={colors.muted} style={{ fontSize: 11, opacity: 0.7 }}>{lastOnlineError}</T> : null}</>}
          <PressScale role="button" scaleTo={0.98} onPress={() => { tap(); setGate('change'); }} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="bold">{t('req_row')}</T>
              <T v="small" color={colors.muted}>{t('req_now', { x: `${ageText(profile.age)} · ${gradeText(profile.grade)}` })}</T>
            </View>
            {changeReq ? <Pill text={t(REQ_LABEL[changeReq.status])} color={REQ_TONE[changeReq.status][0]} bg={REQ_TONE[changeReq.status][1]} /> : null}
            <T v="h2" color={colors.blue}>›</T>
          </PressScale>
          {changeReq && (reqPending || changeReq.status === 'refused' || !changeReq.applied) ? <View style={{ backgroundColor: colors.bg, borderRadius: 14, padding: 10 }}>{statusBlock(changeReq)}</View> : null}
        </>}
        <Button variant="secondary" color={colors.red} title={t('reset')} onPress={() => setGate('reset')} />
      </Card>
      <T v="small" center color={colors.muted}>{t('app_version', { v: '0.1' })}</T>
      <Sheet open={!!gate} title={gate === 'online' ? t('online_duels') : gate === 'change' ? t('req_row') : t('reset') + '?'}>
        {gate === 'online' && <T v="small" center color={colors.muted}>{t('online_on_gate')}</T>}
        <T v="body" center color={colors.muted}>{t('parent_gate')}</T>
        <Row>
          {[36, 42, 48].map((n) => <Button key={n} variant="secondary" title={String(n)} style={{ flex: 1 }} onPress={() => {
            const g = gate; setGate(null);
            if (n !== 42) return;
            if (g === 'reset') { resetAll(); router.replace('/onboarding'); } else if (g === 'online') applyOnline(true); else if (g === 'change') setTimeout(openForm, 260);
          }} />)}
        </Row>
        <Button variant="ghost" title={t('stay')} onPress={() => setGate(null)} />
      </Sheet>
      <Sheet open={form} title={t('req_row')}>
        <ScrollView style={{ maxHeight: height * 0.66 }} contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
          {reqPending || reqMsg === 'req_sent' ? (
            <>
              {reqMsg === 'req_sent' ? <T v="bold" center color={colors.green}>{t('req_sent')}</T> : null}
              {changeReq ? <View style={{ backgroundColor: colors.bg, borderRadius: 16, padding: 12 }}>{statusBlock(changeReq)}</View> : null}
            </>
          ) : (
            <>
              <T v="small" color={colors.muted}>{t('req_intro')}</T>
              <T v="bold">{t('req_now', { x: `${ageText(profile.age)} · ${gradeText(profile.grade)}` })}</T>
              <T v="label" color={colors.muted}>{t('req_new_age').toUpperCase()}</T>
              <Row gap={8}>
                {AGE_BANDS.map((a) => <View key={a} style={{ flex: 1 }}><Choice tight label={ageText(a)} on={reqAge === a} current={profile.age === a} onPress={() => setReqAge(reqAge === a ? null : a)} /></View>)}
              </Row>
              <T v="label" color={colors.muted}>{t('req_new_grade').toUpperCase()}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GRADES.map((g) => <Choice key={g} label={t(gradeKey(g))} on={reqGrade === g} current={profile.grade === g} onPress={() => setReqGrade(reqGrade === g ? null : g)} />)}
              </View>
              <T v="label" color={colors.muted}>{t('req_reason').toUpperCase()}</T>
              <TextInput value={reason} onChangeText={setReason} maxLength={140} placeholder={t('req_reason_ph')} placeholderTextColor={colors.muted}
                style={{ minHeight: 48, borderWidth: 2, borderColor: colors.lineStrong, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.bodyRegular, fontSize: 15, color: colors.ink, backgroundColor: colors.card }} />
              {reqMsg ? <T v="small" color={colors.red}>{t(reqMsg)}</T> : null}
              {changeReq && changeReq.status !== 'pending' ? <View style={{ backgroundColor: colors.bg, borderRadius: 16, padding: 12 }}>{statusBlock(changeReq)}</View> : null}
            </>
          )}
        </ScrollView>
        {!reqPending && reqMsg !== 'req_sent' ? (sending ? <ActivityIndicator color={colors.blue} style={{ minHeight: 54 }} /> : <Button title={t('req_send')} disabled={!reqAge && !reqGrade} onPress={sendRequest} />) : null}
        <Button variant="ghost" title={t('req_close')} onPress={() => setForm(false)} />
      </Sheet>
    </Screen>
  );
}
