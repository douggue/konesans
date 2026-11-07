import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { api, errText, type ChangeRequest, type ReqStatus } from '@/api';
import { useLoad, timeAgo } from '@/lib';
import { useSession } from '@/session';
import { Screen, Header, T, Row, Button, Loading, ErrorBox, Empty, Card, Chip, Segmented, haptic } from '@/ui';
import { colors, fonts } from '@/theme';

/** Same labels as the web admin's "Demann" page. */
const AGE_TXT: Record<string, string> = { '6-8': '6–8 an', '9-11': '9–11 an', '12-14': '12–14 an' };
const GRADE_TXT: Record<string, string> = {
  af1: '1ye ane AF', af2: '2yèm ane AF', af3: '3yèm ane AF', af4: '4yèm ane AF', af5: '5yèm ane AF', af6: '6yèm ane AF', af7: '7yèm ane AF', af8: '8yèm ane AF', af9: '9yèm ane AF', none: 'Pa lekòl', other: 'Lòt',
};
const ST: Record<ReqStatus, { label: string; fg: string; bg: string; edge: string }> = {
  pending: { label: 'An tann', fg: colors.yellowInk, bg: colors.yellowSoft, edge: colors.yellow },
  approved: { label: 'Aksepte', fg: colors.greenInk, bg: colors.greenSoft, edge: colors.green },
  refused: { label: 'Refize', fg: colors.redInk, bg: colors.redSoft, edge: colors.red },
};
const input = { flex: 1, borderWidth: 2, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.bg, fontFamily: fonts.body, fontSize: 15, color: colors.ink } as const;

function Change({ label, from, to, txt }: { label: string; from: string | null; to: string; txt: Record<string, string> }) {
  return (
    <Row gap={8} wrap>
      <T v="label" color={colors.muted}>{label}</T>
      <T v="bold">{from == null ? 'pa di' : txt[from] ?? from}</T>
      <T v="bold" color={colors.muted}>→</T>
      <T v="bold" color={colors.blue}>{txt[to] ?? to}</T>
    </Row>
  );
}

/** Age / class change requests from Espas Paran (kids' app). Approving changes the kid's phone by itself. */
export default function Requests() {
  const toast = useSession((s) => s.showToast);
  const bump = useSession((s) => s.bump);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const load = useLoad(() => api.changeRequests(tab), [tab]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const resolve = async (r: ChangeRequest, approve: boolean) => {
    setBusy(r.id + (approve ? ':y' : ':n'));
    try {
      await api.resolveChangeRequest(r.id, approve, (notes[r.id] ?? '').trim() || undefined);
      haptic('ok'); toast(approve ? 'Demann lan aksepte ✓ · Telefòn nan ap chanje poukont li' : 'Demann lan refize');
      bump();
    } catch (e) { toast(errText(e), 'err'); } finally { setBusy(null); }
  };

  const list = load.data?.requests ?? [];
  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing} header={<Header back title="Demann" sub="Paran ki mande chanje laj oswa klas" />}>
      <Segmented value={tab} onChange={setTab} options={[
        { key: 'pending', label: 'An tann', count: load.data?.pending },
        { key: 'all', label: 'Tout' },
      ]} />
      <T v="small" color={colors.muted}>Laj la chwazi kesyon yo ak ki moun timoun nan jwe kont sou entènèt. Lè ou aksepte, telefòn nan chanje poukont li.</T>
      {load.loading && !load.data ? <Loading /> : null}
      {load.error ? <ErrorBox text={load.error} onRetry={load.reload} /> : null}
      {load.data && !list.length ? <Empty title={tab === 'pending' ? 'Pa gen demann k ap tann' : 'Pa gen demann ankò'} text="Lè yon paran mande chanje laj oswa klas yon timoun, li parèt isit la." /> : null}
      {list.map((r) => {
        const st = ST[r.status];
        return (
          <Card key={r.id} edge={st.edge} style={{ gap: 8 }}>
            <Row gap={8}>
              <Chip text={st.label} fg={st.fg} bg={st.bg} />
              <T v="h3" style={{ flex: 1 }} numberOfLines={1}>{r.username}</T>
              <T v="small" color={colors.muted}>{timeAgo(r.createdAt)}</T>
            </Row>
            {r.requested.age ? <Change label="LAJ" from={r.current.age} to={r.requested.age} txt={AGE_TXT} /> : null}
            {r.requested.grade ? <Change label="KLAS" from={r.current.grade} to={r.requested.grade} txt={GRADE_TXT} /> : null}
            {r.reason ? <View style={{ borderLeftWidth: 3, borderLeftColor: colors.line, paddingLeft: 10 }}><T color={colors.muted}>“{r.reason}”</T></View> : <T v="small" color={colors.muted}>Pa gen rezon.</T>}
            {r.status === 'pending' ? (
              <>
                <TextInput value={notes[r.id] ?? ''} onChangeText={(v) => setNotes((n) => ({ ...n, [r.id]: v }))} maxLength={140} placeholder="Nòt pou paran an (si ou vle)" placeholderTextColor={colors.muted} style={input} accessibilityLabel="Nòt pou paran an" />
                <Row gap={8}>
                  <Button title="Refize" kind="bad" busy={busy === r.id + ':n'} disabled={!!busy} onPress={() => resolve(r, false)} style={{ flex: 1 }} />
                  <Button title="Aksepte" kind="good" busy={busy === r.id + ':y'} disabled={!!busy} onPress={() => resolve(r, true)} style={{ flex: 1 }} />
                </Row>
              </>
            ) : (
              <T v="small" color={colors.muted}>{st.label} pa {r.resolvedBy ?? '–'} · {timeAgo(r.resolvedAt)}{r.note ? ` · Nòt: ${r.note}` : ''}</T>
            )}
            <T v="mono" color={colors.muted}>Aparèy {r.userId.slice(0, 8)}</T>
          </Card>
        );
      })}
    </Screen>
  );
}
