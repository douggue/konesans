/**
 * Ti Zwazo — the Konesans mascot, as plain SVG markup (one source for the app and for the design renders).
 * viewBox 0 0 160 170. The art is split into layers so the live mascot can move wings, head and effects
 * separately on the native driver; `mascotXml` stacks the same layers into one static picture.
 * Pure TS (no JSX, no enums) so `node --experimental-strip-types` can render it for design/mascot/.
 */

export const MASCOT_MOODS = ['happy', 'think', 'sad', 'cheer', 'wave', 'wow', 'laugh', 'proud', 'love', 'sleepy', 'cool', 'nervous', 'shy', 'angry'] as const;
export type MascotMood = (typeof MASCOT_MOODS)[number];

export const VB_W = 160;
export const VB_H = 170;
/** Rotation pivots (viewBox units) for the live rig. */
export const PIVOT = { wingL: [47, 108] as const, wingR: [113, 108] as const, neck: [80, 110] as const, feet: [80, 158] as const };

// ─── palette ────────────────────────────────────────────────────────────────
const INK = '#14213D';
const B0 = '#4775F5'; // body base
const B1 = '#2E59D6'; // body shade
const B3 = '#8AA9FF'; // body highlight
const W0 = '#2C57D8'; // wing base
const W1 = '#1B3FA6'; // wing shade
const W3 = '#6F92FA'; // wing highlight
const C0 = '#FFF6E3'; // belly
const C1 = '#F1D9AE';
const K0 = '#FFC93C'; // beak
const K1 = '#F09A0A';
const K3 = '#FFE9A8';
const MOUTH = '#8A1230';
const TONGUE = '#FF6F87';
const F0 = '#FFA62B'; // feet
const F1 = '#DE7C00';
const R0 = '#D21034'; // scarf (Haiti red)
const R1 = '#9E0A27';
const R3 = '#FF5A6E';
const HB = '#1F47B5'; // Haiti blue
const HB1 = '#14307D';
const BLUSH = '#FF8FB4';
const LID = '#3A66E8'; // eyelid: a step darker than the face so it reads as a lid
const FACE = '#5C86FF';

const r1 = (n: number) => Math.round(n * 10) / 10;

/** A filled shape with a flat shade tone: shade underneath, base shifted up-left and shrunk, outline on top. */
function shaded(d: string, base: string, shade: string, o: { sw?: number; dx?: number; dy?: number; s?: number; cx?: number; cy?: number; stroke?: boolean } = {}) {
  const { sw = 3.6, dx = -1.5, dy = -2.5, s = 0.93, cx = 80, cy = 80, stroke = true } = o;
  const tf = `translate(${r1(dx + cx * (1 - s))} ${r1(dy + cy * (1 - s))}) scale(${s})`;
  return `<path d="${d}" fill="${shade}"/><path d="${d}" fill="${base}" transform="${tf}"/>` + (stroke ? `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>` : '');
}
const line = (d: string, color = INK, w = 3, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

// ─── shapes ─────────────────────────────────────────────────────────────────
const HEAD = 'M80 27C107 27 127 45 128 69C129 85 123 98 111 106C102 112 92 114 80 114C68 114 58 112 49 106C37 98 31 85 32 69C33 45 53 27 80 27Z';
const BODY = 'M48 100C39 110 35 124 37 136C40 149 58 156 80 156C102 156 120 149 123 136C125 124 121 110 112 100Z';
const BELLY = 'M60 113C53 122 52 137 58 145C64 152 96 152 102 145C108 137 107 122 100 113Z';
const TAIL = 'M108 140C118 140 130 142 138 138C136 144 132 147 127 148C132 150 135 152 136 156C126 157 116 154 108 150Z';
const CREST = {
  up: 'M70 32C66 20 70 9 79 5C77 13 79 20 83 25C85 15 92 9 101 9C95 14 92 21 92 30Z',
  mid: 'M69 33C64 22 66 12 74 7C73 15 76 21 81 26C82 16 89 9 99 8C93 14 91 22 92 31Z',
  droop: 'M68 33C60 26 56 17 58 9C62 16 69 21 76 26C76 17 82 11 92 10C88 16 89 24 92 31Z',
  spiky: 'M68 33L62 13L75 24L80 4L86 23L100 10L93 32Z',
};
/** Left wing in local coords: shoulder at 0,0, hanging down. The right wing is the mirror. */
const WING = 'M6 -6C-6 -7 -16 5 -17 20C-18 30 -16 38 -12 43C-10 39 -8 38 -5 41C-3 36 -1 36 1 39C2 33 4 29 6 27C10 18 11 4 6 -6Z';
const WING_DETAIL = line('M-9 22Q-10 32 -7 40', W1, 2.2) + line('M-2 23Q-2 30 0 37', W1, 2.2) + line('M-3 -1C-10 3 -13 11 -13 19', W3, 3);

type Wing = { a: number; z: 'back' | 'mid' | 'over'; dy?: number };
type Eye = { kind: 'open'; dx?: number; dy?: number; p?: number; big?: number; lid?: number; tilt?: number; wet?: boolean } | { kind: 'happy' | 'blink' | 'sleep' | 'squeeze' | 'heart' };
type Pose = {
  wingL: Wing; wingR: Wing; headRot?: number; headDy?: number; crest?: keyof typeof CREST;
  eyeL: Eye; eyeR: Eye; brows: string; beak: 'smile' | 'grin' | 'open' | 'wide' | 'o' | 'frown' | 'pout' | 'grit' | 'smirk' | 'small';
  blush?: number; glasses?: boolean; fx?: string;
};

// ─── face parts ─────────────────────────────────────────────────────────────
const EYE_L = [64, 66];
const EYE_R = [96, 66];
const RX = 12.5;
const RY = 15;

/** Upper lid: the part of the eye above a line `lid` (0 = none, 1 = closed) of the way down, tilted (+ = outer corner lower). */
function lidPath(cx: number, cy: number, rx: number, ry: number, lid: number, tilt: number, side: 1 | -1) {
  // line y = y0 + k (x - cx); for the left eye (side -1) the outer corner is at smaller x
  const y0 = cy - ry + lid * 2 * ry;
  const k = tilt * side * 0.045;
  // solve ((x-cx)/rx)^2 + ((y0 + k(x-cx) - cy)/ry)^2 = 1 for u = x - cx
  const m = y0 - cy;
  const A = 1 / (rx * rx) + (k * k) / (ry * ry);
  const B = (2 * k * m) / (ry * ry);
  const C = (m * m) / (ry * ry) - 1;
  const disc = B * B - 4 * A * C;
  if (disc <= 0) return '';
  const u1 = (-B - Math.sqrt(disc)) / (2 * A);
  const u2 = (-B + Math.sqrt(disc)) / (2 * A);
  const p1 = [cx + u1, y0 + k * u1];
  const p2 = [cx + u2, y0 + k * u2];
  const large = m > 0 ? 1 : 0;
  return `M${r1(p1[0])} ${r1(p1[1])}A${rx} ${ry} 0 ${large} 1 ${r1(p2[0])} ${r1(p2[1])}Z`;
}
function lidLine(cx: number, cy: number, rx: number, ry: number, lid: number, tilt: number, side: 1 | -1) {
  const d = lidPath(cx, cy, rx, ry, lid, tilt, side);
  const m = d.match(/^M([\d.-]+) ([\d.-]+)A[^ ]+ [^ ]+ 0 \d 1 ([\d.-]+) ([\d.-]+)Z$/);
  if (!m) return '';
  const mx = (+m[1] + +m[3]) / 2; const my = (+m[2] + +m[4]) / 2 + 2.2; // the lid edge sags a little
  return `<path d="${d.replace(/Z$/, '')}Q${r1(mx)} ${r1(my)} ${m[1]} ${m[2]}Z" fill="${LID}"/>` + line(`M${m[1]} ${m[2]}Q${r1(mx)} ${r1(my)} ${m[3]} ${m[4]}`, INK, 2.6);
}

function eye(e: Eye, c: number[], side: 1 | -1) {
  const [cx, cy] = c;
  if (e.kind === 'happy') return line(`M${cx - 9} ${cy + 4}Q${cx} ${cy - 8} ${cx + 9} ${cy + 4}`, INK, 3.6);
  if (e.kind === 'sleep') return line(`M${cx - 9} ${cy + 1}Q${cx} ${cy + 8} ${cx + 9} ${cy + 1}`, INK, 3.2) + line(`M${cx - 7 * side * -1 - (side === -1 ? 0 : 0)} ${cy + 4}`, INK, 0);
  if (e.kind === 'squeeze') {
    const s = side; // left eye ">", right eye "<"
    return line(`M${cx - 7 * -s} ${cy - 7}L${cx + 6 * -s} ${cy}L${cx - 7 * -s} ${cy + 7}`, INK, 3.6);
  }
  if (e.kind === 'blink') {
    return `<ellipse cx="${cx}" cy="${cy}" rx="${RX}" ry="${RY}" fill="${B1}"/>` + line(`M${cx - RX + 1} ${cy + 3}Q${cx} ${cy + 10} ${cx + RX - 1} ${cy + 3}`, INK, 3.2);
  }
  if (e.kind === 'heart') {
    const h = `M${cx} ${cy + 12}C${cx - 6} ${cy + 7} ${cx - 15} ${cy + 1} ${cx - 15} ${cy - 6}C${cx - 15} ${cy - 13} ${cx - 6} ${cy - 15} ${cx} ${cy - 8}C${cx + 6} ${cy - 15} ${cx + 15} ${cy - 13} ${cx + 15} ${cy - 6}C${cx + 15} ${cy + 1} ${cx + 6} ${cy + 7} ${cx} ${cy + 12}Z`;
    return shaded(h, '#F0264C', '#B80F31', { sw: 2.8, cx, cy, s: 0.9, dx: -1, dy: -1.5 }) + `<ellipse cx="${cx - 8}" cy="${cy - 7}" rx="3" ry="2.2" fill="#FFFFFF" transform="rotate(-30 ${cx - 8} ${cy - 7})"/>`;
  }
  const o = e as Extract<Eye, { kind: 'open' }>;
  const big = o.big ?? 1;
  const rx = RX * big;
  const ry = RY * big;
  const p = o.p ?? 1;
  const px = cx + (o.dx ?? 0);
  const py = cy + (o.dy ?? 0);
  let s = `<ellipse cx="${cx}" cy="${cy}" rx="${r1(rx)}" ry="${r1(ry)}" fill="#FFFFFF"/>`;
  s += `<ellipse cx="${r1(px)}" cy="${r1(py)}" rx="${r1(7.6 * p)}" ry="${r1(9 * p)}" fill="${INK}"/>`;
  s += `<ellipse cx="${r1(px)}" cy="${r1(py + 4.2 * p)}" rx="${r1(5 * p)}" ry="${r1(3.2 * p)}" fill="#2D4A8C"/>`;
  s += `<circle cx="${r1(px + 2.6 * p)}" cy="${r1(py - 3.6 * p)}" r="${r1(o.wet ? 3.8 : 3.2 * Math.max(p, 0.8))}" fill="#FFFFFF"/>`;
  s += `<circle cx="${r1(px - 2.8 * p)}" cy="${r1(py + 3 * p)}" r="${o.wet ? 2.2 : 1.5}" fill="#FFFFFF"/>`;
  if (o.lid) s += lidLine(cx, cy, rx, ry, o.lid, o.tilt ?? 0, side);
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${r1(rx)}" ry="${r1(ry)}" fill="none" stroke="${INK}" stroke-width="2.8"/>`;
  return s;
}

const UPPER = 'M68 80C71 75.5 89 75.5 92 80C92 86 87 91 80 93C73 91 68 86 68 80Z';
function beak(kind: Pose['beak']) {
  const hl = line('M73 79.5Q80 77.5 87 79.5', K3, 2.4);
  const upper = (dy = 0) => `<g transform="translate(0 ${dy})">${shaded(UPPER, K0, K1, { sw: 2.8, cx: 80, cy: 84, dy: -1.5, dx: 0, s: 0.9 })}${hl}</g>`;
  const lowerSmall = shaded('M72 87C75 93 85 93 88 87C87 94 84 97 80 97C76 97 73 94 72 87Z', K0, K1, { sw: 2.6, cx: 80, cy: 92, dx: 0, dy: -1, s: 0.9 });
  const corners = (up: boolean) => (up ? line('M67.5 82Q65 83 64 80.5', INK, 2.4) + line('M92.5 82Q95 83 96 80.5', INK, 2.4) : line('M68 85Q65.5 86 64.5 89', INK, 2.4) + line('M92 85Q94.5 86 95.5 89', INK, 2.4));
  const mouth = (h: number, w = 11) => {
    const m = `M${80 - w} 84C${80 - w} ${84 + h * 0.7} ${80 - w * 0.45} ${84 + h} 80 ${84 + h}C${80 + w * 0.45} ${84 + h} ${80 + w} ${84 + h * 0.7} ${80 + w} 84Z`;
    const tongue = `<ellipse cx="80" cy="${r1(84 + h * 0.78)}" rx="${r1(w * 0.55)}" ry="${r1(h * 0.24)}" fill="${TONGUE}"/>`;
    const lip = `M${80 - w} 86C${80 - w} ${86 + h * 0.75} ${80 - w * 0.45} ${86 + h} 80 ${86 + h}C${80 + w * 0.45} ${86 + h} ${80 + w} ${86 + h * 0.75} ${80 + w} 86C${80 + w - 1.5} ${84 + h * 0.75} ${80 + w * 0.4} ${84 + h - 3} 80 ${84 + h - 3}C${80 - w * 0.4} ${84 + h - 3} ${80 - w + 1.5} ${84 + h * 0.75} ${80 - w} 86Z`;
    return `<path d="${m}" fill="${MOUTH}" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>${tongue}<path d="${lip}" fill="${K0}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
  };
  switch (kind) {
    case 'smile': return lowerSmall + upper() + corners(true);
    case 'small': return lowerSmall + upper();
    case 'grin': return mouth(13, 10) + upper(-1) + corners(true);
    case 'open': return mouth(17, 11) + upper(-2);
    case 'wide': return mouth(22, 12) + upper(-3);
    case 'o': return `<ellipse cx="80" cy="96" rx="6.5" ry="8" fill="${MOUTH}" stroke="${INK}" stroke-width="2.6"/><ellipse cx="80" cy="100" rx="3.6" ry="2.6" fill="${TONGUE}"/>` + upper(-3);
    case 'frown': return lowerSmall + upper() + corners(false);
    case 'pout': return shaded('M73 88C76 92 84 92 87 88C87 95 84 98 80 98C76 98 73 95 73 88Z', K0, K1, { sw: 2.6, cx: 80, cy: 92, dx: 0, dy: -1, s: 0.9 }) + upper(-0.5) + corners(false);
    case 'grit': return `<path d="M69 84H91V93C91 95 89 96 87 96H73C71 96 69 95 69 93Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>` + line('M70 90L74 88L78 91L82 88L86 91L90 89', INK, 2) + upper(-1.5);
    case 'smirk': return lowerSmall + upper() + line('M92.5 82Q95.5 82.5 96.5 79', INK, 2.4) + line('M67.5 84Q65.5 84.5 64.5 85', INK, 2.2);
  }
}

// ─── poses ──────────────────────────────────────────────────────────────────
const rest: Wing = { a: 8, z: 'mid' };
const BROW = {
  happy: line('M54 43Q63 37 72 42') + line('M88 42Q97 37 106 43'),
  high: line('M53 39Q62 32 71 37') + line('M89 37Q98 32 107 39'),
  think: line('M55 45Q63 43 72 45') + line('M88 38Q97 31 106 36'),
  sad: line('M53 45Q62 44 71 38') + line('M89 38Q98 44 107 45'),
  worried: line('M53 43Q61 42 70 35') + line('M90 35Q99 42 107 43'),
  angry: line('M53 38L72 46', INK, 3.6) + line('M88 46L107 38', INK, 3.6),
  flat: line('M55 45Q63 43 71 45') + line('M89 45Q97 43 105 45'),
  proud: line('M55 46Q63 44 71 46') + line('M88 39Q97 33 106 38'),
  cool: line('M88 35Q97 30 106 34'),
};
const SPARK = (x: number, y: number, s = 1, c = '#FFD43B') => `<path d="M${x} ${y - 7 * s}C${x + 1 * s} ${y - 2 * s} ${x + 2 * s} ${y - 1 * s} ${x + 7 * s} ${y}C${x + 2 * s} ${y + 1 * s} ${x + 1 * s} ${y + 2 * s} ${x} ${y + 7 * s}C${x - 1 * s} ${y + 2 * s} ${x - 2 * s} ${y + 1 * s} ${x - 7 * s} ${y}C${x - 2 * s} ${y - 1 * s} ${x - 1 * s} ${y - 2 * s} ${x} ${y - 7 * s}Z" fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
const DROP = (x: number, y: number, s = 1, c = '#9FD3FF') => `<path d="M${x} ${y - 8 * s}C${x + 4 * s} ${y - 2 * s} ${x + 6 * s} ${y + 1 * s} ${x + 6 * s} ${y + 4 * s}C${x + 6 * s} ${y + 7.5 * s} ${x + 3.3 * s} ${y + 10 * s} ${x} ${y + 10 * s}C${x - 3.3 * s} ${y + 10 * s} ${x - 6 * s} ${y + 7.5 * s} ${x - 6 * s} ${y + 4 * s}C${x - 6 * s} ${y + 1 * s} ${x - 4 * s} ${y - 2 * s} ${x} ${y - 8 * s}Z" fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="${r1(x - 2 * s)}" cy="${r1(y + 4 * s)}" r="${r1(1.4 * s)}" fill="#FFFFFF"/>`;
const HEART = (x: number, y: number, s = 1) => `<path d="M${x} ${y + 7 * s}C${x - 4 * s} ${y + 4 * s} ${x - 9 * s} ${y} ${x - 9 * s} ${y - 4 * s}C${x - 9 * s} ${y - 8 * s} ${x - 4 * s} ${y - 9 * s} ${x} ${y - 5 * s}C${x + 4 * s} ${y - 9 * s} ${x + 9 * s} ${y - 8 * s} ${x + 9 * s} ${y - 4 * s}C${x + 9 * s} ${y} ${x + 4 * s} ${y + 4 * s} ${x} ${y + 7 * s}Z" fill="#FF5A6E" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
const ZED = (x: number, y: number, s = 1) => `<path d="M${x - 6 * s} ${y - 7 * s}H${x + 6 * s}V${y - 3 * s}L${x - 1 * s} ${y + 3 * s}H${x + 6 * s}V${y + 7 * s}H${x - 6 * s}V${y + 3 * s}L${x + 1 * s} ${y - 3 * s}H${x - 6 * s}Z" fill="#FFFFFF" stroke="${INK}" stroke-width="${r1(2 * Math.min(1, s + 0.2))}" stroke-linejoin="round"/>`;

export const POSES: Record<MascotMood, Pose> = {
  happy: { wingL: rest, wingR: rest, crest: 'mid', eyeL: { kind: 'open', dx: 1.5, dy: 0.5 }, eyeR: { kind: 'open', dx: 1.5, dy: 0.5 }, brows: BROW.happy, beak: 'smile', blush: 0.55 },
  think: { wingL: rest, wingR: { a: -112, z: 'over', dy: 9 }, headRot: 5, crest: 'mid', eyeL: { kind: 'open', dx: 3.5, dy: -5, lid: 0.22, tilt: 0 }, eyeR: { kind: 'open', dx: 3.5, dy: -5 }, brows: BROW.think, beak: 'small', blush: 0.4 },
  sad: { wingL: { a: -6, z: 'mid', dy: 3 }, wingR: { a: -6, z: 'mid', dy: 3 }, headRot: -3, headDy: 3, crest: 'droop', eyeL: { kind: 'open', dy: 4, lid: 0.3, tilt: 6, wet: true }, eyeR: { kind: 'open', dy: 4, lid: 0.3, tilt: 6, wet: true }, brows: BROW.sad, beak: 'frown', blush: 0.3, fx: DROP(51, 88, 0.75) },
  cheer: { wingL: { a: 145, z: 'back' }, wingR: { a: 145, z: 'back' }, crest: 'up', eyeL: { kind: 'happy' }, eyeR: { kind: 'happy' }, brows: BROW.high, beak: 'wide', blush: 0.7, fx: SPARK(22, 40, 0.9) + SPARK(140, 30, 0.75) + SPARK(136, 74, 0.5, '#FFFFFF') },
  wave: { wingL: rest, wingR: { a: 140, z: 'back' }, crest: 'mid', eyeL: { kind: 'open', dx: 1.5 }, eyeR: { kind: 'open', dx: 1.5 }, brows: BROW.happy, beak: 'grin', blush: 0.6 },
  wow: { wingL: { a: 62, z: 'mid' }, wingR: { a: 62, z: 'mid' }, headDy: -2, crest: 'up', eyeL: { kind: 'open', big: 1.12, p: 0.62 }, eyeR: { kind: 'open', big: 1.12, p: 0.62 }, brows: BROW.high, beak: 'o', blush: 0.35, fx: line('M30 34L22 28', INK, 3) + line('M27 46L18 45', INK, 3) + line('M130 34L138 28', INK, 3) + line('M133 46L142 45', INK, 3) },
  laugh: { wingL: { a: -42, z: 'mid' }, wingR: { a: -42, z: 'mid' }, headRot: -4, crest: 'up', eyeL: { kind: 'squeeze' }, eyeR: { kind: 'squeeze' }, brows: BROW.high, beak: 'wide', blush: 0.8, fx: DROP(45, 62, 0.55) + DROP(115, 62, 0.55) },
  proud: { wingL: { a: -30, z: 'mid' }, wingR: { a: -30, z: 'mid' }, headRot: -4, headDy: -1, crest: 'up', eyeL: { kind: 'happy' }, eyeR: { kind: 'open', dx: -1, lid: 0.28, tilt: -2 }, brows: BROW.proud, beak: 'smirk', blush: 0.55, fx: SPARK(36, 30, 0.6) },
  love: { wingL: { a: -66, z: 'mid' }, wingR: { a: -66, z: 'mid' }, headRot: 4, crest: 'mid', eyeL: { kind: 'heart' }, eyeR: { kind: 'heart' }, brows: BROW.high, beak: 'grin', blush: 0.9, fx: HEART(132, 30, 0.8) + HEART(24, 44, 0.55) },
  sleepy: { wingL: { a: -4, z: 'mid', dy: 2 }, wingR: { a: -4, z: 'mid', dy: 2 }, headRot: 8, headDy: 2, crest: 'droop', eyeL: { kind: 'sleep' }, eyeR: { kind: 'sleep' }, brows: BROW.flat, beak: 'small', blush: 0.45, fx: ZED(124, 30, 0.75) + ZED(138, 14, 0.55) },
  cool: { wingL: { a: -30, z: 'mid' }, wingR: rest, headRot: -3, crest: 'up', eyeL: { kind: 'open' }, eyeR: { kind: 'open' }, brows: BROW.cool, beak: 'smirk', blush: 0.3, glasses: true },
  nervous: { wingL: { a: -60, z: 'mid' }, wingR: { a: -60, z: 'mid' }, crest: 'mid', eyeL: { kind: 'open', dx: -4, p: 0.68, lid: 0.12, tilt: 4 }, eyeR: { kind: 'open', dx: -4, p: 0.68, lid: 0.12, tilt: 4 }, brows: BROW.worried, beak: 'grit', blush: 0.25, fx: DROP(124, 40, 0.85) },
  shy: { wingL: { a: -52, z: 'mid' }, wingR: { a: -168, z: 'over', dy: 6 }, headRot: -6, headDy: 1, crest: 'droop', eyeL: { kind: 'open', dx: -3.5, dy: 4, lid: 0.35, tilt: 2 }, eyeR: { kind: 'open', dx: -3.5, dy: 4, lid: 0.35, tilt: 2 }, brows: BROW.worried, beak: 'small', blush: 1 },
  angry: { wingL: { a: 26, z: 'mid' }, wingR: { a: 26, z: 'mid' }, crest: 'spiky', eyeL: { kind: 'open', dy: 1, lid: 0.32, tilt: -9 }, eyeR: { kind: 'open', dy: 1, lid: 0.32, tilt: -9 }, brows: BROW.angry, beak: 'pout', blush: 0.85, fx: line('M118 22Q123 27 128 22', '#E8173F', 3.4) + line('M118 36Q123 31 128 36', '#E8173F', 3.4) + line('M116 24Q121 29 116 34', '#E8173F', 3.4) + line('M130 24Q125 29 130 34', '#E8173F', 3.4) },
};

// ─── layers ─────────────────────────────────────────────────────────────────
function glasses() {
  const lens = (cx: number) => `M${cx - 15} 58H${cx + 15}C${cx + 16} 58 ${cx + 16} 59 ${cx + 16} 60C${cx + 15} 70 ${cx + 9} 76 ${cx} 76C${cx - 9} 76 ${cx - 15} 70 ${cx - 16} 60C${cx - 16} 59 ${cx - 16} 58 ${cx - 15} 58Z`;
  return `<path d="M44 61L36 57M116 61L124 57" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`
    + `<path d="${lens(63)}" fill="${INK}"/><path d="${lens(97)}" fill="${INK}"/><path d="M78 61Q80 59 82 61" stroke="${INK}" stroke-width="4" fill="none"/>`
    + `<path d="M50 61H60L52 72Z" fill="#3A5BA8" opacity=".9"/><path d="M84 61H94L86 72Z" fill="#3A5BA8" opacity=".9"/>`
    + line('M55 62L51 67', '#FFFFFF', 2.4) + line('M89 62L85 67', '#FFFFFF', 2.4);
}

function headLayer(p: Pose, blink: boolean) {
  const cr = CREST[p.crest ?? 'mid'];
  const eyes = p.glasses ? glasses() : (() => {
    const canBlink = (e: Eye) => e.kind === 'open';
    const l = blink && canBlink(p.eyeL) ? ({ kind: 'blink' } as Eye) : p.eyeL;
    const r = blink && canBlink(p.eyeR) ? ({ kind: 'blink' } as Eye) : p.eyeR;
    return eye(l, EYE_L, -1) + eye(r, EYE_R, 1);
  })();
  const bo = r1(Math.min(1, 0.62 + (p.blush ?? 0) * 0.4));
  const blush = p.blush ? `<ellipse cx="47" cy="86" rx="${r1(6.5 + p.blush * 2.5)}" ry="4.2" fill="${BLUSH}" opacity="${bo}"/><ellipse cx="113" cy="86" rx="${r1(6.5 + p.blush * 2.5)}" ry="4.2" fill="${BLUSH}" opacity="${bo}"/>` : '';
  const body = shaded(cr, B1, HB, { sw: 3.4, cx: 80, cy: 20, s: 0.9, dx: -1, dy: -1 })
    + shaded(HEAD, B0, B1, { sw: 4, cx: 80, cy: 66, s: 0.94, dx: -2.5, dy: -3 })
    // face: a soft lighter mask behind the eyes gives the head a front plane
    + `<path d="M80 50C90 44 108 44 114 54C120 64 116 80 106 84C98 87 90 84 80 84C70 84 62 87 54 84C44 80 40 64 46 54C52 44 70 44 80 50Z" fill="${FACE}"/>`
    + line('M46 44C52 35 62 31 70 31', B3, 4) + `<circle cx="42" cy="54" r="2.4" fill="${B3}"/>`
    + blush + eyes + p.brows + beak(p.beak);
  const rot = p.headRot ?? 0;
  const dy = p.headDy ?? 0;
  return rot || dy ? `<g transform="translate(0 ${dy}) rotate(${rot} ${PIVOT.neck[0]} ${PIVOT.neck[1]})">${body}</g>` : body;
}

function bodyLayer() {
  const foot = (x: number) => shaded(`M${x - 9} 155C${x - 9} 150 ${x - 5} 148 ${x} 148C${x + 5} 148 ${x + 9} 150 ${x + 9} 155C${x + 9} 158 ${x + 6.5} 159.5 ${x + 4.5} 158C${x + 3} 160.5 ${x - 3} 160.5 ${x - 4.5} 158C${x - 6.5} 159.5 ${x - 9} 158 ${x - 9} 155Z`, F0, F1, { sw: 2.8, cx: x, cy: 152, s: 0.88, dx: 0, dy: -1.2 });
  return shaded(TAIL, W0, W1, { sw: 3.2, cx: 120, cy: 146, s: 0.9 })
    + shaded(BODY, B0, B1, { sw: 4, cx: 80, cy: 124, s: 0.93, dx: -2.5, dy: -3 })
    + shaded(BELLY, C0, C1, { stroke: false, cx: 80, cy: 128, s: 0.92, dx: -1.5, dy: -2.5 })
    + line('M70 128Q73 131 76 128', C1, 2.2) + line('M84 128Q87 131 90 128', C1, 2.2) + line('M77 138Q80 141 83 138', C1, 2.2)
    + foot(66) + foot(94);
}

function scarfLayer() {
  const band = 'M42 99C58 110 102 110 118 99C121 102 122 106 121 110C104 122 56 122 39 110C38 106 39 102 42 99Z';
  // two tails hang over the cream belly: Haiti blue and red, like the flag
  const tailBlue = 'M62 114C58 121 54 129 52 137C57 139 62 138 65 135C65 128 67 121 69 116Z';
  const tailRed = 'M69 116C70 123 72 131 76 138C80 137 84 134 85 130C80 126 77 120 76 114Z';
  return shaded(tailBlue, HB, HB1, { sw: 3, cx: 60, cy: 126, s: 0.86, dx: 0.6, dy: -1.2 })
    + shaded(tailRed, R0, R1, { sw: 3, cx: 77, cy: 126, s: 0.86, dx: 0.6, dy: -1.2 })
    + shaded(band, R0, R1, { sw: 3.4, cx: 80, cy: 108, s: 0.92, dx: 0, dy: -2.2 })
    + line('M50 106C62 113 98 113 110 106', R3, 2.6)
    + shaded('M61 112C61 108 64 106 68 106C72 106 75 109 75 113C75 117 72 119 68 119C64 119 61 116 61 112Z', R0, R1, { sw: 3, cx: 68, cy: 112, s: 0.85, dx: 0, dy: -1 })
    + `<circle cx="66" cy="110" r="1.6" fill="${R3}"/>`;
}

function wingSvg(side: 'L' | 'R', w: Wing) {
  const [sx, sy] = side === 'L' ? PIVOT.wingL : PIVOT.wingR;
  const mirror = side === 'R' ? ' scale(-1 1)' : '';
  return `<g transform="translate(${sx} ${sy + (w.dy ?? 0)})${mirror} rotate(${w.a})">${shaded(WING, W0, W1, { sw: 3.4, cx: 0, cy: 0, s: 0.9, dx: -0.5, dy: -1.5 })}${WING_DETAIL}</g>`;
}

export type MascotLayers = {
  shadow: string; back: string; body: string; mid: string; head: string; scarf: string; over: string; fx: string;
  /** which layer each wing sits in, so the live rig can put it in its own animated view */
  wingL: { svg: string; z: Wing['z'] }; wingR: { svg: string; z: Wing['z'] };
};

export function mascotLayers(mood: MascotMood, blink = false): MascotLayers {
  const p = POSES[mood] ?? POSES.happy;
  return {
    shadow: `<ellipse cx="80" cy="161" rx="40" ry="5.5" fill="${INK}" opacity=".16"/>`,
    back: '', mid: '', over: '',
    body: bodyLayer(),
    head: headLayer(p, blink),
    scarf: scarfLayer(),
    fx: p.fx ?? '',
    wingL: { svg: wingSvg('L', p.wingL), z: p.wingL.z },
    wingR: { svg: wingSvg('R', p.wingR), z: p.wingR.z },
  };
}

const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}">${inner}</svg>`;
export const layerXml = wrap;

/** The whole bird in one SVG document (static art, splash, icons). */
export function mascotXml(mood: MascotMood, blink = false, opts: { shadow?: boolean; fx?: boolean } = {}) {
  const L = mascotLayers(mood, blink);
  const at = (z: Wing['z']) => (L.wingL.z === z ? L.wingL.svg : '') + (L.wingR.z === z ? L.wingR.svg : '');
  return wrap((opts.shadow === false ? '' : L.shadow) + at('back') + L.body + at('mid') + L.head + L.scarf + at('over') + (opts.fx === false ? '' : L.fx));
}
