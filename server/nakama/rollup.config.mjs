import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

// Nakama's JS runtime is ES5-ish (goja). Bundle core + module into one file.
export default {
  input: 'src/main.ts',
  output: { file: 'build/index.js', format: 'cjs', sourcemap: false },
  external: ['nakama-runtime'],
  plugins: [resolve({ extensions: ['.ts', '.js'] }), commonjs(), typescript({ tsconfig: './tsconfig.json', noEmitOnError: true })],
};
