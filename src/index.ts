import { promises as fs } from 'fs'
import { dirname, join, resolve } from 'path'
import { Loader, TransformOptions, Message, transform, formatMessages } from 'esbuild'
import { FilterPattern, createFilter } from '@rollup/pluginutils'
import type { Plugin, PluginContext } from 'rollup'

export interface Options extends TransformOptions {
  output?: boolean
  include?: FilterPattern
  exclude?: FilterPattern
}

type CommonOptions = Omit<Options, 'output'>

const SCRIPT_LOADERS = ['js', 'jsx', 'ts', 'tsx'] as const

const DEFAULT_EXCLUDE_REGEXP = /node_modules/
const ABSOLUTE_PATH_REGEXP = /^(?:\/|(?:[a-zA-Z]:)?[\\|/])/

const splitOptionsByType = (
  options: Options[]
): [inputOptions: CommonOptions[], outputOptions: CommonOptions[]] =>
  options.reduce<ReturnType<typeof splitOptionsByType>>(
    ([inputOptions, outputOptions], { output, ...commonOptions }) => {
      ;(output ?? false ? outputOptions : inputOptions).push(commonOptions)
      return [inputOptions, outputOptions]
    },
    [[], []]
  )

const getExtensionRegExp = (loader: Loader): RegExp =>
  new RegExp(
    `\\.${loader === 'js' || loader === 'ts' ? `(?:${loader}|c${loader}|m${loader})` : loader}$`
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

const getTransformOptions = (
  allTransformOptions: TransformOptions[],
  filters: Array<(id: unknown) => boolean>,
  id: string
): TransformOptions | null =>
  allTransformOptions.reduce<ReturnType<typeof getTransformOptions>>(
    (result, transformOptions, index) => {
      if (!filters[index](id)) {
        return result
      }
      if (result === null) {
        return transformOptions
      }
      const { loader, ...loaderOmitted } = transformOptions
      return { ...result, ...loaderOmitted }
    },
    null
  )

interface TransformResult {
  code: string
  map: string | undefined
}

const handleTransformResult = async (
  pluginContext: PluginContext,
  transformedCode: string,
  map: string,
  warnings: Message[]
): Promise<TransformResult> => {
  if (warnings.length > 0) {
    const messages = await formatMessages(warnings, {
      kind: 'warning',
      color: true
    })
    messages.forEach(message => {
      pluginContext.warn(message)
    })
  }
  return {
    code: transformedCode,
    map: map === '' ? undefined : map
  }
}

function esbuildTransform(options?: Options): Plugin
function esbuildTransform(options?: Options[]): Plugin
function esbuildTransform(options?: Options | Options[]): Plugin

function esbuildTransform(options: Options | Options[] = {}): Plugin {
  const [inputOptions, outputOptions] = splitOptionsByType(
    Array.isArray(options) ? options : [options]
  )

  const loaders = new Set(inputOptions.map(({ loader }) => loader ?? 'js'))
  const scriptLoaders = SCRIPT_LOADERS.filter(loader => loaders.has(loader))

  const [inputTransformOptions, outputTransformOptions] = [inputOptions, outputOptions].map(
    _options => _options.map(({ include, exclude, ...transformOptions }) => transformOptions)
  )

  const inputFilters = inputOptions.map(({ include, exclude, loader }) =>
    createFilter(include ?? getExtensionRegExp(loader ?? 'js'), exclude ?? DEFAULT_EXCLUDE_REGEXP)
  )
  const outputFilters = outputOptions.map(({ include, exclude }) => createFilter(include, exclude))

  return {
    name: 'esbuild-transform',

    async resolveId(source, importer) {
      if (
        importer === undefined ||
        (!ABSOLUTE_PATH_REGEXP.test(source) && !source.startsWith('.'))
      ) {
        return null
      }
      const resolved = resolve(dirname(importer), source)
      try {
        const resolvedStats = await fs.stat(resolved)
        if (resolvedStats.isDirectory()) {
          return await resolveFilename(join(resolved, 'index'), scriptLoaders)
        }
        return resolved
      } catch {
        return await resolveFilename(resolved, loaders)
      }
    },

    async transform(code, id) {
      const transformOptions = getTransformOptions(inputTransformOptions, inputFilters, id)
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
        treeShaking: true,
        ...transformOptions
      })
      return await handleTransformResult(this, transformedCode, map, warnings)
    },

    async renderChunk(code, { fileName }, rollupOutputOptions) {
      const transformOptions = getTransformOptions(outputTransformOptions, outputFilters, fileName)
      if (transformOptions === null) {
        return null
      }
      const {
        code: transformedCode,
        map,
        warnings
      } = await transform(code, {
        sourcefile: fileName,
        sourcemap: rollupOutputOptions.sourcemap !== false,
        ...transformOptions
      })
      return await handleTransformResult(this, transformedCode, map, warnings)
    }
  }
}

export default esbuildTransform
