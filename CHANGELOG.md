# Changelog

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
