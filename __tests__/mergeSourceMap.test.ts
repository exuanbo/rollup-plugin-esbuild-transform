import fs from 'fs'
import path from 'path'
import { transform } from 'esbuild'
import { merge } from '../src/mergeSourceMap'
import validate from 'sourcemap-validator'

const CODE = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf-8')

it('should merge correctly', async () => {
  const { code: compiledCode, map: compiledMap } = await transform(CODE, {
    loader: 'ts',
    sourcefile: 'index.ts',
    sourcemap: true,
    target: 'es2017'
  })

  const { code: minifiedCode, map: minifiedMap } = await transform(compiledCode, {
    loader: 'js',
    minify: true,
    sourcefile: 'index.ts',
    sourcemap: true
  })

  const mergedMap = JSON.stringify(await merge(compiledMap, minifiedMap))

  expect(() => {
    validate(minifiedCode, mergedMap)
  }).not.toThrowError()
})
