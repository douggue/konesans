import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { api, errText, type AppConfig } from '@/api';
import { useLoad } from '@/lib';
import { useSession } from '@/session';
import { publishNow } from '@/lib';
import { Screen, Header, T, Row, Field, Button, SwitchRow, Loading, ErrorBox, Press, Card, haptic } from '@/ui';
import { colors } from '@/theme';

const ANN_COLORS: { key: AppConfig['announcement']['color']; label: string; bg: string; fg: string }[] = [
  { key: 'blue', label: 'Ble', bg: colors.blueSoft, fg: colors.blue },
  { key: 'yellow', label: 'Jòn', bg: colors.yellowSoft, fg: colors.yellowInk },
  { key: 'red', label: 'Wouj', bg: colors.redSoft, fg: colors.redInk },
  { key: 'green', label: 'Vèt', bg: colors.greenSoft, fg: colors.greenInk },
];
const FEATURES: { key: keyof AppConfig['features']; label: string; sub: string }[] = [
  { key: 'duels', label: 'Defi 1 kont 1', sub: 'Jwe kont lòt timoun oswa Robo' },
  { key: 'courses', label: 'Kou lang', sub: 'Angle ak Panyòl' },
  { key: 'coding', label: 'Enfòmatik', sub: 'Fè robo a mache ak blòk' },
  { key: 'math', label: 'Kalkil Mantal', sub: 'Jwèt 60 segonn' },
  { key: 'peyi', label: 'Peyi', sub: 'Drapo, kapital, fòm peyi' },
];

export default function Settings() {
  const toast = useSession((s) => s.showToast);
  const bump = useSession((s) => s.bump);
  const apiUrl = useSession((s) => s.apiUrl);
  const load = useLoad(async () => (await api.config()).config);
  const [c, setC] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (load.data) setC(load.data); }, [load.data]);
  const dirty = useMemo(() => !!c && JSON.stringify(c) !== JSON.stringify(load.data), [c, load.data]);

  const save = async () => {
    if (!c) return;
    if (c.announcement.on && !c.announcement.ht.trim()) { toast('Ekri anons lan an Kreyòl', 'err'); return; }
    if (c.maintenance.on && !c.maintenance.ht.trim()) { toast('Ekri mesaj antretyen an an Kreyòl', 'err'); return; }
    if (!/^\d+\.\d+\.\d+$/.test(c.minAppVersion.trim())) { toast('Vèsyon minimòm lan dwe sanble 1.0.0', 'err'); return; }
    setSaving(true);
    try {
      const r = await api.saveConfig({ ...c, minAppVersion: c.minAppVersion.trim() });
      load.setData(r.config); setC(r.config); bump();
      haptic('ok'); toast('Sove ✓ · Timoun yo pa wè l toutotan ou pa pibliye', 'info', { label: 'Pibliye', run: publishNow(toast, bump) });
    } catch (e) { toast(errText(e), 'err'); } finally { setSaving(false); }
  };

  return (
    <Screen
      tabs
      onRefresh={load.refresh}
      refreshing={load.refreshing}
      header={<Header title="Paramèt app la" sub={apiUrl.replace(/^https?:\/\//, '')} />}
      bottom={dirty ? (
        <Row gap={8} style={{ padding: 12, borderTopWidth: 2, borderTopColor: colors.line }}>
          <Button title="Anile" kind="ghost" onPress={() => setC(load.data)} />
          <Button title="Sove" busy={saving} onPress={save} style={{ flex: 1 }} />
        </Row>
      ) : undefined}
    >
      {load.loading && !c ? <Loading /> : null}
      {load.error ? <ErrorBox text={load.error} onRetry={load.reload} /> : null}
      {c ? (
        <>
          <T v="label" color={colors.muted}>Fonksyon</T>
          <Card style={{ gap: 0 }}>
            {FEATURES.map((f) => (
              <SwitchRow key={f.key} label={f.label} sub={f.sub} value={c.features[f.key]} onChange={(v) => setC({ ...c, features: { ...c.features, [f.key]: v } })} />
            ))}
          </Card>

          <T v="label" color={colors.muted}>Anons sou paj lakay la</T>
          <Card>
            <SwitchRow label="Montre anons lan" value={c.announcement.on} onChange={(v) => setC({ ...c, announcement: { ...c.announcement, on: v } })} />
            {c.announcement.on ? (
              <View style={{ gap: 10 }}>
                <Field label="Mesaj (Kreyòl)" multiline value={c.announcement.ht} onChangeText={(v) => setC({ ...c, announcement: { ...c.announcement, ht: v } })} placeholder="Nouvo kesyon sou Istwa!" />
                <Field label="Message (Français)" multiline value={c.announcement.fr} onChangeText={(v) => setC({ ...c, announcement: { ...c.announcement, fr: v } })} />
                <Row gap={6} wrap>
                  {ANN_COLORS.map((a) => (
                    <Press key={a.key} scaleTo={0.92} onPress={() => setC({ ...c, announcement: { ...c.announcement, color: a.key } })} style={{ backgroundColor: a.bg, borderRadius: 12, borderWidth: 2, borderColor: c.announcement.color === a.key ? a.fg : 'transparent', paddingHorizontal: 12, paddingVertical: 6 }}>
                      <T v="bold" color={a.fg}>{a.label}</T>
                    </Press>
                  ))}
                </Row>
                {c.announcement.ht ? (
                  <View style={{ backgroundColor: ANN_COLORS.find((a) => a.key === c.announcement.color)?.bg, borderRadius: 14, padding: 12 }}>
                    <T v="small" color={colors.muted}>Apèsi</T>
                    <T v="bold" color={ANN_COLORS.find((a) => a.key === c.announcement.color)?.fg}>{c.announcement.ht}</T>
                  </View>
                ) : null}
              </View>
            ) : null}
          </Card>

          <T v="label" color={colors.muted}>Antretyen</T>
          <Card edge={c.maintenance.on ? colors.red : colors.line}>
            <SwitchRow label="Mete app la an antretyen" sub="Timoun yo wè mesaj la epi yo pa ka jwe sou entènèt" value={c.maintenance.on} onChange={(v) => setC({ ...c, maintenance: { ...c.maintenance, on: v } })} />
            {c.maintenance.on ? (
              <View style={{ gap: 10 }}>
                <Field label="Mesaj (Kreyòl)" multiline value={c.maintenance.ht} onChangeText={(v) => setC({ ...c, maintenance: { ...c.maintenance, ht: v } })} placeholder="N ap amelyore app la. Tounen pita!" />
                <Field label="Message (Français)" multiline value={c.maintenance.fr} onChangeText={(v) => setC({ ...c, maintenance: { ...c.maintenance, fr: v } })} />
              </View>
            ) : null}
          </Card>

          <T v="label" color={colors.muted}>Kesyon</T>
          <Card>
            <SwitchRow label="Sèvi kesyon ki pou relekti tou" sub="Fèmen l lè tout kesyon yo fin relekti" value={c.serveReview} onChange={(v) => setC({ ...c, serveReview: v })} />
            <Row style={{ paddingVertical: 6 }}>
              <View style={{ flex: 1 }}>
                <T v="bold">Kesyon nan defi jodi a</T>
                <T v="small" color={colors.muted}>Ant 5 ak 20</T>
              </View>
              <Press label="Mwens" onPress={() => setC({ ...c, dailyCount: Math.max(5, c.dailyCount - 1) })} style={step}><T v="h2">−</T></Press>
              <T v="h1" style={{ minWidth: 40, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{c.dailyCount}</T>
              <Press label="Plis" onPress={() => setC({ ...c, dailyCount: Math.min(20, c.dailyCount + 1) })} style={step}><T v="h2">+</T></Press>
            </Row>
          </Card>

          <T v="label" color={colors.muted}>Vèsyon</T>
          <Card>
            <Field label="Vèsyon minimòm app la" value={c.minAppVersion} onChangeText={(v) => setC({ ...c, minAppVersion: v })} autoCapitalize="none" keyboardType="numbers-and-punctuation" />
            <T v="small" color={colors.muted}>Timoun ki gen yon vèsyon ki pi piti ap wè yon mesaj pou mete app la ajou.</T>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const step = { width: 42, height: 42, borderRadius: 12, borderWidth: 2, borderColor: colors.line, borderBottomWidth: 4, alignItems: 'center' as const, justifyContent: 'center' as const };
