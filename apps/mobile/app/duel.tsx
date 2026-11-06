import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { createDuel, reduce, planBotAnswer, BOT_PROFILES, BOT_NAMES, PRESET_REACTIONS, rng, type DuelState } from '@konesans/core';
import { Screen, T, Button, Card, Row, Progress, Sheet, Mascot, TopBar, Pill, Avatar, avatarFromSeed, PressScale, Bounce, Drop, FadeIn, Pop, Confetti, SlideSwap, useCountUp } from '@/ui';
import { Matchmaking } from '@/ui/Matchmaking';
import { QuestionView } from '@/ui/QuestionView';
import { colors } from '@/lib/theme';
import { useStore, useAvatar } from '@/lib/store';
import { useT, type StrKey } from '@/lib/i18n';
import { buildQuestions } from '@/lib/content';
import { tap } from '@/lib/audio';

const ME = 'me';

/** 1v1 against Robo, run entirely on-device with the same reducer the server uses. */
export default function Duel() {
  const t = useT();
  const { profile, seen, recordDuel, stats } = useStore();
  const myAvatar = useAvatar();
  const bot = useMemo(() => { const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]; return { id: 'bot', name, profile: BOT_PROFILES[profile.age], avatar: avatarFromSeed(name + Date.now()) }; }, []);
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

  // the matchmaking sequence ends → the opponent joins and the first question starts
  const startDuel = () => { setLobby(false); setS((d) => reduce(d, { type: 'join', player: { id: bot.id, username: bot.name, isBot: true } }, Date.now())); };

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
        <Matchmaking me={{ name: profile.username, avatar: myAvatar, sub: `${profile.age} ${t('years')}` }} opponent={{ name: bot.name, avatar: bot.avatar, sub: t('robot') }} onDone={startDuel} />
      </Screen>
    );
  }

  if (s.phase === 'ended') {
    const won = s.winnerId === ME; const draw = s.winnerId === null;
    return (
      <Screen scroll={false}>
        {won && <Confetti />}
        <View style={{ alignItems: 'center', gap: 10, marginTop: 'auto' }}>
          <Drop><Mascot size={140} mood={won ? 'cheer' : draw ? 'happy' : 'sad'} /></Drop>
          <Pop delay={450}><T v="display" center>{won ? t('you_win') : draw ? t('draw') : t('you_lose')}</T></Pop>
          <Row gap={16}>
            <FadeIn delay={650} x={-40} from={0} style={{ alignItems: 'center', gap: 4 }}><Avatar a={myAvatar} size={64} live={won} /><ScoreNum n={me?.score ?? 0} color={colors.blue} /><T v="small" color={colors.muted}>{profile.username}</T></FadeIn>
            <T v="h2" color={colors.muted}>{t('vs')}</T>
            <FadeIn delay={650} x={40} from={0} style={{ alignItems: 'center', gap: 4 }}><Avatar a={bot.avatar} size={64} /><ScoreNum n={op.score} color={colors.red} /><T v="small" color={colors.muted}>🤖 {op.username}</T></FadeIn>
          </Row>
          <Pop delay={1100}><Pill text={`+${won ? 40 : draw ? 25 : 15} XP`} color="#5C4600" bg={colors.yellowSoft} icon="pwen" /></Pop>
          <FadeIn delay={1250}><T v="small" color={colors.muted}>{t('wins')}: {stats.duelWins} / {stats.duels}</T></FadeIn>
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
      <FadeIn from={-12}><Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }}>
        <Bounce trigger={me?.score || null} amount={0.12}><Avatar a={myAvatar} size={42} /></Bounce>
        <View style={{ flex: 1 }}><T v="small" color={colors.muted}>{t('you')}</T><T v="bold" numberOfLines={1}>{profile.username}</T></View>
        <Bounce trigger={me?.score || null} amount={0.25}><ScoreNum n={me?.score ?? 0} color={colors.blue} small /></Bounce>
        <T v="small" color={colors.muted}>{t('vs')}</T>
        <Bounce trigger={op.score || null} amount={0.25}><ScoreNum n={op.score} color={colors.red} small /></Bounce>
        <View style={{ flex: 1, alignItems: 'flex-end' }}><T v="small" color={colors.muted}>{t('opponent')}</T><T v="bold" numberOfLines={1}>{op.username}</T></View>
        <Bounce trigger={op.score || null} amount={0.12}><Avatar a={bot.avatar} size={42} /></Bounce>
      </Card></FadeIn>
      <Row>
        <Progress style={{ flex: 1 }} linear value={reveal ? 0 : left / s.questionMs} color={left < 4000 ? colors.red : colors.yellowDark} />
        <T v="small" color={colors.muted} style={{ width: 32, textAlign: 'right' }}>{reveal ? '' : Math.ceil(left / 1000) + ' s'}</T>
      </Row>
      {op.answer && !reveal && <Pop><Pill text={t('already_answered', { name: op.username })} color={colors.muted} bg={colors.line} /></Pop>}
      {q && <SlideSwap id={s.index}><QuestionView q={q} chosen={me?.answer?.chosen ?? null} reveal={reveal} otherChosen={reveal ? op.answer?.chosen : undefined} otherAvatar={bot.avatar} onPick={(i) => { tap(); setS((d) => reduce(d, { type: 'answer', playerId: ME, chosen: i }, Date.now())); }} /></SlideSwap>}
      {!reveal && (
        <View style={{ gap: 8 }}>
          <T v="small" color={colors.muted}>{t('reactions')}</T>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {PRESET_REACTIONS.slice(0, 4).map((r) => (
              <PressScale role="button" key={r} scaleTo={0.9} onPress={() => { tap(); setS((d) => reduce(d, { type: 'react', playerId: ME, reaction: r }, Date.now())); }} style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 2, borderColor: s.reactions[ME] === r ? colors.blue : colors.line, backgroundColor: colors.card, justifyContent: 'center' }}>
                <T v="small">{t(`re_${r}` as StrKey)}</T>
              </PressScale>
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

function ScoreNum({ n, color, small }: { n: number; color: string; small?: boolean }) {
  const v = useCountUp(n, undefined, 450);
  return <T v={small ? 'h1' : 'display'} color={color}>{v}</T>;
}
