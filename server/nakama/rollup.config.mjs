import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

// Nakama's JS runtime is ES5-ish (goja). Bundle core + module into one file. Bundle core + module into one file.
// Nakama freezes globals after InitModule, and tslib's __assign reassigns itself on first call
// ("Cannot assign to read only property '__assign'"). Replace it with a plain alias.
const freezeSafeHelpers = {
  name: 'freeze-safe-helpers',
  renderChunk(code) {
    const i = code.indexOf('var __assign = function() {');
    if (i < 0) return null;
    const m = /return __assign\.apply\(this, arguments\);\r?\n\};/.exec(code.slice(i));
    if (!m) throw new Error('freeze-safe-helpers: unexpected tslib __assign shape');
    return { code: code.slice(0, i) + 'var __assign = Object.assign;' + code.slice(i + m.index + m[0].length), map: null };
  },
};

export default {
  input: 'src/main.ts',
  output: { file: 'build/index.js', format: 'cjs', sourcemap: false },
  external: ['nakama-runtime'],
  plugins: [freezeSafeHelpers, resolve({ extensions: ['.ts', '.js'] }), commonjs(), typescript({ tsconfig: './tsconfig.json', noEmitOnError: true })],
};
