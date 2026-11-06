import React, { useState } from 'react';
import { View } from 'react-native';
import { api, errText, type Report } from '@/api';
import { useLoad, timeAgo } from '@/lib';
import { useSession } from '@/session';
import { Screen, Header, T, Row, Button, Loading, ErrorBox, Empty, Card, Chip, Segmented, haptic } from '@/ui';
import { colors } from '@/theme';

const REASONS: Record<string, string> = {
  rude: 'Li pa janti', cheat: 'Li triche', name: 'Non li pa bon', spam: 'Li voye twòp mesaj', other: 'Lòt rezon',
};

export default function Reports() {
  const toast = useSession((s) => s.showToast);
  const bump = useSession((s) => s.bump);
  const load = useLoad(async () => (await api.reports()).reports);
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [busy, setBusy] = useState<number | null>(null);

  const all = (load.data ?? []).map((r, index) => ({ ...r, index }));
  const shown = all.filter((r) => (tab === 'open' ? !r.resolved : r.resolved)).reverse();

  const resolve = async (r: Report & { index: number }) => {
    setBusy(r.index);
    try {
      await api.resolveReport(r.index);
      load.setData((load.data ?? []).map((x, i) => (i === r.index ? { ...x, resolved: true } : x)));
      bump(); haptic('ok'); toast('Rapò a rezoud');
    } catch (e) { toast(errText(e), 'err'); } finally { setBusy(null); }
  };

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing} header={<Header back title="Rapò" sub="Timoun ki rapòte yon lòt jwè" />}>
      <Segmented value={tab} onChange={setTab} options={[
        { key: 'open', label: 'Ouvè', count: all.filter((r) => !r.resolved).length },
        { key: 'done', label: 'Rezoud', count: all.filter((r) => r.resolved).length },
      ]} />
      {load.loading && !load.data ? <Loading /> : null}
      {load.error ? <ErrorBox text={load.error} onRetry={load.reload} /> : null}
      {load.data && !shown.length ? <Empty title={tab === 'open' ? 'Pa gen rapò ouvè' : 'Pa gen rapò rezoud'} text={tab === 'open' ? 'Bon nouvèl! Timoun yo jwe byen.' : undefined} /> : null}
      {shown.map((r) => (
        <Card key={r.index} edge={r.resolved ? colors.line : colors.red}>
          <Row gap={6} wrap>
            <Chip text={REASONS[r.reason] ?? r.reason} fg={colors.redInk} bg={colors.redSoft} />
            <T v="small" color={colors.muted}>{timeAgo(r.at)}</T>
          </Row>
          <View style={{ gap: 2 }}>
            <T v="small" color={colors.muted}>Moun ki rapòte: <T v="mono" color={colors.ink}>{r.reporterId.slice(0, 8)}</T></T>
            <T v="small" color={colors.muted}>Jwè ki rapòte a: <T v="mono" color={colors.ink}>{r.targetId.slice(0, 8)}</T></T>
            {r.matchId ? <T v="small" color={colors.muted}>Match: <T v="mono" color={colors.ink}>{r.matchId.slice(0, 12)}</T></T> : null}
          </View>
          {!r.resolved ? <Button title="Make kòm rezoud" kind="plain" busy={busy === r.index} onPress={() => resolve(r)} style={{ alignSelf: 'flex-start' }} /> : <T v="small" color={colors.greenInk}>✓ Rezoud</T>}
        </Card>
      ))}
    </Screen>
  );
}
