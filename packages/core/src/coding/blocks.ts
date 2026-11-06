/**
 * Enfòmatik — block coding. A program is a tree of blocks; the interpreter moves
 * a robot on a grid maze. Everything is pure and deterministic so the app can
 * animate step by step and the server can verify a solution.
 *
 * Blocks (Kreyòl labels used in the UI):
 *   avanse            move forward one cell
 *   vire_goch / dwat  turn left / right
 *   repete N { … }    loop
 *   si_mi { … } sinon { … }   if wall ahead … else …
 *   jiska_zetwal { … }        repeat until the star is reached (level 8+)
 */
export type Dir = 'N' | 'E' | 'S' | 'W';
export type Block =
  | { type: 'avanse' }
  | { type: 'vire_goch' }
  | { type: 'vire_dwat' }
  | { type: 'repete'; times: number; body: Block[] }
  | { type: 'si_mi'; then: Block[]; else?: Block[] }
  | { type: 'jiska_zetwal'; body: Block[] };

export interface Cell { r: number; c: number }
export interface Maze {
  rows: number; cols: number;
  walls: string[];           // "r,c" cells that are walls
  start: Cell; startDir: Dir;
  star: Cell;
  gems?: Cell[];             // optional collectibles (bonus)
}

export interface Robot { r: number; c: number; dir: Dir }
export type Step =
  | { kind: 'move'; from: Robot; to: Robot }
  | { kind: 'turn'; from: Robot; to: Robot }
  | { kind: 'bump'; at: Robot }          // tried to walk into a wall
  | { kind: 'gem'; at: Cell }
  | { kind: 'star' };

export interface RunResult {
  ok: boolean;                 // reached the star
  reason: 'star' | 'bumped' | 'no_star' | 'too_many_steps' | 'out_of_bounds';
  steps: Step[];
  robot: Robot;
  gems: number;
  blocksUsed: number;
}

const DIRS: Dir[] = ['N', 'E', 'S', 'W'];
const DELTA: Record<Dir, [number, number]> = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
export const turn = (d: Dir, right: boolean): Dir => DIRS[(DIRS.indexOf(d) + (right ? 1 : 3)) % 4];
const key = (c: Cell) => `${c.r},${c.c}`;

export function isWall(m: Maze, r: number, c: number): boolean {
  return r < 0 || c < 0 || r >= m.rows || c >= m.cols || m.walls.includes(`${r},${c}`);
}

/** Count blocks in a program (for "solve it in ≤ N blocks" stars). */
export function countBlocks(p: Block[]): number {
  return p.reduce((n, b) => n + 1 + ('body' in b ? countBlocks(b.body) : 0) + ('then' in b ? countBlocks(b.then) + countBlocks(b.else ?? []) : 0), 0);
}

export const MAX_STEPS = 200;

/** Run a program on a maze. Stops at the star, at a wall bump (level setting), or after MAX_STEPS. */
export function run(maze: Maze, program: Block[], opts: { stopOnBump?: boolean } = {}): RunResult {
  const steps: Step[] = [];
  let robot: Robot = { r: maze.start.r, c: maze.start.c, dir: maze.startDir };
  const gems = new Set((maze.gems ?? []).map(key));
  let gemsGot = 0;
  let done: RunResult['reason'] | null = null;

  const atStar = () => robot.r === maze.star.r && robot.c === maze.star.c;

  function exec(blocks: Block[]) {
    for (const b of blocks) {
      if (done) return;
      if (steps.length >= MAX_STEPS) { done = 'too_many_steps'; return; }
      switch (b.type) {
        case 'avanse': {
          const [dr, dc] = DELTA[robot.dir];
          const nr = robot.r + dr, nc = robot.c + dc;
          if (isWall(maze, nr, nc)) {
            steps.push({ kind: 'bump', at: robot });
            if (opts.stopOnBump) done = 'bumped';
          } else {
            const to = { ...robot, r: nr, c: nc };
            steps.push({ kind: 'move', from: robot, to });
            robot = to;
            if (gems.delete(key(robot))) { gemsGot++; steps.push({ kind: 'gem', at: { r: robot.r, c: robot.c } }); }
            if (atStar()) { steps.push({ kind: 'star' }); done = 'star'; }
          }
          break;
        }
        case 'vire_goch': case 'vire_dwat': {
          const to = { ...robot, dir: turn(robot.dir, b.type === 'vire_dwat') };
          steps.push({ kind: 'turn', from: robot, to }); robot = to; break;
        }
        case 'repete':
          for (let i = 0; i < Math.min(b.times, 50) && !done; i++) exec(b.body);
          break;
        case 'si_mi': {
          const [dr, dc] = DELTA[robot.dir];
          exec(isWall(maze, robot.r + dr, robot.c + dc) ? b.then : (b.else ?? []));
          break;
        }
        case 'jiska_zetwal':
          for (let i = 0; i < 60 && !done && !atStar(); i++) exec(b.body);
          break;
      }
    }
  }
  exec(program);
  const reason = done ?? (atStar() ? 'star' : 'no_star');
  return { ok: reason === 'star', reason, steps, robot, gems: gemsGot, blocksUsed: countBlocks(program) };
}

/** Score a level attempt: 10 for solving, +5 if within the "par" block count, +2 per gem. */
export function scoreRun(result: RunResult, level: Level): number {
  if (!result.ok) return 0;
  return 10 + (result.blocksUsed <= level.par ? 5 : 0) + result.gems * 2;
}

// ---------- Levels: one concept at a time ----------

export interface Level {
  id: number;
  title: string;            // Kreyòl
  concept: 'avanse' | 'vire' | 'repete' | 'si_mi' | 'jiska';
  allowed: Block['type'][]; // blocks available in the palette
  par: number;              // blocks for a 3-star solution
  hint: string;
  maze: Maze;
  stopOnBump: boolean;
}

const M = (rows: number, cols: number, walls: string[], start: Cell, startDir: Dir, star: Cell, gems?: Cell[]): Maze => ({ rows, cols, walls, start, startDir, star, gems });

export const LEVELS: Level[] = [
  { id: 1, title: 'Premye pa', concept: 'avanse', allowed: ['avanse'], par: 3, hint: 'Mete 3 blòk «Avanse».', stopOnBump: false,
    maze: M(1, 4, [], { r: 0, c: 0 }, 'E', { r: 0, c: 3 }) },
  { id: 2, title: 'Vire adwat', concept: 'vire', allowed: ['avanse', 'vire_dwat', 'vire_goch'], par: 5, hint: 'Avanse, vire, epi avanse ankò.', stopOnBump: false,
    maze: M(3, 3, ['0,1', '0,2', '1,1', '1,2'], { r: 0, c: 0 }, 'S', { r: 2, c: 2 }) },
  { id: 3, title: 'Eskalye', concept: 'vire', allowed: ['avanse', 'vire_dwat', 'vire_goch'], par: 8, hint: 'Monte eskalye a: avanse, vire goch, avanse, vire dwat…', stopOnBump: true,
    maze: M(3, 3, ['0,0', '0,1', '1,0', '2,2'], { r: 2, c: 0 }, 'E', { r: 0, c: 2 }, [{ r: 1, c: 1 }]) },
  { id: 4, title: 'Repete!', concept: 'repete', allowed: ['avanse', 'repete'], par: 2, hint: 'Olye 6 blòk «Avanse», sèvi ak «Repete 6 fwa».', stopOnBump: false,
    maze: M(1, 7, [], { r: 0, c: 0 }, 'E', { r: 0, c: 6 }) },
  { id: 5, title: 'Kare a', concept: 'repete', allowed: ['avanse', 'vire_dwat', 'repete'], par: 4, hint: 'Repete 3 fwa: avanse 2, vire dwat.', stopOnBump: true,
    maze: M(3, 3, ['1,1'], { r: 0, c: 0 }, 'E', { r: 2, c: 0 }, [{ r: 0, c: 2 }, { r: 2, c: 2 }]) },
  { id: 6, title: 'Zigzag', concept: 'repete', allowed: ['avanse', 'vire_dwat', 'vire_goch', 'repete'], par: 6, hint: 'Gade sa k repete: avanse, dwat, avanse, goch.', stopOnBump: true,
    maze: M(4, 4, ['0,1', '0,2', '0,3', '1,2', '1,3', '2,0', '2,3', '3,0', '3,1'], { r: 0, c: 0 }, 'S', { r: 3, c: 3 }) },
  { id: 7, title: 'Si gen mi', concept: 'si_mi', allowed: ['avanse', 'vire_dwat', 'repete', 'si_mi'], par: 4, hint: 'Repete: si gen mi devan, vire dwat; sinon, avanse.', stopOnBump: true,
    maze: M(3, 4, ['0,3', '1,0', '1,1', '1,3', '2,0', '2,1', '2,3'], { r: 0, c: 0 }, 'E', { r: 2, c: 2 }) },
  { id: 8, title: 'Jiska zetwal la', concept: 'jiska', allowed: ['avanse', 'vire_dwat', 'vire_goch', 'si_mi', 'jiska_zetwal'], par: 4, hint: '«Jiska zetwal»: si gen mi, vire dwat; sinon avanse.', stopOnBump: true,
    maze: M(4, 4, ['0,3', '1,0', '1,1', '1,3', '2,0', '2,1', '2,3', '3,3'], { r: 0, c: 0 }, 'E', { r: 3, c: 0 }, [{ r: 2, c: 2 }]) },
  { id: 9, title: 'Koulwa long', concept: 'jiska', allowed: ['avanse', 'vire_dwat', 'vire_goch', 'si_mi', 'jiska_zetwal', 'repete'], par: 4, hint: 'Menm lide ak nivo 8, men koulwa a pi long. Pwogram ou pa bezwen pi long!', stopOnBump: true,
    maze: M(5, 5, ['1,0', '1,1', '1,2', '1,3', '2,3', '3,1', '3,2', '3,3'], { r: 0, c: 0 }, 'E', { r: 2, c: 2 }, [{ r: 1, c: 4 }, { r: 4, c: 0 }]) },
  { id: 10, title: 'Vire goch tou', concept: 'si_mi', allowed: ['avanse', 'vire_dwat', 'vire_goch', 'si_mi', 'jiska_zetwal'], par: 4, hint: 'Fwa sa a mi yo fè w vire agoch.', stopOnBump: true,
    maze: M(4, 4, ['0,0', '0,1', '1,0', '1,1', '2,3', '3,3', '1,3'], { r: 3, c: 0 }, 'E', { r: 0, c: 2 }) },
  { id: 11, title: 'Ranmase tout jèm yo', concept: 'repete', allowed: ['avanse', 'vire_dwat', 'vire_goch', 'repete'], par: 6, hint: 'Fè tou kare a pou w pran 4 jèm yo anvan w rive sou zetwal la.', stopOnBump: true,
    maze: M(3, 3, ['1,1'], { r: 0, c: 0 }, 'E', { r: 1, c: 0 }, [{ r: 0, c: 2 }, { r: 2, c: 2 }, { r: 2, c: 0 }, { r: 0, c: 1 }]) },
  { id: 12, title: 'Gwo labirent', concept: 'jiska', allowed: ['avanse', 'vire_dwat', 'vire_goch', 'si_mi', 'jiska_zetwal', 'repete'], par: 7, hint: 'Règ «men dwat»: toujou eseye vire dwat, sinon avanse, sinon vire goch.', stopOnBump: true,
    maze: M(5, 5, ['1,0', '2,0', '2,2', '2,4', '3,2', '3,4', '4,2'], { r: 0, c: 0 }, 'S', { r: 4, c: 4 }, [{ r: 3, c: 0 }]) },
];

/** «Jwenn bug la»: a program with one wrong block; the kid taps the block to fix. */
export interface DebugPuzzle { levelId: number; program: Block[]; bugIndex: number; fix: Block }
export const DEBUG_PUZZLES: DebugPuzzle[] = [
  { levelId: 2, program: [{ type: 'avanse' }, { type: 'avanse' }, { type: 'vire_dwat' }, { type: 'avanse' }, { type: 'avanse' }], bugIndex: 2, fix: { type: 'vire_goch' } },
  { levelId: 4, program: [{ type: 'repete', times: 5, body: [{ type: 'avanse' }] }], bugIndex: 0, fix: { type: 'repete', times: 6, body: [{ type: 'avanse' }] } },
  { levelId: 5, program: [{ type: 'repete', times: 3, body: [{ type: 'avanse' }, { type: 'vire_dwat' }] }], bugIndex: 0, fix: { type: 'repete', times: 3, body: [{ type: 'avanse' }, { type: 'avanse' }, { type: 'vire_dwat' }] } },
];
export function applyFix(p: DebugPuzzle): Block[] { const b = p.program.slice(); b[p.bugIndex] = p.fix; return b; }

export const levelById = (id: number) => LEVELS.find((l) => l.id === id);

/** Reference solutions (also used by tests to prove each level is solvable within par). */
export const SOLUTIONS: Record<number, Block[]> = {
  1: [{ type: 'avanse' }, { type: 'avanse' }, { type: 'avanse' }],
  2: [{ type: 'avanse' }, { type: 'avanse' }, { type: 'vire_goch' }, { type: 'avanse' }, { type: 'avanse' }],
  3: [{ type: 'avanse' }, { type: 'vire_goch' }, { type: 'avanse' }, { type: 'vire_dwat' }, { type: 'avanse' }, { type: 'vire_goch' }, { type: 'avanse' }],
  4: [{ type: 'repete', times: 6, body: [{ type: 'avanse' }] }],
  5: [{ type: 'repete', times: 3, body: [{ type: 'avanse' }, { type: 'avanse' }, { type: 'vire_dwat' }] }],
  6: [{ type: 'repete', times: 3, body: [{ type: 'avanse' }, { type: 'vire_goch' }, { type: 'avanse' }, { type: 'vire_dwat' }] }],
  7: [{ type: 'repete', times: 8, body: [{ type: 'si_mi', then: [{ type: 'vire_dwat' }], else: [{ type: 'avanse' }] }] }],
  8: [{ type: 'jiska_zetwal', body: [{ type: 'si_mi', then: [{ type: 'vire_dwat' }], else: [{ type: 'avanse' }] }] }],
  9: [{ type: 'jiska_zetwal', body: [{ type: 'si_mi', then: [{ type: 'vire_dwat' }], else: [{ type: 'avanse' }] }] }],
  10: [{ type: 'jiska_zetwal', body: [{ type: 'si_mi', then: [{ type: 'vire_goch' }], else: [{ type: 'avanse' }] }] }],
  11: [{ type: 'repete', times: 4, body: [{ type: 'avanse' }, { type: 'avanse' }, { type: 'vire_dwat' }] }],
  12: [{ type: 'jiska_zetwal', body: [{ type: 'vire_dwat' }, { type: 'si_mi', then: [{ type: 'vire_goch' }, { type: 'si_mi', then: [{ type: 'vire_goch' }] }] }, { type: 'avanse' }] }],
};

/** Validate a program only uses the level's palette and is not absurdly long. */
export function validateProgram(level: Level, program: Block[]): string[] {
  const errs: string[] = [];
  const walk = (bs: Block[]) => {
    for (const b of bs) {
      if (!level.allowed.includes(b.type)) errs.push(`blòk «${b.type}» pa disponib nan nivo sa a`);
      if (b.type === 'repete' && (!Number.isInteger(b.times) || b.times < 1 || b.times > 20)) errs.push('repete: ant 1 ak 20 fwa');
      if ('body' in b) walk(b.body);
      if ('then' in b) { walk(b.then); walk(b.else ?? []); }
    }
  };
  walk(program);
  if (countBlocks(program) > 40) errs.push('pwogram nan twò long (maks 40 blòk)');
  return errs;
}
