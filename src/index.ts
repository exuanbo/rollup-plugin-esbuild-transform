import { promises as fs } from 'fs'
import path from 'path'
import { Loader, TransformOptions, transform, formatMessages } from 'esbuild'
import { FilterPattern, createFilter } from '@rollup/pluginutils'
import type { Plugin } from 'rollup'

export interface Options extends TransformOptions {
  loader: Loader
  include?: FilterPattern
  exclude?: FilterPattern
}

const SCRIPT_LOADERS = ['js', 'jsx', 'ts', 'tsx'] as const

const DEFAULT_EXCLUDE_REGEXP = /node_modules/
const VALID_PATH_REGEXP = /^[./\\]/
const SCRIPT_LOADER_REGEXP = /^[jt]s$/

const getExtensionRegExp = (loader: Loader): RegExp =>
  new RegExp(
    `\\.${SCRIPT_LOADER_REGEXP.test(loader) ? `(?:${loader}|c${loader}|m${loader})` : loader}$`
  )

const resolveFilename = async (
  resolved: string,
  loaders: Iterable<Loader>
): Promise<string | null> => {
  for (const loader of loaders) {
    const resolvedFilename = `${resolved}.${loader}`
    try {
      await fs.access(resolvedFilename)
      return resolvedFilename
    } catch {}
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
        try {
          const resolvedStats = await fs.stat(resolved)
          if (resolvedStats.isDirectory()) {
            return await resolveFilename(path.join(resolved, 'index'), scriptLoaders)
          }
          return resolved
        } catch {
          return await resolveFilename(resolved, loaders)
        }
      }
      return null
    },

    async transform(code, id) {
      const transformOptions = transformOptionsArr.reduce<TransformOptions | null>(
        (result, transformOptions, index) => {
          if (!filters[index](id)) {
            return result
          }
          if (result === null) {
            return transformOptions
          }
          const { loader, ...loaderOmitted } = transformOptions
          return Object.assign(result, loaderOmitted)
        },
        null
      )
      if (transformOptions === null) {
        return null
      }
      const {
        code: transformedCode,
        map,
        warnings
      } = await transform(code, {
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
        messages.forEach(message => {
          this.warn(message)
        })
      }
      return {
        code: transformedCode,
        map: map === '' ? null : map
      }
    }
  }
}

export default esbuildTransform
