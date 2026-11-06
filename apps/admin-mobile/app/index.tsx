import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Animated, Platform } from 'react-native';
import { router } from 'expo-router';
import { api, errText, type Stats, type Category, type AdminQuestion } from '@/api';
import { useLoad, DEFAULT_CATS, timeAgo } from '@/lib';
import { useSession } from '@/session';
import { useCache } from '@/cache';
import { Screen, Header, Card, T, Row, Button, Icon, ProgressBar, Loading, ErrorBox, Sheet, Press, haptic } from '@/ui';
import { colors, STATUS } from '@/theme';

function StatTile({ value, label, color, bg, onPress, delay = 0 }: { value: number | string; label: string; color: string; bg: string; onPress?: () => void; delay?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 320, delay, useNativeDriver: Platform.OS !== 'web' }).start(); }, [a, delay]);
  const body = (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }], backgroundColor: bg, borderRadius: 16, padding: 12, gap: 2, minHeight: 74, flexGrow: 1 }}>
      <T v="h1" color={color} style={{ fontVariant: ['tabular-nums'] }}>{value}</T>
      <T v="small" color={color}>{label}</T>
    </Animated.View>
  );
  return <View style={{ flex: 1, minWidth: 0 }}>{onPress ? <Press onPress={onPress} style={{ flexGrow: 1 }}>{body}</Press> : body}</View>;
}

export default function Dashboard() {
  const email = useSession((s) => s.email);
  const logout = useSession((s) => s.logout);
  const toast = useSession((s) => s.showToast);
  const bump = useSession((s) => s.bump);
  const setCategories = useCache((s) => s.setCategories);
  const stats = useLoad<Stats>(() => api.stats());
  const cats = useLoad<Category[]>(async () => { const r = await api.categories(); setCategories(r.categories); return r.categories; });
  const [confirm, setConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const apiUrl = useSession((s) => s.apiUrl);
  const [importing, setImporting] = useState<string | null>(null);

  /** Same as the web admin: load the bank that ships with the app (served next to the web admin as bank.json). */
  const importBank = async () => {
    setImporting('N ap telechaje…');
    try {
      const url = apiUrl.replace(/\/$/, '').replace('://api.', '://admin.') + '/bank.json';
      const r = await fetch(url); if (!r.ok) throw new Error('bank.json pa disponib sou sèvè a');
      const all: AdminQuestion[] = ((await r.json()).questions as any[]).map((q) => ({
        id: q.id, category: q.category, d: q.difficulty, ages: q.ages, ht: q.prompt.ht, fr: q.prompt.fr ?? '', opts: q.options.map((o: any) => o.ht), optsFr: q.options.map((o: any) => o.fr ?? ''),
        a: q.answer, ex: q.explain?.ht ?? '', exFr: q.explain?.fr ?? '', topic: q.topic, status: q.status ?? 'review',
      }));
      let added = 0;
      for (let i = 0; i < all.length; i += 150) { const res = await api.importQuestions(all.slice(i, i + 150)); added += res.added; setImporting(`Enpòte ${Math.min(i + 150, all.length)}/${all.length}…`); }
      haptic('ok'); toast(`${added} kesyon enpòte`); bump();
    } catch (e) { toast(errText(e), 'err'); } finally { setImporting(null); }
  };

  const catList = useMemo(() => {
    const list = cats.data?.length ? [...cats.data].sort((a, b) => a.order - b.order) : DEFAULT_CATS;
    return list.map((c) => ({ id: c.id, name: c.name.ht, icon: c.icon, color: c.color }));
  }, [cats.data]);

  const publish = async () => {
    setPublishing(true);
    try {
      const r = await api.publish();
      haptic('ok');
      setConfirm(false);
      toast(`Pibliye! Vèsyon ${r.version} · ${r.packs.reduce((n, p) => n + p.count, 0)} kesyon`);
      bump();
    } catch (e) {
      toast(errText(e), 'err');
    } finally {
      setPublishing(false);
    }
  };

  const s = stats.data;
  const q = s?.questions;
  return (
    <Screen
      tabs
      onRefresh={() => { stats.refresh(); cats.refresh(); }}
      refreshing={stats.refreshing}
      header={<Header title="Tablo" sub={email || 'Administratè'} right={
        <Press label="Dekonekte" onPress={() => setConfirmLogout(true)} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: colors.line }}>
          <T v="small" color={colors.muted}>Soti</T>
        </Press>
      } />}
    >
      {stats.loading && !s ? <Loading /> : null}
      {stats.error ? <ErrorBox text={stats.error} onRetry={stats.reload} /> : null}

      {s && q ? (
        <>
          {/* Publish card */}
          <Card edge={s.draftChanges > 0 ? colors.blue : colors.line} style={{ gap: 10 }}>
            <Row>
              <Icon name="pataje" size={34} />
              <View style={{ flex: 1 }}>
                <T v="h2">{s.published.version ? `Vèsyon ${s.published.version} sou telefòn timoun yo` : 'Poko pibliye'}</T>
                <T v="small" color={colors.muted}>{s.published.publishedAt ? `Dènye piblikasyon: ${timeAgo(s.published.publishedAt)}` : 'Timoun yo gen kesyon ki nan app la sèlman'}</T>
              </View>
            </Row>
            <T v="bold" color={s.draftChanges > 0 ? colors.blue : colors.muted}>
              {s.draftChanges > 0 ? `${s.draftChanges} chanjman ki poko pibliye` : 'Tout chanjman yo pibliye deja'}
            </T>
            <Button title="Pibliye" big kind={s.draftChanges > 0 ? 'primary' : 'plain'} onPress={() => setConfirm(true)} />
          </Card>

          {q.total === 0 ? (
            <Card edge={colors.yellow} style={{ gap: 8 }}>
              <T v="h2">Bank kesyon an vid</T>
              <T v="small" color={colors.muted}>Enpòte kesyon ki vini ak app la pou kòmanse relekti.</T>
              <Button title={importing ?? 'Enpòte bank kesyon an'} busy={!!importing} onPress={importBank} />
            </Card>
          ) : null}

          {/* Question status tiles */}
          <T v="label" color={colors.muted}>Kesyon · {q.total}</T>
          <Row gap={8} style={{ alignItems: 'stretch' }}>
            <StatTile value={q.review} label={STATUS.review.label} color={STATUS.review.fg} bg={STATUS.review.bg} onPress={() => router.replace('/questions?status=review' as never)} />
            <StatTile value={q.approved} label={STATUS.approved.label} color={STATUS.approved.fg} bg={STATUS.approved.bg} delay={60} onPress={() => router.replace('/questions?status=approved' as never)} />
            <StatTile value={q.draft} label={STATUS.draft.label} color={STATUS.draft.fg} bg={STATUS.draft.bg} delay={120} onPress={() => router.replace('/questions?status=draft' as never)} />
          </Row>

          {/* Players & reports */}
          <Row gap={8} style={{ alignItems: 'stretch' }}>
            <StatTile value={s.players.total} label="Jwè an tout" color={colors.blue} bg={colors.blueSoft} delay={180} />
            <StatTile value={s.players.last7d} label="Aktif 7 dènye jou" color={colors.blue} bg={colors.blueSoft} delay={240} />
            <StatTile value={s.reports.open} label="Rapò ouvè" color={s.reports.open ? colors.redInk : colors.muted} bg={s.reports.open ? colors.redSoft : colors.card} delay={300} onPress={() => router.push('/reports')} />
          </Row>

          {/* Per-category progress */}
          <T v="label" color={colors.muted}>Relekti pa kategori</T>
          <Card style={{ gap: 12 }}>
            {catList.map((c) => {
              const b = q.byCategory[c.id] ?? { total: 0, approved: 0, review: 0, draft: 0 };
              return (
                <Press key={c.id} scaleTo={0.98} onPress={() => router.replace(`/questions?category=${c.id}` as never)} style={{ gap: 6 }}>
                  <Row>
                    <Icon name={c.icon} size={24} />
                    <T v="bold" style={{ flex: 1 }}>{c.name}</T>
                    <T v="small" color={colors.muted} style={{ fontVariant: ['tabular-nums'] }}>{b.approved}/{b.total}{b.draft ? ` · ${b.draft} ⚑` : ''}</T>
                  </Row>
                  <ProgressBar value={b.total ? b.approved / b.total : 0} />
                </Press>
              );
            })}
          </Card>
        </>
      ) : null}

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Pibliye kounye a?">
        <T center color={colors.muted}>
          Tout kesyon ki apwouve (ak sa ki pou relekti si paramèt la louvri), kategori yo ak paramèt app la ap rive sou telefòn timoun yo lè yo louvri app la.
        </T>
        <Button title="Wi, pibliye" big busy={publishing} onPress={publish} />
        <Button title="Anile" kind="ghost" onPress={() => setConfirm(false)} />
      </Sheet>
      <Sheet open={confirmLogout} onClose={() => setConfirmLogout(false)} title="Dekonekte?">
        <Button title="Wi, dekonekte" kind="danger" onPress={() => { setConfirmLogout(false); logout(); }} />
        <Button title="Anile" kind="ghost" onPress={() => setConfirmLogout(false)} />
      </Sheet>
    </Screen>
  );
}
