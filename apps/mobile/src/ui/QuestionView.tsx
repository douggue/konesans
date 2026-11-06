import React from 'react';
import { View, Pressable } from 'react-native';
import { SHAPES, type Question } from '@konesans/core';
import { T, Row, OptionButton, Icon, ShapeView, flagEmoji } from './index';
import { colors } from '@/lib/theme';
import { useL } from '@/lib/i18n';
import { speak } from '@/lib/audio';

const LETTERS = ['A', 'B', 'C', 'D'];

/** Prompt + media + options. `chosen`/`reveal` drive the colours; parent owns the state. */
export function QuestionView({ q, chosen, reveal, onPick, otherChosen }: { q: Question; chosen: number | null; reveal: boolean; onPick?: (i: number) => void; otherChosen?: number }) {
  const l = useL();
  const prompt = l(q.prompt);
  const state = (i: number): 'idle' | 'picked' | 'right' | 'wrong' | 'dim' => {
    if (!reveal) return chosen === i ? 'picked' : 'idle';
    if (i === q.answer) return 'right';
    if (chosen === i) return 'wrong';
    return 'dim';
  };
  return (
    <View style={{ gap: 12 }}>
      {q.media?.kind === 'flag' && (
        <View style={{ alignItems: 'center', paddingVertical: 6 }}><T style={{ fontSize: 96, lineHeight: 112 }}>{flagEmoji(q.media.ref)}</T></View>
      )}
      {q.media?.kind === 'shape' && SHAPES[q.media.ref] && (
        <View style={{ alignItems: 'center' }}><ShapeView d={SHAPES[q.media.ref]} /></View>
      )}
      <Row gap={10} center={false}>
        <Pressable accessibilityLabel="Koute" onPress={() => speak(prompt, 'ht')} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.blueLight, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="koute" size={26} />
        </Pressable>
        <T v="h2" style={{ flex: 1 }}>{prompt}</T>
      </Row>
      <View style={{ gap: 10 }}>
        {q.options.map((o, i) => (
          <View key={i}>
            <OptionButton label={l(o)} letter={LETTERS[i]} state={state(i)} onPress={!reveal && chosen === null && onPick ? () => onPick(i) : undefined} />
            {reveal && otherChosen === i && <View style={{ position: 'absolute', right: 10, top: 10 }}><T v="small" color={colors.muted}>🤖</T></View>}
          </View>
        ))}
      </View>
    </View>
  );
}
