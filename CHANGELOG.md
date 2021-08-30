# Changelog

## [1.1.1](https://github.com/exuanbo/rollup-plugin-esbuild-transform/compare/v1.1.0...v1.1.1) (2021-08-26)

### Bug Fixes

- In the previous versions `resolveId()` hook uses `path.sep` to check whether the argument is an absolute path, which will not work as expected if used on Windows and the path starts with posix path separator.

## [1.1.0](https://github.com/exuanbo/rollup-plugin-esbuild-transform/compare/v1.0.0...v1.1.0) (2021-08-25)

### BREAKING CHANGES

- From this version the plugin will not transform the file multiple times if more than one pattern is matched, but will merge the options. See [`include`](https://github.com/exuanbo/rollup-plugin-esbuild-transform#include) for more details.

### Bug Fixes

- Extensions `.cjs` and `.mjs` are not resolved by default
