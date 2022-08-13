# Changelog

## [1.5.0](https://github.com/exuanbo/rollup-plugin-esbuild-transform/compare/v1.4.1...v1.5.0) (2022-08-13)

### Features

- Support TypeScript 4.7 `"module": "Node16"` resolution.

### Bug Fixes

- In `renderChunk` hook, the default `sourcemap` option provided to esbuild `transform` function was set following the same Rollup output option, which does not make sense. It should by default always be `true` according to <https://rollupjs.org/guide/en/#source-code-transformations>.

## [1.4.1](https://github.com/exuanbo/rollup-plugin-esbuild-transform/compare/v1.4.0...v1.4.1) (2022-07-17)

### Bug Fixes

- Loader `default` was not handled correctly.

## [1.4.0](https://github.com/exuanbo/rollup-plugin-esbuild-transform/compare/v1.3.2...v1.4.0) (2022-05-16)

### Features

- Add `Options.tsconfig` to specify `tsconfig.json` file. It will not be used if `tsconfigRaw` is provided.
- Export extended `TransformOptions`.

## [1.3.2](https://github.com/exuanbo/rollup-plugin-esbuild-transform/compare/v1.3.1...v1.3.2) (2021-11-27)

### Bug Fixes

- Import of TypeScript files with extension `cts` and `mts` could not be resolved.

## [1.3.1](https://github.com/exuanbo/rollup-plugin-esbuild-transform/compare/v1.3.0...v1.3.1) (2021-11-26)

### Chores

- Add JSDoc to interface `Options`.

### Code Refactoring

- Replace regex with `path.isAbsolute()` when testing path.
- Remove unnecessary overload function signatures.

## [1.3.0](https://github.com/exuanbo/rollup-plugin-esbuild-transform/compare/v1.2.0...v1.3.0) (2021-11-20)

### Bug Fixes

- Absolute path import on Windows such as `C:\foo` could not be resolved.

### Features

- Parameter `options` is now optional and `Options.loader` is not required anymore.
- Add `Options.output` for indicating whether this transformation should be performed after the chunk (bundle) has been rendered.

## [1.2.0](https://github.com/exuanbo/rollup-plugin-esbuild-transform/compare/v1.1.1...v1.2.0) (2021-11-06)

### Features

- Support resolve TypeScript files with extension `cts` and `mts` (requires esbuild >= 0.13.4).

## [1.1.1](https://github.com/exuanbo/rollup-plugin-esbuild-transform/compare/v1.1.0...v1.1.1) (2021-08-26)

### Bug Fixes

- In the previous versions `resolveId()` hook uses `path.sep` to check whether the argument is an absolute path, which will not work as expected if used on Windows and the path starts with posix path separator.

## [1.1.0](https://github.com/exuanbo/rollup-plugin-esbuild-transform/compare/v1.0.0...v1.1.0) (2021-08-25)

### BREAKING CHANGES

- From this version the plugin will not transform the file multiple times if more than one pattern is matched, but will merge the options. See [`include`](https://github.com/exuanbo/rollup-plugin-esbuild-transform#include) for more details.

### Bug Fixes

- Extensions `.cjs` and `.mjs` are not resolved by default
