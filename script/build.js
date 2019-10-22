const path = require('path');
const babel = require('rollup-plugin-babel');
const alias = require('rollup-plugin-alias');
const typescript = require('rollup-plugin-typescript');
const commonjs = require('rollup-plugin-commonjs');
const resolver = require('rollup-plugin-node-resolve');
const json = require('rollup-plugin-json');
const {terser} = require('rollup-plugin-terser');
const {dependencies} = require('../package.json');

const resolve = p => {
  return path.resolve(__dirname, '../', p)
};

module.exports = {
  input: resolve('./src/index.ts'),
  output: {
    file: resolve('lib/index.js'),
    format: 'es',
  },
  external: Object.keys(dependencies),
  plugins: [
    alias({
      resolve: ['.ts'],
    }),
    json(),
    resolver(),
    commonjs(),
    typescript(),
    babel({
      exclude: 'node_modules/**',
      externalHelpers: true,
      runtimeHelpers: true,
      extensions: ['.ts', '.js', '.tsx', '.jsx', '.es6', '.es', '.mjs'],
    }),
  ]
}