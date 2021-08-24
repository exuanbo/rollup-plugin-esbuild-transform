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
  const pluginOptions = Array.isArray(options) ? options : [options]

  const loaders = new Set(pluginOptions.map(({ loader }) => loader))
  const scriptLoaders = SCRIPT_LOADERS.filter(loader => loaders.has(loader))

  const filters = pluginOptions.map(({ include, exclude, loader }) => {
    const loaderExtensionRegExp = new RegExp(`\\.${loader}$`)
    return createFilter(include ?? loaderExtensionRegExp, exclude ?? DEFAULT_EXCLUDE_REGEXP)
  })

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
      const [transformResult, isTransformed] = await pluginOptions.reduce<
        Promise<[TransformResult, boolean]>
      >(async (result, pluginOption, index) => {
        if (!filters[index](id)) {
          return await result
        }
        const [{ code: prevCode, map }] = await result
        const { include, exclude, ...transformOptions } = pluginOption
        const {
          code: transformedCode,
          map: newMap,
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
        return [
          {
            code: transformedCode,
            map: newMap === '' ? null : map === null ? newMap : await merge(map, newMap)
          },
          true
        ]
      }, Promise.resolve([{ code, map: null }, false]))
      return isTransformed ? transformResult : null
    }
  }
}

export default esbuildTransform
