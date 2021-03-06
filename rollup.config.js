import dts from 'rollup-plugin-dts'
import pkg from './package.json'
import esbuild from './.cache/index.js'

export default [
  {
    external: [
      'fs',
      'path',
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies)
    ],
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        generatedCode: 'es2015',
        exports: 'auto'
      },
      {
        file: pkg.module,
        format: 'es'
      }
    ],
    plugins: [
      esbuild([
        {
          loader: 'ts'
        },
        {
          output: true,
          target: 'node10'
        }
      ])
    ]
  },
  {
    input: '.cache/index.d.ts',
    output: {
      file: pkg.types,
      format: 'es'
    },
    plugins: [dts()]
  }
]
