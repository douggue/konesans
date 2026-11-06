import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { levelById, run, scoreRun, countBlocks, validateProgram, isWall, type Block, type Robot, type RunResult, type Level } from '@konesans/core';
import { Screen, T, Button, Card, Row, TopBar, Icon, Stars, Pill, Mascot, PressScale } from '@/ui';
import { colors, radius } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT, type StrKey } from '@/lib/i18n';
import { tap } from '@/lib/audio';

type Kind = Block['type'];
const PALETTE: { type: Kind; icon: 'avanse' | 'vire_goch' | 'vire_dwat' | 'repete' | 'simi' | 'zetwal_gri'; color: string }[] = [
  { type: 'avanse', icon: 'avanse', color: colors.blueLight }, { type: 'vire_goch', icon: 'vire_goch', color: colors.orange }, { type: 'vire_dwat', icon: 'vire_dwat', color: colors.orange },
  { type: 'repete', icon: 'repete', color: colors.purple }, { type: 'si_mi', icon: 'simi', color: colors.redLight }, { type: 'jiska_zetwal', icon: 'zetwal_gri', color: colors.green },
];
const ARROW: Record<Robot['dir'], string> = { N: '▲', E: '▶', S: '▼', W: '◀' };

function makeBlock(type: Kind): Block {
  switch (type) {
    case 'repete': return { type, times: 3, body: [] };
    case 'si_mi': return { type, then: [], else: [] };
    case 'jiska_zetwal': return { type, body: [] };
    default: return { type } as Block;
  }
}

export default function CodingLevel() {
  const { level } = useLocalSearchParams<{ level: string }>();
  const lv = useMemo(() => levelById(Number(level)), [level]) as Level;
  const t = useT();
  const fr = useStore((s) => s.profile.lang) === 'fr';
  const recordCoding = useStore((s) => s.recordCoding);
  const [program, setProgram] = useState<Block[]>([]);
  /** path into the block tree where new blocks go: [] = top level, [i] = inside container i, [i,'else'] = else-branch */
  const [cursor, setCursor] = useState<(number | 'else')[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [robot, setRobot] = useState<Robot>({ ...lv.maze.start, dir: lv.maze.startDir });
  const [gems, setGems] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const anim = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = () => { if (anim.current) clearInterval(anim.current); setRobot({ ...lv.maze.start, dir: lv.maze.startDir }); setGems(new Set()); setResult(null); };
  useEffect(() => () => { if (anim.current) clearInterval(anim.current); }, []);

  function add(type: Kind) {
    reset();
    setProgram((p) => insertAt(p, cursor, makeBlock(type)));
  }
  function removeLast() { reset(); setProgram((p) => removeLastAt(p, cursor)); }
  function play() {
    reset();
    const r = run(lv.maze, program, { stopOnBump: lv.stopOnBump });
    let k = 0; const got = new Set<string>();
    anim.current = setInterval(() => {
      const step = r.steps[k++];
      if (!step) { if (anim.current) clearInterval(anim.current); setResult(r); if (r.ok) { const stars = r.blocksUsed <= lv.par ? 3 : r.blocksUsed <= lv.par + 2 ? 2 : 1; recordCoding(lv.id, stars, scoreRun(r, lv)); tap('success'); } else tap('error'); return; }
      if (step.kind === 'move' || step.kind === 'turn') setRobot(step.to);
      if (step.kind === 'gem') { got.add(`${step.at.r},${step.at.c}`); setGems(new Set(got)); }
    }, 320);
  }
  const problems = validateProgram(lv, program);
  const cell = Math.min(52, Math.floor(300 / Math.max(lv.maze.rows, lv.maze.cols)));
  const msg = result ? ({ star: 'r_star', bumped: 'r_bumped', no_star: 'r_no_star', too_many_steps: 'r_too_many', out_of_bounds: 'r_out' } as const)[result.reason] : null;
  const stars = result?.ok ? (result.blocksUsed <= lv.par ? 3 : result.blocksUsed <= lv.par + 2 ? 2 : 1) : 0;

  return (
    <Screen>
      <TopBar title={`${lv.id}. ${fr ? lv.titleFr : lv.title}`} sub={`${countBlocks(program)} ${t('blocks')} · ${t('par', { n: lv.par })}`} onBack={() => router.back()}
        right={<PressScale debounceMs={0} role="button" onPress={() => { tap(); setShowHint(!showHint); }} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="endis" size={26} /></PressScale>} />
      {showHint && <Card soft={colors.yellowSoft} edge={colors.yellowDark}><T v="body">{fr ? lv.hintFr : lv.hint}</T></Card>}

      {/* Maze */}
      <View style={{ alignSelf: 'center', borderWidth: 3, borderColor: colors.ink, borderRadius: 12, overflow: 'hidden', backgroundColor: '#DCEBFF' }}>
        {Array.from({ length: lv.maze.rows }).map((_, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {Array.from({ length: lv.maze.cols }).map((_, c) => {
              const wall = isWall(lv.maze, r, c);
              const star = lv.maze.star.r === r && lv.maze.star.c === c;
              const gem = lv.maze.gems?.some((g) => g.r === r && g.c === c) && !gems.has(`${r},${c}`);
              const here = robot.r === r && robot.c === c;
              return (
                <View key={c} style={{ width: cell, height: cell, backgroundColor: wall ? colors.ink : (r + c) % 2 ? '#E8F0FF' : '#F6F9FF', alignItems: 'center', justifyContent: 'center' }}>
                  {star && !here && <T style={{ fontSize: cell * 0.6, lineHeight: cell * 0.7 }} color={colors.yellowDark}>★</T>}
                  {gem && <T style={{ fontSize: cell * 0.45, lineHeight: cell * 0.6 }}>💎</T>}
                  {here && <View style={{ width: cell * 0.78, height: cell * 0.78, borderRadius: cell * 0.25, backgroundColor: result?.ok ? colors.green : colors.blueLight, borderWidth: 2.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><T color="#fff" style={{ fontSize: cell * 0.4, lineHeight: cell * 0.5 }}>{ARROW[robot.dir]}</T></View>}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Program */}
      <Card style={{ minHeight: 90, gap: 6 }} edge={colors.lineStrong}>
        <Row><T v="small" color={colors.muted} style={{ flex: 1 }}>{t('your_program')}</T>
          {program.length > 0 && <PressScale debounceMs={0} role="button" onPress={() => { tap(); removeLast(); }} style={{ minHeight: 36, paddingHorizontal: 10, justifyContent: 'center' }}><T v="small" color={colors.red}>⌫ {t('clear')}</T></PressScale>}
        </Row>
        {program.length === 0 ? <T v="body" color={colors.muted}>{t('tap_blocks')}</T> : <ProgramList blocks={program} path={[]} cursor={cursor} setCursor={(c) => { tap(); setCursor(c); }} onTimes={(path, d) => { reset(); setProgram((p) => bumpTimes(p, path, d)); }} t={t} />}
      </Card>

      {/* Palette */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PALETTE.filter((b) => lv.allowed.includes(b.type)).map((b) => (
          <PressScale debounceMs={0} role="button" key={b.type} onPress={() => { tap(); add(b.type); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: b.color, borderRadius: radius.sm, paddingHorizontal: 12, minHeight: 48, borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.25)' }, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}>
            <Icon name={b.icon} size={24} />
            <T v="h3" color="#fff">{t(`b_${b.type}` as StrKey)}</T>
          </PressScale>
        ))}
      </View>

      {problems.length > 0 && program.length > 0 && <T v="small" color={colors.red}>{t(problems[0].includes('twò long') ? 'prog_too_long' : 'prog_invalid')}</T>}
      {result && msg && (
        <Card edge={result.ok ? colors.green : colors.red} soft={result.ok ? colors.greenSoft : colors.redSoft} style={{ gap: 6 }}>
          <Row><Mascot size={56} mood={result.ok ? 'cheer' : 'sad'} /><View style={{ flex: 1 }}><T v="h3" color={result.ok ? '#12632F' : '#8F0A22'}>{t(msg)}</T>{result.ok && <Row><Stars n={stars} /><Pill text={`+${scoreRun(result, lv)} XP`} color="#5C4600" bg={colors.yellowSoft} /></Row>}</View></Row>
          {result.ok && <Button small title={t('continue')} color={colors.green} onPress={() => router.back()} />}
        </Card>
      )}
      <Button title={t('run')} color={colors.green} icon="jwe" disabled={program.length === 0 || problems.length > 0} onPress={play} />
    </Screen>
  );
}

// ─── block tree helpers ──────────────────────────────────────────────────────
type Path = (number | 'else')[];
function childList(b: Block, branch?: 'else'): Block[] | null {
  if (b.type === 'repete' || b.type === 'jiska_zetwal') return b.body;
  if (b.type === 'si_mi') return branch === 'else' ? (b.else ?? []) : b.then;
  return null;
}
function mapAt(list: Block[], path: Path, f: (l: Block[]) => Block[]): Block[] {
  if (path.length === 0) return f(list);
  const [i, maybeElse, ...rest] = path;
  const branch = maybeElse === 'else' ? 'else' : undefined;
  const remaining = branch ? rest : [maybeElse, ...rest].filter((x) => x !== undefined) as Path;
  return list.map((b, k) => {
    if (k !== i) return b;
    const kids = childList(b, branch); if (!kids) return b;
    const nk = mapAt(kids, remaining, f);
    if (b.type === 'si_mi') return branch ? { ...b, else: nk } : { ...b, then: nk };
    return { ...b, body: nk } as Block;
  });
}
const insertAt = (p: Block[], path: Path, b: Block) => mapAt(p, path, (l) => [...l, b]);
const removeLastAt = (p: Block[], path: Path) => mapAt(p, path, (l) => l.slice(0, -1));
const bumpTimes = (p: Block[], path: Path, d: number) => mapAt(p, path.slice(0, -1), (l) => l.map((b, k) => (k === path[path.length - 1] && b.type === 'repete' ? { ...b, times: Math.max(1, Math.min(9, b.times + d)) } : b)));

const ICON: Record<Kind, 'avanse' | 'vire_goch' | 'vire_dwat' | 'repete' | 'simi' | 'zetwal_gri'> = { avanse: 'avanse', vire_goch: 'vire_goch', vire_dwat: 'vire_dwat', repete: 'repete', si_mi: 'simi', jiska_zetwal: 'zetwal_gri' };

function ProgramList({ blocks, path, cursor, setCursor, onTimes, t }: { blocks: Block[]; path: Path; cursor: Path; setCursor: (p: Path) => void; onTimes: (p: Path, d: number) => void; t: (k: StrKey) => string }) {
  const same = (a: Path, b: Path) => a.length === b.length && a.every((x, i) => x === b[i]);
  const color: Record<string, string> = { avanse: colors.blueLight, vire_goch: colors.orange, vire_dwat: colors.orange, repete: colors.purple, si_mi: colors.redLight, jiska_zetwal: colors.green };
  return (
    <View style={{ gap: 6 }}>
      {blocks.map((b, i) => {
        const here: Path = [...path, i];
        const container = b.type === 'repete' || b.type === 'si_mi' || b.type === 'jiska_zetwal';
        return (
          <View key={i} style={{ gap: 6 }}>
            <PressScale debounceMs={0} role="button" onPress={() => container && setCursor(here)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color[b.type], borderRadius: 10, paddingHorizontal: 10, minHeight: 40, borderWidth: 2, borderColor: container && same(cursor, here) ? colors.ink : 'transparent' }}>
              <Icon name={ICON[b.type]} size={22} />
              <T v="bold" color="#fff">{t(`b_${b.type}` as StrKey)}</T>
              {b.type === 'repete' && (
                <Row gap={4} style={{ marginLeft: 'auto' }}>
                  <PressScale debounceMs={0} role="button" onPress={() => onTimes(here, -1)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}><T v="h3" color="#fff">−</T></PressScale>
                  <T v="h3" color="#fff">{b.times}×</T>
                  <PressScale debounceMs={0} role="button" onPress={() => onTimes(here, 1)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}><T v="h3" color="#fff">+</T></PressScale>
                </Row>
              )}
              {container && <T v="small" color="#fff" style={{ marginLeft: b.type === 'repete' ? 6 : 'auto' }}>{same(cursor, here) ? t('here') : '▸'}</T>}
            </PressScale>
            {container && (
              <View style={{ marginLeft: 16, borderLeftWidth: 3, borderLeftColor: color[b.type], paddingLeft: 8, gap: 6 }}>
                <ProgramList blocks={childList(b)!} path={here} cursor={cursor} setCursor={setCursor} onTimes={onTimes} t={t} />
                {b.type === 'si_mi' && (
                  <>
                    <PressScale debounceMs={0} role="button" onPress={() => setCursor([...here, 'else'])} style={{ minHeight: 32, justifyContent: 'center' }}><T v="small" color={colors.muted}>{t('else_')} {same(cursor, [...here, 'else']) ? t('here') : '▸'}</T></PressScale>
                    <ProgramList blocks={b.else ?? []} path={[...here, 'else']} cursor={cursor} setCursor={setCursor} onTimes={onTimes} t={t} />
                  </>
                )}
                {same(cursor, here) && childList(b)!.length === 0 && <T v="small" color={colors.muted}>…</T>}
              </View>
            )}
          </View>
        );
      })}
      {path.length === 0 && cursor.length > 0 && <PressScale debounceMs={0} role="button" onPress={() => setCursor([])} style={{ minHeight: 32, justifyContent: 'center' }}><T v="small" color={colors.blue}>{t('back_to_program')}</T></PressScale>}
    </View>
  );
}
