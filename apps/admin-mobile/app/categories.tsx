import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Switch } from 'react-native';
import { api, errText, type Category, type Age } from '@/api';
import { useLoad } from '@/lib';
import { useCache } from '@/cache';
import { useSession } from '@/session';
import { Screen, Header, T, Row, Field, Button, Toggle, Loading, ErrorBox, Sheet, Press, Icon, ICON_NAMES, Chip, haptic } from '@/ui';
import { colors, raised, SWATCHES } from '@/theme';

const AGES: Age[] = ['6-8', '9-11', '12-14'];
const sortCats = (c: Category[]) => [...c].sort((a, b) => a.order - b.order).map((x, i) => ({ ...x, order: i }));

export default function Categories() {
  const setCategories = useCache((s) => s.setCategories);
  const toast = useSession((s) => s.showToast);
  const bump = useSession((s) => s.bump);
  const load = useLoad(async () => { const r = await api.categories(); setCategories(r.categories); return sortCats(r.categories); });
  const [list, setList] = useState<Category[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [iconFor, setIconFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newId, setNewId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (load.data) setList(load.data); }, [load.data]);
  const dirty = useMemo(() => JSON.stringify(list) !== JSON.stringify(load.data ?? []), [list, load.data]);

  const patch = (id: string, p: Partial<Category>) => setList((l) => l.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const move = (i: number, d: -1 | 1) => setList((l) => {
    const j = i + d; if (j < 0 || j >= l.length) return l;
    const n = l.slice(); [n[i], n[j]] = [n[j], n[i]];
    haptic();
    return n.map((c, k) => ({ ...c, order: k }));
  });
  const save = async () => {
    for (const c of list) if (!c.name.ht.trim()) { toast(`Kategori "${c.id}" bezwen yon non Kreyòl`, 'err'); setOpen(c.id); return; }
    setSaving(true);
    try {
      const r = await api.saveCategories(list.map((c, i) => ({ ...c, order: i })));
      const sorted = sortCats(r.categories);
      load.setData(sorted); setList(sorted); setCategories(r.categories); bump();
      haptic('ok'); toast('Kategori yo sove');
    } catch (e) { toast(errText(e), 'err'); } finally { setSaving(false); }
  };
  const add = () => {
    const id = newId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!id) { toast('Mete yon id (lèt piti, san espas)', 'err'); return; }
    if (list.some((c) => c.id === id)) { toast('Id sa a egziste deja', 'err'); return; }
    setList((l) => [...l, { id, name: { ht: '', fr: '' }, icon: 'kesyon', color: SWATCHES[l.length % SWATCHES.length], order: l.length, enabled: false, isNew: true, ages: [...AGES] }]);
    setAdding(false); setNewId(''); setOpen(id);
  };

  return (
    <Screen
      tabs
      onRefresh={load.refresh}
      refreshing={load.refreshing}
      header={<Header title="Kategori" sub="Lòd, non, koulè, ikòn ak laj" right={<Button title="+ Nouvo" kind="plain" onPress={() => setAdding(true)} />} />}
      bottom={dirty ? (
        <Row gap={8} style={{ padding: 12, borderTopWidth: 2, borderTopColor: colors.line }}>
          <Button title="Anile chanjman yo" kind="ghost" onPress={() => setList(load.data ?? [])} />
          <Button title="Sove" busy={saving} onPress={save} style={{ flex: 1 }} />
        </Row>
      ) : undefined}
    >
      {load.loading && !list.length ? <Loading /> : null}
      {load.error ? <ErrorBox text={load.error} onRetry={load.reload} /> : null}
      {list.map((c, i) => {
        const expanded = open === c.id;
        return (
          <View key={c.id} style={[raised(expanded ? colors.blue : colors.line), { padding: 12, gap: 10, opacity: c.enabled ? 1 : 0.8 }]}>
            <Row gap={8}>
              <Press label={`Chanje ikòn ${c.name.ht}`} onPress={() => setIconFor(c.id)} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.color + '33', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon} size={34} />
              </Press>
              <Press scaleTo={0.98} onPress={() => setOpen(expanded ? null : c.id)} style={{ flex: 1, minWidth: 0 }}>
                <Row gap={6}>
                  <T v="h2" numberOfLines={1} style={{ flexShrink: 1 }}>{c.name.ht || '(san non)'}</T>
                  {c.isNew ? <Chip text="Nouvo" fg="#FFFFFF" bg={colors.red} /> : null}
                </Row>
                <T v="small" color={colors.muted} numberOfLines={1}>{c.id} · {c.enabled ? 'Vizib' : 'Kache'} · {c.ages.join(', ')}</T>
              </Press>
              <View style={{ gap: 4 }}>
                <Press label="Monte" onPress={() => move(i, -1)} disabled={i === 0} style={arrow}><T v="bold" color={colors.muted}>▲</T></Press>
                <Press label="Desann" onPress={() => move(i, 1)} disabled={i === list.length - 1} style={arrow}><T v="bold" color={colors.muted}>▼</T></Press>
              </View>
            </Row>
            <Row gap={16}>
              <Row gap={6}><Switch value={c.enabled} onValueChange={(v) => { haptic(); patch(c.id, { enabled: v }); }} trackColor={{ true: colors.green, false: colors.lineStrong }} thumbColor="#FFFFFF" /><T v="small">Vizib</T></Row>
              <Row gap={6}><Switch value={c.isNew} onValueChange={(v) => { haptic(); patch(c.id, { isNew: v }); }} trackColor={{ true: colors.red, false: colors.lineStrong }} thumbColor="#FFFFFF" /><T v="small">Nouvo</T></Row>
              <View style={{ flex: 1 }} />
              <Press onPress={() => setOpen(expanded ? null : c.id)}><T v="bold" color={colors.blue}>{expanded ? 'Fèmen' : 'Modifye'}</T></Press>
            </Row>
            {expanded ? (
              <View style={{ gap: 10, borderTopWidth: 2, borderTopColor: colors.line, borderStyle: 'dashed', paddingTop: 10 }}>
                <Field label="Non (Kreyòl)" value={c.name.ht} onChangeText={(v) => patch(c.id, { name: { ...c.name, ht: v } })} />
                <Field label="Nom (Français)" value={c.name.fr} onChangeText={(v) => patch(c.id, { name: { ...c.name, fr: v } })} />
                <T v="label" color={colors.muted}>Koulè</T>
                <Row gap={8} wrap>
                  {SWATCHES.map((s) => (
                    <Press key={s} label={`Koulè ${s}`} scaleTo={0.85} onPress={() => patch(c.id, { color: s })} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: s, borderWidth: 3, borderColor: c.color === s ? colors.ink : '#FFFFFF' }}><View /></Press>
                  ))}
                </Row>
                <T v="label" color={colors.muted}>Laj</T>
                <Row gap={6} wrap>{AGES.map((a) => <Toggle key={a} text={`${a} an`} on={c.ages.includes(a)} onPress={() => patch(c.id, { ages: c.ages.includes(a) ? c.ages.filter((x) => x !== a) : AGES.filter((x) => x === a || c.ages.includes(x)) })} />)}</Row>
              </View>
            ) : null}
          </View>
        );
      })}

      <Sheet open={!!iconFor} onClose={() => setIconFor(null)} title="Chwazi yon ikòn">
        <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {ICON_NAMES.map((n) => {
            const on = list.find((c) => c.id === iconFor)?.icon === n;
            return (
              <Press key={n} label={n} scaleTo={0.85} onPress={() => { if (iconFor) patch(iconFor, { icon: n }); setIconFor(null); }} style={{ width: 58, height: 58, borderRadius: 14, borderWidth: 2, borderColor: on ? colors.blue : colors.line, backgroundColor: on ? colors.blueSoft : colors.card, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={n} size={36} />
              </Press>
            );
          })}
        </ScrollView>
      </Sheet>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Nouvo kategori">
        <Field label="Id (lèt piti, san espas)" value={newId} onChangeText={setNewId} autoCapitalize="none" autoCorrect={false} placeholder="mizik" />
        <T v="small" color={colors.muted}>Li ap kache nan app la jiskaske ou mete l vizib epi pibliye.</T>
        <Button title="Kreye" onPress={add} />
        <Button title="Anile" kind="ghost" onPress={() => setAdding(false)} />
      </Sheet>
    </Screen>
  );
}

const arrow = { width: 34, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.line, alignItems: 'center' as const, justifyContent: 'center' as const };
