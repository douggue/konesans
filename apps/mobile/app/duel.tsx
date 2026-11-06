import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { createDuel, reduce, planBotAnswer, BOT_PROFILES, BOT_NAMES, PRESET_REACTIONS, rng, type DuelState } from '@konesans/core';
import { Screen, T, Button, Card, Row, Progress, Sheet, Mascot, TopBar, Pill } from '@/ui';
import { QuestionView } from '@/ui/QuestionView';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { buildQuestions } from '@/lib/content';
import { tap } from '@/lib/audio';

const REACTION_LABEL: Record<string, string> = { bravo: 'Bravo!', wow: 'Wow!', byen_jwe: 'Byen jwe!', anko: 'Ankò!', bon_chans: 'Bòn chans!', mwen_pare: 'Mwen pare!' };
const ME = 'me';

/** 1v1 against Robo, run entirely on-device with the same reducer the server uses. */
export default function Duel() {
  const t = useT();
  const { profile, seen, recordDuel, stats } = useStore();
  const bot = useMemo(() => ({ id: 'bot', name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], profile: BOT_PROFILES[profile.age] }), []);
  const rand = useMemo(() => rng(Date.now() % 1e9), []);
  const [s, setS] = useState<DuelState>(() => {
    let d = createDuel('local-' + Date.now().toString(36), buildQuestions('mix', profile.age, 5, Date.now() % 1e9, seen), Date.now());
    d = reduce(d, { type: 'join', player: { id: ME, username: profile.username, isBot: false } }, Date.now());
    return d;
  });
  const [lobby, setLobby] = useState(true);
  const [quitting, setQuitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const botPlan = useRef<{ index: number; atMs: number; chosen: number } | null>(null);
  const recorded = useRef(false);

  // "searching…" then the bot joins (the real app waits for a human first)
  useEffect(() => { const id = setTimeout(() => { setLobby(false); setS((d) => reduce(d, { type: 'join', player: { id: bot.id, username: bot.name, isBot: true } }, Date.now())); }, 1800); return () => clearTimeout(id); }, []);

  // game clock
  useEffect(() => {
    const id = setInterval(() => {
      const n = Date.now(); setNow(n);
      setS((d) => {
        if (d.phase === 'question') {
          if (!botPlan.current || botPlan.current.index !== d.index) botPlan.current = { index: d.index, ...planBotAnswer(d, bot.profile, rand) };
          if (n - d.phaseStartedAt >= botPlan.current.atMs && !d.players.find((p) => p.id === bot.id)?.answer) d = reduce(d, { type: 'answer', playerId: bot.id, chosen: botPlan.current.chosen }, n);
        }
        return reduce(d, { type: 'tick' }, n);
      });
    }, 150);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (s.phase === 'ended' && !recorded.current) {
      recorded.current = true;
      const me = s.players.find((p) => p.id === ME)!;
      recordDuel(s.winnerId === ME, s.winnerId === null, me.score);
    }
  }, [s.phase]);

  const me = s.players.find((p) => p.id === ME); const op = s.players.find((p) => p.id === bot.id);
  const q = s.questions[s.index];
  const left = Math.max(0, s.questionMs - (now - s.phaseStartedAt));

  if (lobby || !op) {
    return (
      <Screen scroll={false}>
        <TopBar close title={t('duel_bot')} onBack={() => router.back()} />
        <View style={{ alignItems: 'center', gap: 12, marginTop: 'auto', marginBottom: 'auto' }}>
          <Mascot size={150} mood="think" />
          <T v="h1" center>{t('finding')}</T>
          <T v="small" center color={colors.muted}>{profile.username} · {profile.age}</T>
        </View>
      </Screen>
    );
  }

  if (s.phase === 'ended') {
    const won = s.winnerId === ME; const draw = s.winnerId === null;
    return (
      <Screen scroll={false}>
        <View style={{ alignItems: 'center', gap: 10, marginTop: 'auto' }}>
          <Mascot size={150} mood={won ? 'cheer' : draw ? 'happy' : 'sad'} />
          <T v="display" center>{won ? t('you_win') : draw ? t('draw') : t('you_lose')}</T>
          <Row gap={16}>
            <View style={{ alignItems: 'center' }}><T v="display" color={colors.blue}>{me?.score}</T><T v="small" color={colors.muted}>{profile.username}</T></View>
            <T v="h2" color={colors.muted}>{t('vs')}</T>
            <View style={{ alignItems: 'center' }}><T v="display" color={colors.red}>{op.score}</T><T v="small" color={colors.muted}>🤖 {op.username}</T></View>
          </Row>
          <Pill text={`+${won ? 40 : draw ? 25 : 15} XP`} color="#5C4600" bg={colors.yellowSoft} icon="pwen" />
          <T v="small" color={colors.muted}>{t('wins')}: {stats.duelWins} / {stats.duels}</T>
        </View>
        <View style={{ marginTop: 'auto', gap: 10 }}>
          <Button title={t('again')} onPress={() => router.replace('/duel')} />
          <Button variant="secondary" title={t('done')} onPress={() => router.replace('/home')} />
        </View>
      </Screen>
    );
  }

  const reveal = s.phase === 'reveal';
  return (
    <Screen>
      <TopBar close title={`${t('question')} ${s.index + 1} / ${s.questions.length}`} onBack={() => setQuitting(true)} />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }}><T v="h3" color="#fff">{profile.username[0]}</T></View>
        <View style={{ flex: 1 }}><T v="small" color={colors.muted}>{t('you')}</T><T v="bold" numberOfLines={1}>{profile.username}</T></View>
        <T v="h1" color={colors.blue}>{me?.score}</T>
        <T v="small" color={colors.muted}>{t('vs')}</T>
        <T v="h1" color={colors.red}>{op.score}</T>
        <View style={{ flex: 1, alignItems: 'flex-end' }}><T v="small" color={colors.muted}>{t('opponent')}</T><T v="bold" numberOfLines={1}>{op.username}</T></View>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' }}><T v="h3" color="#fff">🤖</T></View>
      </Card>
      <Row>
        <Progress style={{ flex: 1 }} value={reveal ? 0 : left / s.questionMs} color={left < 4000 ? colors.red : colors.yellowDark} />
        <T v="small" color={colors.muted} style={{ width: 32, textAlign: 'right' }}>{reveal ? '' : Math.ceil(left / 1000) + ' s'}</T>
      </Row>
      {op.answer && !reveal && <Pill text={`🤖 ${op.username} reponn deja!`} color={colors.muted} bg={colors.line} />}
      {q && <QuestionView q={q} chosen={me?.answer?.chosen ?? null} reveal={reveal} otherChosen={reveal ? op.answer?.chosen : undefined} onPick={(i) => setS((d) => reduce(d, { type: 'answer', playerId: ME, chosen: i }, Date.now()))} />}
      {!reveal && (
        <View style={{ gap: 8 }}>
          <T v="small" color={colors.muted}>{t('reactions')}</T>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {PRESET_REACTIONS.slice(0, 4).map((r) => (
              <Pressable role="button" key={r} onPress={() => { tap(); setS((d) => reduce(d, { type: 'react', playerId: ME, reaction: r }, Date.now())); }} style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 2, borderColor: s.reactions[ME] === r ? colors.blue : colors.line, backgroundColor: colors.card, justifyContent: 'center' }}>
                <T v="small">{REACTION_LABEL[r]}</T>
              </Pressable>
            ))}
          </Row>
        </View>
      )}
      <Sheet open={quitting} title={t('quit_q')}>
        <Button title={t('stay')} onPress={() => setQuitting(false)} />
        <Button variant="secondary" color={colors.red} title={t('quit')} onPress={() => { setQuitting(false); setS((d) => reduce(d, { type: 'leave', playerId: ME }, Date.now())); router.replace('/home'); }} />
      </Sheet>
    </Screen>
  );
}
