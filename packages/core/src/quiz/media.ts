import type { Question } from '../types.js';
import { SHAPES } from '../content/shapes.js';

/** Polygons the geometry generator asks about ("Konbyen bò yon kare genyen?"). */
export const POLYGON_SIDES: Record<string, number> = { triyang: 3, kare: 4, rektang: 4, pentagòn: 5, egzagòn: 6, oktogòn: 8 };

/**
 * What a question's picture is, parsed from its `media` field. The app draws each `type`
 * (QuestionView switches on it exhaustively), so a generator that emits media this function
 * cannot parse is caught by the "every media kind has a renderer" test.
 */
export type MediaSpec =
  | { type: 'flag'; iso: string }
  | { type: 'shape'; iso: string }
  | { type: 'shapes'; isos: [string, string] }
  | { type: 'fraction'; n: number; d: number }
  | { type: 'clock'; h: number; m: number }
  | { type: 'money'; items: number[] }
  | { type: 'polygon'; name: string; sides: number };

export function parseMedia(media: Question['media']): MediaSpec | null {
  if (!media) return null;
  const { kind, ref } = media;
  if (kind === 'flag') return /^[A-Z]{2}$/.test(ref) ? { type: 'flag', iso: ref } : null;
  if (kind === 'shape') {
    const isos = ref.split(',');
    if (isos.length === 1) return SHAPES[ref] ? { type: 'shape', iso: ref } : null;
    if (isos.length === 2 && isos.every((i) => SHAPES[i])) return { type: 'shapes', isos: [isos[0], isos[1]] };
    return null;
  }
  if (kind === 'image') {
    const [what, rest = ''] = [ref.slice(0, ref.indexOf(':')), ref.slice(ref.indexOf(':') + 1)];
    if (what === 'fraction') {
      const m = /^(\d+)\/(\d+)$/.exec(rest);
      if (!m) return null;
      const n = +m[1], d = +m[2];
      return d >= 1 && d <= 12 && n >= 0 && n <= d ? { type: 'fraction', n, d } : null;
    }
    if (what === 'clock') {
      const m = /^(\d{1,2}):(\d{2})$/.exec(rest);
      if (!m) return null;
      const h = +m[1], min = +m[2];
      return h >= 1 && h <= 12 && min < 60 ? { type: 'clock', h, m: min } : null;
    }
    if (what === 'money') {
      const items = rest.split(',').map(Number);
      return items.length && items.every((v) => Number.isInteger(v) && v > 0) ? { type: 'money', items } : null;
    }
    if (what === 'shape') return POLYGON_SIDES[rest] ? { type: 'polygon', name: rest, sides: POLYGON_SIDES[rest] } : null;
  }
  return null;
}
