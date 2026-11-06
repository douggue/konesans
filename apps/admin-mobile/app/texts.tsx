import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput } from 'react-native';
import { api, errText } from '@/api';
import { useLoad } from '@/lib';
import { useSession } from '@/session';
import { Screen, Header, T, Row, Button, Loading, ErrorBox, Card, Icon, Toggle, haptic } from '@/ui';
import { colors, fonts } from '@/theme';

type Pair = [string, string];
const input = { borderWidth: 2, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.bg, fontFamily: fonts.body, fontSize: 15, color: colors.ink } as const;

/** Same as the web admin's "Tèks app la": override any UI text of the kids' app. Empty = original text. */
export default function Texts() {
  const toast = useSession((s) => s.showToast);
  const bump = useSession((s) => s.bump);
  const load = useLoad(() => api.strings());
  const [draft, setDraft] = useState<Record<string, Pair>>({});
  const [query, setQuery] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (load.data) setDraft(JSON.parse(JSON.stringify(load.data.overrides))); }, [load.data]);
  const dirty = !!load.data && JSON.stringify(draft) !== JSON.stringify(load.data.overrides);

  const keys = useMemo(() => {
    if (!load.data) return [];
    const q = query.trim().toLowerCase();
    return Object.keys(load.data.defaults).filter((k) => (!onlyChanged || draft[k])
      && (!q || k.includes(q) || load.data!.defaults[k].join(' ').toLowerCase().includes(q) || (draft[k] ?? []).join(' ').toLowerCase().includes(q)));
  }, [load.data, query, draft, onlyChanged]);

  const setPart = (k: string, i: 0 | 1, v: string) => setDraft((d) => {
    const cur: Pair = d[k] ? [...d[k]] as Pair : ['', ''];
    cur[i] = v;
    const next = { ...d };
    if (!cur[0].trim() && !cur[1].trim()) delete next[k]; else next[k] = cur;
    return next;
  });
  const save = async () => {
    setSaving(true);
    try { const r = await api.saveStrings(draft); load.setData({ ...load.data!, overrides: r.overrides }); setDraft(JSON.parse(JSON.stringify(r.overrides))); haptic('ok'); bump(); toast('Tèks yo sove · pibliye pou yo rive sou telefòn yo'); }
    catch (e) { toast(errText(e), 'err'); } finally { setSaving(false); }
  };

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}
      header={<Header back title="Tèks app la" sub="Kite yon kaz vid pou tounen nan tèks orijinal la" />}
      bottom={dirty ? <View style={{ padding: 12 }}><Button title="Sove tèks yo" big busy={saving} onPress={save} /></View> : undefined}>
      {load.loading && !load.data ? <Loading /> : null}
      {load.error ? <ErrorBox text={load.error} onRetry={load.reload} /> : null}
      {load.data ? (
        <>
          <Row gap={8} style={{ borderWidth: 2, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 12 }}>
            <Icon name="chache" size={20} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Chèche yon tèks…" placeholderTextColor={colors.muted} style={{ flex: 1, minHeight: 42, fontFamily: fonts.bodyRegular, fontSize: 15, color: colors.ink }} autoCorrect={false} />
          </Row>
          <Row gap={6}><Toggle text="Tout" on={!onlyChanged} onPress={() => setOnlyChanged(false)} /><Toggle text={`Chanje (${Object.keys(draft).length})`} on={onlyChanged} onPress={() => setOnlyChanged(true)} /></Row>
          {keys.slice(0, 80).map((k) => {
            const d = load.data!.defaults[k]; const o = draft[k];
            return (
              <Card key={k} edge={o ? colors.blue : undefined} style={{ gap: 8 }}>
                <T v="mono" color={o ? colors.blue : colors.muted}>{k}</T>
                <View style={{ gap: 4 }}>
                  <TextInput value={o?.[0] ?? ''} onChangeText={(v) => setPart(k, 0, v)} placeholder={d[0]} placeholderTextColor={colors.muted} style={input} accessibilityLabel={`${k} Kreyòl`} />
                  <T v="small" color={colors.muted}>Kreyòl: {d[0]}</T>
                </View>
                <View style={{ gap: 4 }}>
                  <TextInput value={o?.[1] ?? ''} onChangeText={(v) => setPart(k, 1, v)} placeholder={d[1]} placeholderTextColor={colors.muted} style={input} accessibilityLabel={`${k} français`} />
                  <T v="small" color={colors.muted}>Français : {d[1]}</T>
                </View>
              </Card>
            );
          })}
          {keys.length > 80 ? <T v="small" color={colors.muted} center>Montre 80 sou {keys.length} · chèche pou jwenn lòt yo</T> : null}
        </>
      ) : null}
    </Screen>
  );
}
