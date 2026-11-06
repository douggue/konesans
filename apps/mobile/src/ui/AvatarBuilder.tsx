/** Avatar builder (onboarding step + /avatar screen). Live preview bobs; every change pops. */
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import type { AvatarConfig } from '@konesans/core';
import { T, Row, Button, PressScale, Bounce } from './index';
import { Avatar, AvatarArt, SKINS, HAIR_COLORS, SHIRTS, BGS, HAIRS, EXTRAS, randomAvatar } from './avatar';
import { colors, radius } from '@/lib/theme';
import { useT, type StrKey } from '@/lib/i18n';
import { tap } from '@/lib/audio';

type Tab = 'skin' | 'hair' | 'hairColor' | 'shirt' | 'extra' | 'bg';
const TABS: { id: Tab; label: StrKey }[] = [
  { id: 'skin', label: 'av_skin' }, { id: 'hair', label: 'av_hair' }, { id: 'hairColor', label: 'av_hair_color' },
  { id: 'shirt', label: 'av_clothes' }, { id: 'extra', label: 'av_extra' }, { id: 'bg', label: 'av_bg' },
];

export function AvatarBuilder({ value, onChange, size = 170 }: { value: AvatarConfig; onChange: (a: AvatarConfig) => void; size?: number }) {
  const t = useT();
  const [tab, setTab] = useState<Tab>('skin');
  const [bump, setBump] = useState(0);
  const set = (p: Partial<AvatarConfig>) => { tap(); setBump((b) => b + 1); onChange({ ...value, ...p }); };

  const items: { key: string; on: boolean; pick: () => void; swatch?: string; preview?: AvatarConfig; label?: string }[] =
    tab === 'skin' ? SKINS.map((c, i) => ({ key: c, swatch: c, on: value.skin === i, pick: () => set({ skin: i }) }))
    : tab === 'hair' ? HAIRS.map((h) => ({ key: h, preview: { ...value, hair: h, extra: 'none' }, label: t(`hair_${h}` as StrKey), on: value.hair === h, pick: () => set({ hair: h }) }))
    : tab === 'hairColor' ? HAIR_COLORS.map((c, i) => ({ key: c, swatch: c, on: value.hairColor === i, pick: () => set({ hairColor: i }) }))
    : tab === 'shirt' ? SHIRTS.map((c, i) => ({ key: c, swatch: c, on: value.shirt === i && value.extra !== 'uniform', pick: () => set({ shirt: i, extra: value.extra === 'uniform' ? 'none' : value.extra }) }))
    : tab === 'extra' ? EXTRAS.map((x) => ({ key: x, preview: { ...value, extra: x }, label: t(`ex_${x}` as StrKey), on: value.extra === x, pick: () => set({ extra: x }) }))
    : BGS.map((c, i) => ({ key: c, swatch: c, on: value.bg === i, pick: () => set({ bg: i }) }));

  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center' }}>
        <Bounce trigger={bump || null} amount={0.06}>
          <Avatar a={value} size={size} live />
        </Bounce>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
        {TABS.map((x) => {
          const on = tab === x.id;
          return (
            <PressScale key={x.id} role="tab" accessibilityState={{ selected: on }} scaleTo={0.92} onPress={() => { tap(); setTab(x.id); }}
              style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? colors.ink : colors.card, borderWidth: 2, borderColor: on ? colors.ink : colors.lineStrong }}>
              <T v="bold" color={on ? '#fff' : colors.ink}>{t(x.label)}</T>
            </PressScale>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {items.map((it) => (
          <PressScale key={it.key} role="button" accessibilityLabel={it.label ?? it.key} accessibilityState={{ selected: it.on }} scaleTo={0.9} onPress={it.pick}
            style={{ width: '22%', minHeight: 74, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderWidth: it.on ? 3 : 2, borderColor: it.on ? colors.blue : colors.lineStrong, borderBottomWidth: it.on ? 3 : 5 }}>
            {it.swatch ? (
              <View style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: colors.ink, backgroundColor: it.swatch }} />
            ) : it.preview ? (
              <AvatarArt a={it.preview} size={46} />
            ) : null}
            {it.label ? <T v="small" center numberOfLines={1}>{it.label}</T> : null}
          </PressScale>
        ))}
      </View>
      <Row style={{ justifyContent: 'center' }}>
        <Button small variant="secondary" icon="chanje" title={t('av_random')} onPress={() => { setBump((b) => b + 1); onChange(randomAvatar()); }} />
      </Row>
    </View>
  );
}
