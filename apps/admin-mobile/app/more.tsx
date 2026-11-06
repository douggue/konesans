import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/session';
import { Screen, Header, Card, T, Row, Icon } from '@/ui';
import { colors } from '@/theme';

const ITEMS: { href: string; icon: string; title: string; sub: string }[] = [
  { href: '/texts', icon: 'lang', title: 'Tèks app la', sub: 'Chanje nenpòt tèks nan app timoun yo (Kreyòl ak Fransè)' },
  { href: '/reports', icon: 'siyale', title: 'Rapò', sub: 'Timoun ki rapòte yon lòt jwè' },
  { href: '/history', icon: 'kalandriye', title: 'Istorik', sub: 'Tout chanjman administratè yo fè' },
  { href: '/account', icon: 'femen_kle', title: 'Kont mwen', sub: 'Chanje modpas, sèvè, dekonekte' },
];

export default function More() {
  const email = useSession((s) => s.email);
  return (
    <Screen tabs header={<Header title="Plis" sub={email || 'Administratè'} />}>
      {ITEMS.map((it) => (
        <Card key={it.href} onPress={() => router.push(it.href as never)}>
          <Row>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={it.icon} size={32} /></View>
            <View style={{ flex: 1, gap: 2 }}><T v="h3">{it.title}</T><T v="small" color={colors.muted}>{it.sub}</T></View>
            <T v="h2" color={colors.blue}>›</T>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
