/** The one level chooser used everywhere (Peyi, Defi categories…): ★ / ★★ / ★★★ cards, the chosen one filled. */
import React from 'react';
import { Row, T, PressScale, readableOn, DEEP_GREEN } from './index';
import { colors, radius } from '@/lib/theme';
import { tap } from '@/lib/audio';

export type Level3 = 1 | 2 | 3;
/** fills for the chosen card; the label colour is picked for contrast (ink on orange, white on the others) */
export const LEVEL_COLORS: Record<Level3, string> = { 1: DEEP_GREEN, 2: colors.orange, 3: colors.red };

export function LevelPicker({ value, onChange, labels }: { value: Level3; onChange: (v: Level3) => void; labels: [string, string, string] }) {
  return (
    <Row gap={10}>
      {([1, 2, 3] as Level3[]).map((l) => {
        const on = value === l; const color = LEVEL_COLORS[l]; const fg = on ? readableOn(color) : colors.ink;
        return (
          <PressScale debounceMs={0} key={l} role="button" accessibilityState={{ selected: on }} accessibilityLabel={labels[l - 1]} onPress={() => { tap(); onChange(l); }}
            style={{ flex: 1, minHeight: 72, gap: 2, paddingHorizontal: 6, borderRadius: radius.md, backgroundColor: on ? color : colors.card, borderWidth: 2, borderColor: on ? color : colors.line, borderBottomWidth: on ? 2 : 5, alignItems: 'center', justifyContent: 'center' }}>
            <T v="h3" color={fg}>{'★'.repeat(l)}</T>
            <T v="bold" color={fg} numberOfLines={1} adjustsFontSizeToFit>{labels[l - 1]}</T>
          </PressScale>
        );
      })}
    </Row>
  );
}
