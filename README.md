# rollup-plugin-esbuild-transform

> Use [`esbuild`](https://esbuild.github.io/api/#transform-api) with Rollup to transform any supported content types.

[![npm](https://img.shields.io/npm/v/rollup-plugin-esbuild-transform.svg)](https://www.npmjs.com/package/rollup-plugin-esbuild-transform)
[![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/exuanbo/rollup-plugin-esbuild-transform/Node.js%20CI/main.svg)](https://github.com/exuanbo/rollup-plugin-esbuild-transform/actions?query=workflow)
[![Codecov branch](https://img.shields.io/codecov/c/gh/exuanbo/rollup-plugin-esbuild-transform/main.svg?token=hyLDj7tMfT)](https://app.codecov.io/gh/exuanbo/rollup-plugin-esbuild-transform/)
[![libera manifesto](https://img.shields.io/badge/libera-manifesto-lightgrey.svg)](https://liberamanifesto.com)

## Why

[`esbuild`](https://esbuild.github.io/api/#build-api) as a bundler has some problems such as [#475](https://github.com/evanw/esbuild/issues/475) which has still not been fixed since last year.

[`rollup-plugin-esbuild`](https://github.com/egoist/rollup-plugin-esbuild) is great but there is no simpler way to use multiple `loader` with different options, and for some reason it does not provide all available options from [esbuild transform API](https://esbuild.github.io/api/#transform-api).

## Install

```sh
npm install -D esbuild rollup-plugin-esbuild-transform
```

## Example

```js
// rollup.config.js

import { join } from 'path'
import esbuild from 'rollup-plugin-esbuild-transform'

export default {
  // ...
  plugins: [
    esbuild([
      {
        loader: 'json'
      },
      {
        loader: 'tsx',
        banner: "import React from 'react'"
      },
      {
        loader: 'ts',
        include: /\.tsx?$/,
        tsconfig: join(__dirname, 'tsconfig.json')
      },
      {
        output: true,
        minify: true,
        target: 'es2015'
      }
    ])
  ]
}
```

## Options

```ts
// index.d.ts

import { TransformOptions as EsbuildTransformOptions } from 'esbuild'
import { FilterPattern } from '@rollup/pluginutils'
import { Plugin } from 'rollup'

export interface TransformOptions extends EsbuildTransformOptions {
  tsconfig?: string
}

export interface Options extends TransformOptions {
  output?: boolean
  include?: FilterPattern
  exclude?: FilterPattern
}

declare function esbuildTransform(options?: Options | Options[]): Plugin
export default esbuildTransform
```

This plugin uses the same options from [esbuild transform API](https://esbuild.github.io/api/#transform-api).

`tsconfig` is the path to `tsconfig.json` file relative to `process.cwd()`. It will not be used if `tsconfigRaw` is provided.

`output` is for indicating whether this transformation should be performed after the chunk (bundle) has been rendered.

`include` and `exclude` are [`picomatch`](https://github.com/micromatch/picomatch#globbing-features) patterns. They can be `string | RegExp | Array<string | RegExp>`. When supplied they will override the default values.

If `output: true`, then the options `include` and `exclude` will be applied to the chunk's filename from `RollupOptions.output.file`.

### `include`

Default to <code>new RegExp(\`\\\\.\${loader}\$\`)</code> (supports `.cjs`, `.mjs`, `.cts`, `.mts`), or `undefined` (match any filename) if `output: true`.

If a file is matched by more than one pattern (as the example below), the options other than `loader` will be ***shallowly*** merged into and possibly override the previous ones.

```js
// options
[
  {
    loader: 'tsx',
    banner: "import React from 'react'"
  },
  {
    loader: 'ts',
    include: /\.tsx?$/,
    tsconfig: join(__dirname, 'tsconfig.json')
  }
]

// the final transform options for `index.tsx` will become
{
  loader: 'tsx',
  banner: "import React from 'react'",
  tsconfig: join(__dirname, 'tsconfig.json')
}
```

### `exclude`

Default to `/node_modules/`, or `undefined` if `output: true`.

It takes priority over `include`.

### Other default options

```js
// output: false | undefined
{
  format: options.loader === 'json' ? 'esm' : undefined,
  sourcefile: id, // the resolved file path
  sourcemap: true,
  ...options
}

// output: true
{
  sourcefile: chunk.fileName,
  sourcemap: rollupOutputOptions.sourcemap !== false,
  ...options
}
```

## License

[MIT License](https://github.com/exuanbo/rollup-plugin-esbuild-transform/blob/main/LICENSE) © 2021 [Exuanbo](https://github.com/exuanbo)
