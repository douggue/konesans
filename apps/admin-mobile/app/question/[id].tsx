import React, { useEffect, useMemo, useState } from 'react';
import { View, BackHandler, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, errText, type AdminQuestion, type Age, type QStatus } from '@/api';
import { lintQuestion, blocking, DEFAULT_CATS } from '@/lib';
import { useCache } from '@/cache';
import { useSession } from '@/session';
import { Screen, T, Row, Field, Button, Toggle, Warn, Loading, ErrorBox, Sheet, Press, Icon, StatusChip, haptic } from '@/ui';
import { colors, raised } from '@/theme';

const PREFIX: Record<string, string> = { ist: 'istwa', jeo: 'jewografi', kil: 'kilti', sya: 'syans', mat: 'matematik', jen: 'jeneral', esp: 'espo', tek: 'teknoloji', pey: 'peyi' };
const AGES: Age[] = ['6-8', '9-11', '12-14'];
const L = ['A', 'B', 'C', 'D'];

export default function Editor() {
  const { id, isNew } = useLocalSearchParams<{ id: string; isNew?: string }>();
  const fresh = isNew === '1';
  const find = useCache((s) => s.find);
  const upsert = useCache((s) => s.upsert);
  const remove = useCache((s) => s.remove);
  const put = useCache((s) => s.put);
  const cats = useCache((s) => s.categories);
  const toast = useSession((s) => s.showToast);
  const bump = useSession((s) => s.bump);

  const [orig, setOrig] = useState<AdminQuestion | null>(() => find(id) ?? null);
  const [q, setQ] = useState<AdminQuestion | null>(() => find(id) ?? null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Deep link / cold open: fetch the category and find the question.
  useEffect(() => {
    if (q) return;
    const category = PREFIX[id.split('-')[0]];
    if (!category) { setLoadErr('Id kesyon sa a pa bon.'); return; }
    api.questions(category).then((r) => {
      put(category, r.questions);
      const found = r.questions.find((x) => x.id === id);
      if (!found) setLoadErr('Kesyon sa a pa egziste ankò.');
      setOrig(found ?? null); setQ(found ?? null);
    }).catch((e) => setLoadErr(errText(e)));
  }, [id, q, put]);

  const dirty = useMemo(() => fresh || JSON.stringify(q) !== JSON.stringify(orig), [q, orig, fresh]);
  const problems = useMemo(() => (q ? lintQuestion(q) : []), [q]);

  const leave = () => {
    if (fresh && q && !orig?.updatedAt) remove(q.id); // never saved: drop the local blank
    router.canGoBack() ? router.back() : router.replace('/questions' as never);
  };
  const tryLeave = () => { if (dirty) setConfirmLeave(true); else leave(); return true; };
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', tryLeave);
    return () => sub.remove();
  });

  if (!q) return <Screen header={<Bar title={id} onBack={() => router.back()} />}>{loadErr ? <ErrorBox text={loadErr} /> : <Loading />}</Screen>;

  const set = (patch: Partial<AdminQuestion>) => setQ({ ...q, ...patch });
  const setOpt = (i: number, ht?: string, fr?: string) => {
    const opts = q.opts.slice(), optsFr = q.optsFr.slice();
    if (ht !== undefined) opts[i] = ht;
    if (fr !== undefined) optsFr[i] = fr;
    set({ opts, optsFr });
  };
  const addOpt = () => q.opts.length < 4 && set({ opts: [...q.opts, ''], optsFr: [...q.optsFr, ''] });
  const delOpt = (i: number) => {
    if (q.opts.length <= 3) return;
    let a = q.a; if (a === i) a = 0; else if (a > i) a -= 1;
    set({ opts: q.opts.filter((_, k) => k !== i), optsFr: q.optsFr.filter((_, k) => k !== i), a });
  };
  const toggleAge = (age: Age) => set({ ages: q.ages.includes(age) ? q.ages.filter((x) => x !== age) : AGES.filter((x) => x === age || q.ages.includes(x)) });

  const save = async (status?: QStatus) => {
    const next = { ...q, status: status ?? q.status, topic: q.topic?.trim() ?? '', note: q.note?.trim() ?? '' };
    if (next.status === 'approved' && blocking(next).length) { haptic('warn'); toast('Korije pwoblèm yo anvan ou apwouve', 'err'); return; }
    if (!next.ht.trim()) { haptic('warn'); toast('Ekri kesyon an an Kreyòl', 'err'); return; }
    setBusy(status ?? 'save');
    try {
      const r = await api.saveQuestion(next);
      upsert(r.question); setOrig(r.question); setQ(r.question);
      bump();
      haptic('ok');
      toast(status === 'approved' ? 'Apwouve' : status === 'draft' ? 'Make kòm pwoblèm' : status === 'review' ? 'Remete pou relekti' : 'Sove');
      if (status === 'approved' || fresh) router.canGoBack() ? router.back() : router.replace('/questions' as never);
    } catch (e) {
      toast(errText(e), 'err');
    } finally {
      setBusy(null);
    }
  };
  const del = async () => {
    setBusy('delete');
    try {
      if (!fresh || orig?.updatedAt) await api.deleteQuestion(q.id);
      remove(q.id); bump();
      setConfirmDelete(false);
      toast('Kesyon an efase');
      router.canGoBack() ? router.back() : router.replace('/questions' as never);
    } catch (e) { toast(errText(e), 'err'); } finally { setBusy(null); }
  };

  const catName = (cats ?? DEFAULT_CATS).find((c) => c.id === q.category)?.name.ht ?? q.category;
  return (
    <Screen
      header={<Bar title={fresh ? 'Nouvo kesyon' : 'Korije kesyon'} sub={`${q.id} · ${catName}`} onBack={tryLeave} right={<StatusChip status={q.status} />} />}
      bottom={
        <View style={{ padding: 12, gap: 8, borderTopWidth: 2, borderTopColor: colors.line }}>
          <Row gap={8}>
            <Button title="Apwouve" icon="bon" kind="good" busy={busy === 'approved'} onPress={() => save('approved')} style={{ flex: 1 }} />
            <Button title={dirty ? 'Sove' : 'Sove'} kind={dirty ? 'primary' : 'plain'} busy={busy === 'save'} onPress={() => save()} style={{ flex: 1 }} />
          </Row>
          <Row gap={8}>
            <Button title="Pwoblèm" kind="bad" busy={busy === 'draft'} onPress={() => save('draft')} style={{ flex: 1 }} />
            {q.status !== 'review' ? <Button title="Pou relekti" kind="plain" busy={busy === 'review'} onPress={() => save('review')} style={{ flex: 1 }} /> : null}
            <Button title="Efase" kind="ghost" onPress={() => setConfirmDelete(true)} />
          </Row>
        </View>
      }
    >
      <Field label="Kesyon (Kreyòl)" big multiline value={q.ht} onChangeText={(v) => set({ ht: v })} placeholder="Ki kapital Ayiti?" />
      <Field label="Question (Français)" multiline value={q.fr} onChangeText={(v) => set({ fr: v })} placeholder="Quelle est la capitale d'Haïti ?" />

      <View style={[raised(), { padding: 12, gap: 10 }]}>
        <T v="label" color={colors.muted}>Opsyon · peze sèk la pou bon repons lan</T>
        {q.opts.map((o, i) => (
          <View key={i} style={{ gap: 6, paddingBottom: 6, borderBottomWidth: i < q.opts.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
            <Row gap={8}>
              <Press label={`Bon repons ${L[i]}`} scaleTo={0.85} onPress={() => set({ a: i })} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: q.a === i ? colors.green : colors.line, backgroundColor: q.a === i ? colors.green : colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                <T v="bold" color={q.a === i ? '#FFFFFF' : colors.muted}>{q.a === i ? '✓' : L[i]}</T>
              </Press>
              <View style={{ flex: 1 }}><Field label={`Kreyòl ${L[i]}`} value={o} onChangeText={(v) => setOpt(i, v)} /></View>
              {q.opts.length > 3 ? (
                <Press label={`Retire ${L[i]}`} onPress={() => delOpt(i)} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
                  <T v="h2" color={colors.muted}>×</T>
                </Press>
              ) : null}
            </Row>
            <View style={{ marginLeft: 42, marginRight: q.opts.length > 3 ? 42 : 0 }}>
              <Field label={`Français ${L[i]}`} value={q.optsFr[i] ?? ''} onChangeText={(v) => setOpt(i, undefined, v)} />
            </View>
          </View>
        ))}
        {q.opts.length < 4 ? <Button title="+ Ajoute yon opsyon" kind="ghost" onPress={addOpt} style={{ alignSelf: 'flex-start' }} /> : null}
      </View>

      <Field label="Esplikasyon (Kreyòl)" multiline value={q.ex} onChangeText={(v) => set({ ex: v })} />
      <Field label="Explication (Français)" multiline value={q.exFr} onChangeText={(v) => set({ exFr: v })} />

      <View style={{ gap: 6 }}>
        <T v="label" color={colors.muted}>Laj</T>
        <Row gap={6} wrap>{AGES.map((a) => <Toggle key={a} text={`${a} an`} on={q.ages.includes(a)} onPress={() => toggleAge(a)} color={colors.blue} />)}</Row>
      </View>
      <View style={{ gap: 6 }}>
        <T v="label" color={colors.muted}>Nivo difikilte</T>
        <Row gap={6} wrap>
          {([1, 2, 3] as const).map((d) => <Toggle key={d} text={`${d} · ${['Fasil', 'Mwayen', 'Difisil'][d - 1]}`} on={q.d === d} onPress={() => set({ d })} />)}
        </Row>
      </View>
      <Field label="Sijè (tag)" value={q.topic ?? ''} onChangeText={(v) => set({ topic: v })} autoCapitalize="none" placeholder="revolisyon" />
      <Field label="Nòt pou korektè a" multiline value={q.note ?? ''} onChangeText={(v) => set({ note: v })} placeholder="Egz. « verifye dat la »" />
      <Warn items={problems} />

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Efase kesyon sa a?">
        <T center color={colors.muted}>Li p ap parèt ankò nan app la apre pwochen piblikasyon an. Ou pa ka defèt sa.</T>
        <Button title="Wi, efase l" kind="danger" busy={busy === 'delete'} onPress={del} />
        <Button title="Anile" kind="ghost" onPress={() => setConfirmDelete(false)} />
      </Sheet>
      <Sheet open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Ou pa sove chanjman yo">
        <Button title="Sove epi soti" onPress={() => { setConfirmLeave(false); save(); }} />
        <Button title="Soti san sove" kind="bad" onPress={() => { setConfirmLeave(false); leave(); }} />
        <Button title="Rete" kind="ghost" onPress={() => setConfirmLeave(false)} />
      </Sheet>
    </Screen>
  );
}

function Bar({ title, sub, onBack, right }: { title: string; sub?: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.card, borderBottomWidth: 2, borderBottomColor: colors.line, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Press label="Retounen" onPress={onBack} style={{ width: 42, height: 42, borderRadius: 14, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="retounen" size={24} />
      </Press>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="h1" numberOfLines={1}>{title}</T>
        {sub ? <T v="mono" color={colors.muted} numberOfLines={1}>{sub}</T> : null}
      </View>
      {right}
    </View>
  );
}
