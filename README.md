# rollup-plugin-esbuild-transform

> Use [`esbuild`](https://esbuild.github.io/api/#transform-api) with Rollup to transform any supported content types.

[![npm](https://img.shields.io/npm/v/rollup-plugin-esbuild-transform.svg)](https://www.npmjs.com/package/rollup-plugin-esbuild-transform)
[![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/exuanbo/rollup-plugin-esbuild-transform/Node.js%20CI/main.svg)](https://github.com/exuanbo/rollup-plugin-esbuild-transform/actions?query=workflow)
[![Codecov branch](https://img.shields.io/codecov/c/gh/exuanbo/rollup-plugin-esbuild-transform/main.svg?token=hyLDj7tMfT)](https://app.codecov.io/gh/exuanbo/rollup-plugin-esbuild-transform/)
[![libera manifesto](https://img.shields.io/badge/libera-manifesto-lightgrey.svg)](https://liberamanifesto.com)

## Install

```sh
npm install -D esbuild rollup-plugin-esbuild-transform
```

## Example

```js
// rollup.config.js

import esbuild from 'rollup-plugin-esbuild-transform'

export default {
  // Note: This is not an output plugin
  plugins: [
    esbuild([
      {
        loader: 'json',
        minifyWhitespace: true
      },
      {
        loader: 'tsx',
        banner: "import * as React from 'react'"
      },
      {
        loader: 'ts'
      }
    ])
  ]
}
```

## Options

```ts
// index.d.ts

import { TransformOptions } from 'esbuild'
import { FilterPattern } from '@rollup/pluginutils'
import { Plugin } from 'rollup'

interface Options extends TransformOptions {
  include?: FilterPattern
  exclude?: FilterPattern
}

declare function esbuildTransform(options?: Options): Plugin
declare function esbuildTransform(options?: Options[]): Plugin
declare function esbuildTransform(options?: Options | Options[]): Plugin

export { Options, esbuildTransform as default }
```

This plugin uses the same options from [esbuild Transform API](https://esbuild.github.io/api/#transform-api).

`include` and `exclude` are [`picomatch`](https://github.com/micromatch/picomatch#globbing-features) patterns. They can be `string | RegExp | Array<string | RegExp>`. When supplied they will override the default values.

### `include`

Default to <code>new RegExp(\`\\\\.\${loader === 'js' ? '(?:js|cjs|mjs)' : loader}\$\`)</code>

If a file is matched by more than one pattern (as the example above), the options other than `loader` will be merged using `Object.assign()`.

```js
// for index.tsx
[
  {
    loader: 'tsx',
    banner: "import * as React from 'react'"
  },
  {
    loader: 'ts',
    include: /\.tsx?$/,
    minify: true
  }
]

// the final transform options will become
{
  loader: 'tsx',
  banner: "import * as React from 'react'",
  minify: true
}
```

### `exclude`

Default to `/node_modules/`

It takes priority over `include`.

### Other default options

```js
{
  format: options.loader === 'json' ? 'esm' : undefined,
  sourcefile: id, // the resolved file path
  sourcemap: true,
  ...options
}
```

## Why

[`esbuild`](https://esbuild.github.io/api/#build-api) as a bundler has some problems such as [#475](https://github.com/evanw/esbuild/issues/475) which has still not been fixed since last year.

[`rollup-plugin-esbuild`](https://github.com/egoist/rollup-plugin-esbuild) is great but there is no simpler way to use multiple `loader` with different options, and for some reason it does not provide all available options from `esbuild.transform`.

## License

[MIT License](https://github.com/exuanbo/rollup-plugin-esbuild-transform/blob/main/LICENSE) © 2021 [Exuanbo](https://github.com/exuanbo)
