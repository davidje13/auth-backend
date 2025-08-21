import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

export default [
  {
    input: 'src/index.ts',
    output: [{ file: 'build/index.mjs', format: 'esm' }],
    external: [/node:.*/, 'express', 'jwt-simple'],
    plugins: [
      typescript({
        compilerOptions: {
          noEmit: false,
          declaration: true,
          module: 'esnext',
          rootDir: '.',
          declarationDir: './build/types',
        },
        tslib: {},
        exclude: ['**/*.test.*', '**/testServerRunner.ts'],
      }),
      terser({
        format: { ascii_only: true },
        mangle: { properties: { regex: /^_/ } },
      }),
    ],
  },
  {
    input: './build/types/src/index.d.ts',
    output: [{ file: 'build/index.d.ts', format: 'esm' }],
    plugins: [dts()],
  },
];
