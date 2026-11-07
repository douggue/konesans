import React from 'react';
import { View } from 'react-native';
import { api } from '@/api';
import { useLoad, timeAgo } from '@/lib';
import { Screen, Header, T, Row, Card, Chip, Loading, ErrorBox, Empty } from '@/ui';
import { colors } from '@/theme';

/** Same labels as the web admin's Istorik page. */
const LABEL: Record<string, string> = {
  save: 'Sove', delete: 'Efase', import: 'Enpòte', publish: 'Pibliye', categories: 'Kategori', config: 'Paramèt', strings: 'Tèks',
  password: 'Modpas chanje', 'resolve-report': 'Rapò regle', 'request:approve': 'Demann aksepte', 'request:refuse': 'Demann refize', 'status:approved': 'Apwouve', 'status:draft': 'Pwoblèm', 'status:review': 'Pou relekti',
};
const TONE: Record<string, [string, string]> = {
  publish: [colors.blue, colors.blueSoft], 'status:approved': [colors.greenInk, colors.greenSoft], 'status:draft': [colors.redInk, colors.redSoft], delete: [colors.redInk, colors.redSoft],
  'request:approve': [colors.greenInk, colors.greenSoft], 'request:refuse': [colors.redInk, colors.redSoft],
};

export default function History() {
  const load = useLoad(async () => (await api.audit()).entries);
  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing} header={<Header back title="Istorik" sub="200 dènye chanjman yo" />}>
      {load.loading && !load.data ? <Loading /> : null}
      {load.error ? <ErrorBox text={load.error} onRetry={load.reload} /> : null}
      {load.data && !load.data.length ? <Empty title="Pa gen anyen ankò" /> : null}
      {load.data?.length ? (
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          {load.data.map((e, i) => {
            const [fg, bg] = TONE[e.action] ?? [colors.ink, colors.bg];
            return (
              <View key={i} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, gap: 4 }}>
                <Row gap={8} wrap>
                  <Chip text={LABEL[e.action] ?? e.action} fg={fg} bg={bg} />
                  <T v="mono" color={colors.ink} style={{ flexShrink: 1 }}>{e.target}</T>
                </Row>
                <T v="small" color={colors.muted}>{e.by} · {timeAgo(e.at)}</T>
              </View>
            );
          })}
        </Card>
      ) : null}
    </Screen>
  );
}
