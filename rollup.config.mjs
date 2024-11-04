import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/bundle.mjs',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
    name: 'Bundle'
  },
  plugins: [
    resolve(),
    commonjs()
  ]
};
