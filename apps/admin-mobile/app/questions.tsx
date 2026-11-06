import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, ScrollView, Animated, PanResponder, Platform, RefreshControl, TextInput, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, errText, type AdminQuestion, type QStatus } from '@/api';
import { useLoad, DEFAULT_CATS, blocking, blankQuestion } from '@/lib';
import { useCache } from '@/cache';
import { useSession } from '@/session';
import { Screen, Header, T, Row, Chip, StatusChip, Segmented, Toggle, Fab, Loading, ErrorBox, Empty, Icon, haptic } from '@/ui';
import { colors, fonts, raised, STATUS } from '@/theme';

type Filter = 'all' | QStatus;
const NATIVE = Platform.OS !== 'web';
const THRESHOLD = 96;

function SwipeCard({ q, onOpen, onSwipe }: { q: AdminQuestion; onOpen: () => void; onSwipe: (dir: 'approve' | 'flag') => void }) {
  const x = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const moved = useRef(false);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => { moved.current = true; },
    onPanResponderMove: (_, g) => x.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      const dir = g.dx > THRESHOLD ? 'approve' : g.dx < -THRESHOLD ? 'flag' : null;
      if (dir) {
        haptic(dir === 'approve' ? 'ok' : 'warn');
        Animated.timing(x, { toValue: g.dx > 0 ? 500 : -500, duration: 160, useNativeDriver: NATIVE }).start(() => { onSwipe(dir); x.setValue(0); });
      } else {
        Animated.spring(x, { toValue: 0, useNativeDriver: NATIVE, bounciness: 10 }).start();
      }
      setTimeout(() => { moved.current = false; }, 50);
    },
    onPanResponderTerminate: () => { Animated.spring(x, { toValue: 0, useNativeDriver: NATIVE }).start(); moved.current = false; },
  }), [x, onSwipe]);

  const s = STATUS[q.status] ?? STATUS.review;
  const leftOpacity = x.interpolate({ inputRange: [0, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const rightOpacity = x.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  return (
    <View style={{ marginBottom: 10 }}>
      {/* revealed actions */}
      <Animated.View style={{ position: 'absolute', inset: 0, borderRadius: 18, backgroundColor: colors.green, justifyContent: 'center', paddingLeft: 18, opacity: leftOpacity }}>
        <T v="h3" color="#FFFFFF">✓ Apwouve</T>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', inset: 0, borderRadius: 18, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 18, opacity: rightOpacity }}>
        <T v="h3" color="#FFFFFF">⚑ Pwoblèm</T>
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={{ transform: [{ translateX: x }, { scale: press }] }}
      >
       <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Louvri ${q.id}`}
        style={[raised(s.edge), { padding: 14, gap: 8 }]}
        onPressIn={() => Animated.spring(press, { toValue: 0.985, useNativeDriver: NATIVE, speed: 40, bounciness: 0 }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: NATIVE, speed: 40 }).start()}
        onPress={() => { if (!moved.current) { haptic(); onOpen(); } }}
       >
        <Row gap={6} wrap>
          <T v="mono" color={colors.muted}>{q.id}</T>
          <StatusChip status={q.status} />
          <Chip text={`Nivo ${q.d}`} fg={colors.muted} bg={colors.bg} />
          {q.note ? <Chip text="📝 nòt" fg={colors.redInk} bg={colors.redSoft} /> : null}
        </Row>
        <T v="h2" numberOfLines={3}>{q.ht || '(kesyon vid)'}</T>
        <Row gap={6}>
          <View style={{ backgroundColor: colors.greenSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 1 }}>
            <T v="bold" color={colors.greenInk} numberOfLines={1}>✓ {q.opts[q.a] ?? '—'}</T>
          </View>
          {q.topic ? <T v="small" color={colors.muted}>#{q.topic}</T> : null}
        </Row>
       </Pressable>
      </Animated.View>
    </View>
  );
}

export default function Questions() {
  const params = useLocalSearchParams<{ category?: string; status?: string }>();
  const cats = useCache((s) => s.categories);
  const put = useCache((s) => s.put);
  const upsert = useCache((s) => s.upsert);
  const cached = useCache((s) => s.byCat);
  const toast = useSession((s) => s.showToast);
  const [category, setCategory] = useState<string>(params.category ?? 'istwa');
  const [filter, setFilter] = useState<Filter>((params.status as Filter) ?? 'all');
  const [query, setQuery] = useState('');
  const [age, setAge] = useState<'' | '6-8' | '9-11' | '12-14'>('');

  useEffect(() => { if (params.category) setCategory(params.category); }, [params.category]);
  useEffect(() => { if (params.status) setFilter(params.status as Filter); }, [params.status]);

  const load = useLoad(async () => { const r = await api.questions(category); put(category, r.questions); return r.questions; }, [category]);
  const list = cached[category] ?? load.data ?? [];

  const catList = (cats?.length ? [...cats].sort((a, b) => a.order - b.order) : DEFAULT_CATS).map((c) => ({ id: c.id, name: c.name.ht, icon: c.icon }));
  const counts = useMemo(() => {
    const inAge = list.filter((q) => !age || q.ages.includes(age));
    const c = { all: inAge.length, review: 0, approved: 0, draft: 0 };
    for (const q of inAge) c[q.status] += 1;
    return c;
  }, [list, age]);
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return list.filter((q) => (filter === 'all' || q.status === filter) && (!age || q.ages.includes(age)) && (!term || [q.id, q.ht, q.fr, q.ex, q.topic, ...q.opts].join(' ').toLowerCase().includes(term)));
  }, [list, filter, query, age]);

  const setStatus = async (q: AdminQuestion, status: QStatus) => {
    if (status === 'approved' && blocking(q).length) { toast('Korije pwoblèm yo anvan ou apwouve', 'err'); router.push(`/question/${q.id}` as never); return; }
    const prev = q.status;
    upsert({ ...q, status });
    try {
      const r = await api.setStatus([q.id], status);
      if (r.refused?.includes(q.id)) {
        upsert({ ...q, status: prev });
        toast('Sèvè a refize: kesyon an pa konplè. Korije l anvan.', 'err');
        router.push(`/question/${q.id}` as never);
        return;
      }
      toast(status === 'approved' ? 'Apwouve' : 'Make kòm pwoblèm', 'info', {
        label: 'Anile',
        run: async () => { upsert({ ...q, status: prev }); try { await api.setStatus([q.id], prev); } catch (e) { toast(errText(e), 'err'); } },
      });
    } catch (e) {
      upsert({ ...q, status: prev });
      toast(errText(e), 'err');
    }
  };

  const create = async () => {
    try {
      const { id } = await api.nextId(category);
      upsert(blankQuestion(id, category));
      router.push(`/question/${id}?isNew=1` as never);
    } catch (e) { toast(errText(e), 'err'); }
  };

  return (
    <Screen tabs scroll={false} header={<Header title="Kesyon" sub={`${catList.find((c) => c.id === category)?.name ?? category} · ${list.length} kesyon · glise adwat pou apwouve, agoch pou make pwoblèm`} />}>
      <View style={{ paddingTop: 10, gap: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
          {catList.map((c) => <Toggle key={c.id} text={c.name} on={c.id === category} onPress={() => { setCategory(c.id); setQuery(''); }} />)}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          <Segmented<Filter> value={filter} onChange={setFilter} options={[
            { key: 'all', label: 'Tout', count: counts.all },
            { key: 'review', label: 'Pou relekti', count: counts.review },
            { key: 'approved', label: 'Apwouve', count: counts.approved },
            { key: 'draft', label: 'Pwoblèm', count: counts.draft },
          ]} />
          <Row gap={6} wrap>
            {(['', '6-8', '9-11', '12-14'] as const).map((a) => <Toggle key={a || 'all'} text={a ? `${a} an` : 'Tout laj'} on={age === a} onPress={() => setAge(a)} />)}
          </Row>
          <Row gap={8} style={{ borderWidth: 2, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 12 }}>
            <Icon name="chache" size={20} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Chèche yon mo, yon id, yon sijè…" placeholderTextColor={colors.muted} style={{ flex: 1, minHeight: 42, fontFamily: fonts.bodyRegular, fontSize: 15, color: colors.ink }} autoCorrect={false} />
          </Row>
        </View>
      </View>
      {load.error && !list.length ? <View style={{ padding: 16 }}><ErrorBox text={load.error} onRetry={load.reload} /></View> : null}
      <View style={{ flex: 1 }}>
      {load.loading && !list.length ? <Loading /> : (
        <FlatList
          data={shown}
          keyExtractor={(q) => q.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          renderItem={({ item }) => (
            <SwipeCard q={item} onOpen={() => router.push(`/question/${item.id}` as never)} onSwipe={(d) => setStatus(item, d === 'approve' ? 'approved' : 'draft')} />
          )}
          refreshControl={<RefreshControl refreshing={load.refreshing} onRefresh={load.refresh} colors={[colors.blue]} tintColor={colors.blue} />}
          ListEmptyComponent={<Empty title={query ? 'Anyen pa koresponn' : 'Pa gen kesyon isit la'} text={query ? 'Eseye yon lòt mo.' : 'Chanje filtè a oswa ajoute yon kesyon ak bouton +.'} />}
          initialNumToRender={12}
          windowSize={9}
        />
      )}
      <Fab label="Ajoute yon kesyon" onPress={create} />
      </View>
    </Screen>
  );
}
