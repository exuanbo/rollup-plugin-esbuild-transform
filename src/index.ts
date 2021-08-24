import fs from 'fs'
import path from 'path'
import { Loader, TransformOptions, transform, formatMessages } from 'esbuild'
import { FilterPattern, createFilter } from '@rollup/pluginutils'
import type { RawSourceMap } from 'source-map'
import type { Plugin } from 'rollup'
import { merge } from './mergeSourceMap'

export interface Options extends TransformOptions {
  loader: Loader
  include?: FilterPattern
  exclude?: FilterPattern
}

interface TransformResult {
  code: string
  map: string | RawSourceMap | null
}

const SCRIPT_LOADERS = ['ts', 'tsx', 'js', 'jsx'] as const

const DEFAULT_EXCLUDE_REGEXP = /node_modules/
const VALID_PATH_REGEXP = new RegExp(`^[.\\${path.sep}]`)

const getExtensionRegExp = (loader: Loader): RegExp => new RegExp(`\\.${loader}$`)

const resolveFilename = (
  resolved: string,
  loaders: Iterable<Loader>,
  isIndex = false
): string | null => {
  for (const loader of loaders) {
    const resolvedFilename = `${path.join(resolved, isIndex ? 'index' : '')}.${loader}`
    if (fs.existsSync(resolvedFilename)) {
      return resolvedFilename
    }
  }
  return null
}

function esbuildTransform(options: Options): Plugin
function esbuildTransform(options: Options[]): Plugin
function esbuildTransform(options: Options | Options[]): Plugin

function esbuildTransform(options: Options | Options[]): Plugin {
  const _options = Array.isArray(options) ? options : [options]

  const transformOptionsArr = _options.map(
    ({ include, exclude, ...transformOptions }) => transformOptions
  )

  const loaders = new Set(_options.map(({ loader }) => loader))
  const scriptLoaders = SCRIPT_LOADERS.filter(loader => loaders.has(loader))

  const filters = _options.map(({ include, exclude, loader }) =>
    createFilter(include ?? getExtensionRegExp(loader), exclude ?? DEFAULT_EXCLUDE_REGEXP)
  )

  return {
    name: 'esbuild-transform',

    async resolveId(source, importer) {
      if (importer !== undefined && VALID_PATH_REGEXP.test(source)) {
        const resolved = path.resolve(path.dirname(importer), source)
        if (fs.existsSync(resolved)) {
          if (!fs.statSync(resolved).isDirectory()) {
            return resolved
          }
          return resolveFilename(resolved, scriptLoaders, /* index: */ true)
        }
        return resolveFilename(resolved, loaders)
      }
      return null
    },

    async transform(code, id) {
      const matched = transformOptionsArr.filter((_, index) => filters[index](id))
      return matched.length > 0
        ? await matched.reduce<Promise<TransformResult>>(async (result, transformOptions) => {
            const { code: prevCode, map: prevMap } = await result
            const {
              code: transformedCode,
              map,
              warnings
            } = await transform(prevCode, {
              format: transformOptions.loader === 'json' ? 'esm' : undefined,
              sourcefile: id,
              sourcemap: true,
              ...transformOptions
            })
            if (warnings.length > 0) {
              const messages = await formatMessages(warnings, {
                kind: 'warning',
                color: true
              })
              messages.forEach(message => this.warn(message))
            }
            return {
              code: transformedCode,
              map: map === '' ? null : prevMap === null ? map : await merge(prevMap, map)
            }
          }, Promise.resolve({ code, map: null }))
        : null
    }
  }
}

export default esbuildTransform
