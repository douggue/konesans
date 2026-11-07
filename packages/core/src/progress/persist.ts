/**
 * Helpers for the app's persisted stores (zustand `persist`): a deep merge of a saved snapshot over the current
 * defaults, so a release that adds a field inside a nested object (settings.textSize, kidSettings.x, missions.firstDay…)
 * still gets its default on an upgraded phone. zustand's own merge is shallow: the old saved object would replace
 * the new default object whole and the new field would be `undefined`.
 */

const isPlain = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/**
 * `saved` over `defaults`, recursively for plain objects. Saved values win (including `null` and arrays); keys
 * missing from the save take the default. A saved value of the wrong shape (an object where the default is a
 * number, a number where the default is an object…) is dropped for the default. Functions in `defaults`
 * (store actions) are always kept.
 */
export function mergeDefaults<T>(defaults: T, saved: unknown): T {
  if (!isPlain(defaults)) return (saved === undefined ? defaults : saved) as T;
  if (!isPlain(saved)) return defaults;
  const out: Record<string, unknown> = { ...defaults };
  for (const k of Object.keys(saved)) {
    const d = (defaults as Record<string, unknown>)[k];
    const v = saved[k];
    if (v === undefined || typeof d === 'function') continue;
    if (d === undefined || d === null) { out[k] = v; continue; }
    if (isPlain(d)) { out[k] = isPlain(v) ? mergeDefaults(d, v) : d; continue; }
    if (Array.isArray(d)) { out[k] = Array.isArray(v) ? v : d; continue; }
    out[k] = v === null || typeof v === typeof d ? v : d;
  }
  return out as T;
}
