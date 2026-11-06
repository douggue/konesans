import React from 'react';
import { View } from 'react-native';
import { SHAPES, type Question } from '@konesans/core';
import { T, Row, OptionButton, Icon, ShapeView, Flag, PressScale, Pop, FadeIn, Avatar } from './index';
import { colors } from '@/lib/theme';
import { useL, useT } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { speak } from '@/lib/audio';
import type { AvatarConfig } from '@konesans/core';

const LETTERS = ['A', 'B', 'C', 'D'];

/** "🇭🇹" → "HT" (country-quiz options are stored as flag emoji); null for anything else. */
export function isoFromFlagEmoji(s: string): string | null {
  const cps = [...s.trim()].map((c) => c.codePointAt(0) ?? 0);
  if (cps.length !== 2 || cps.some((c) => c < 0x1f1e6 || c > 0x1f1ff)) return null;
  return String.fromCharCode(...cps.map((c) => c - 0x1f1e6 + 65));
}

/** Prompt + media + options. `chosen`/`reveal` drive the colours; parent owns the state. */
export function QuestionView({ q, chosen, reveal, onPick, otherChosen, otherAvatar }: { q: Question; chosen: number | null; reveal: boolean; onPick?: (i: number) => void; otherChosen?: number; otherAvatar?: AvatarConfig }) {
  const l = useL(); const t = useT();
  const lang = useStore((s) => s.profile.lang);
  const prompt = l(q.prompt);
  const state = (i: number): 'idle' | 'picked' | 'right' | 'wrong' | 'dim' => {
    if (!reveal) return chosen === i ? 'picked' : 'idle';
    if (i === q.answer) return 'right';
    if (chosen === i) return 'wrong';
    return 'dim';
  };
  const flagOpts = q.options.map((o) => isoFromFlagEmoji(o.ht));
  const allFlags = flagOpts.every(Boolean);
  return (
    <View style={{ gap: 12 }}>
      {q.media?.kind === 'flag' && (
        <Pop key={q.id} from={0.7} style={{ alignItems: 'center', paddingVertical: 4 }}><Flag iso={q.media.ref} width={232} /></Pop>
      )}
      {q.media?.kind === 'shape' && SHAPES[q.media.ref] && (
        <Pop key={q.id} from={0.7} style={{ alignItems: 'center' }}><ShapeView d={SHAPES[q.media.ref]} /></Pop>
      )}
      <Row gap={10} center={false}>
        <PressScale accessibilityLabel={t('listen')} scaleTo={0.88} onPress={() => speak(prompt, lang === 'fr' ? 'fr' : 'ht')} style={{ width: 44, height: 44, alignSelf: 'flex-start', borderRadius: 14, backgroundColor: colors.blueLight, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="koute" size={26} />
        </PressScale>
        <T v="h2" style={{ flex: 1 }}>{prompt}</T>
      </Row>
      <View style={allFlags ? { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } : { gap: 10 }}>
        {q.options.map((o, i) => (
          <FadeIn key={`${q.id}-${i}`} delay={60 + i * 55} style={allFlags ? { width: '47.5%' } : undefined}>
            <OptionButton
              label={allFlags ? '' : l(o)}
              letter={LETTERS[i]}
              state={state(i)}
              celebrate={chosen === i}
              media={allFlags ? <Flag iso={flagOpts[i]!} width={96} card={false} style={{ borderWidth: 1, borderColor: colors.lineStrong }} /> : undefined}
              onPress={!reveal && chosen === null && onPick ? () => onPick(i) : undefined}
            />
            {reveal && otherChosen === i && (
              <Pop style={{ position: 'absolute', right: 8, top: -8 }}>
                {otherAvatar ? <Avatar a={otherAvatar} size={30} /> : <T v="small" color={colors.muted}>🤖</T>}
              </Pop>
            )}
          </FadeIn>
        ))}
      </View>
    </View>
  );
}
