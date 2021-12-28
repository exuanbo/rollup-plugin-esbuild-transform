import { promises as fs } from 'fs'
import { dirname, isAbsolute, join, resolve } from 'path'
import { Loader, TransformOptions, Message, transform, formatMessages } from 'esbuild'
import { FilterPattern, createFilter } from '@rollup/pluginutils'
import type { Plugin, PluginContext } from 'rollup'

const SCRIPT_LOADERS: readonly Loader[] = ['js', 'jsx', 'ts', 'tsx']

const DEFAULT_EXCLUDE_REGEXP = /node_modules/

export interface Options extends TransformOptions {
  /**
   * Whether this transformation should be performed after the chunk (bundle) has been rendered.
   *
   * If `true`, then the options `include` and `exclude` will be applied to the chunk's filename from `RollupOptions.output.file`.
   */
  output?: boolean
  /**
   * A valid [`picomatch`](https://github.com/micromatch/picomatch#globbing-features) glob pattern, or array of patterns.
   *
   * @see <https://github.com/exuanbo/rollup-plugin-esbuild-transform#include>
   */
  include?: FilterPattern
  /**
   * A valid [`picomatch`](https://github.com/micromatch/picomatch#globbing-features) glob pattern, or array of patterns.
   *
   * @see <https://github.com/exuanbo/rollup-plugin-esbuild-transform#exclude>
   */
  exclude?: FilterPattern
}

type CommonOptions = Omit<Options, 'output'>

const splitOptionsByType = (
  options: Options[]
): [inputOptions: CommonOptions[], outputOptions: CommonOptions[]] =>
  options.reduce<ReturnType<typeof splitOptionsByType>>(
    ([inputOptions, outputOptions], { output = false, ...commonOptions }) => {
      ;(output ? outputOptions : inputOptions).push(commonOptions)
      return [inputOptions, outputOptions]
    },
    [[], []]
  )

type Extension = Loader | `${'c' | 'm'}${'js' | 'ts'}`

const getExtensions = (loaders: Loader[]): Extension[] =>
  loaders.reduce<Extension[]>((extensions, loader) => {
    extensions.push(
      ...(loader === 'js' || loader === 'ts'
        ? ([loader, `c${loader}`, `m${loader}`] as const)
        : [loader])
    )
    return extensions
  }, [])

const getExtensionRegExp = (loader: Loader): RegExp =>
  new RegExp(
    `\\.${loader === 'js' || loader === 'ts' ? `(?:${loader}|c${loader}|m${loader})` : loader}$`
  )

const resolveFilename = async (
  basename: string,
  extensions: Extension[]
): Promise<string | null> => {
  for (const extension of extensions) {
    const possibleFilename = `${basename}.${extension}`
    try {
      await fs.access(possibleFilename)
      return possibleFilename
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

function esbuildTransform(options: Options | Options[] = {}): Plugin {
  const [inputOptions, outputOptions] = splitOptionsByType(
    Array.isArray(options) ? options : [options]
  )

  const loaders = [...new Set(inputOptions.map(({ loader = 'js' }) => loader))]
  const extensions = getExtensions(loaders)

  const scriptLoaders = loaders.filter(loader => SCRIPT_LOADERS.includes(loader))
  const scriptExtensions = getExtensions(scriptLoaders)

  const [inputTransformOptions, outputTransformOptions] = [inputOptions, outputOptions].map(
    _options => _options.map(({ include, exclude, ...transformOptions }) => transformOptions)
  )

  const inputFilters = inputOptions.map(
    ({ include, exclude = DEFAULT_EXCLUDE_REGEXP, loader = 'js' }) =>
      createFilter(include ?? getExtensionRegExp(loader), exclude)
  )
  const outputFilters = outputOptions.map(({ include, exclude }) => createFilter(include, exclude))

  return {
    name: 'esbuild-transform',

    async resolveId(source, importer) {
      if (importer === undefined || !(source.startsWith('.') || isAbsolute(source))) {
        return null
      }
      const filename = resolve(dirname(importer), source)
      try {
        return (await fs.stat(filename)).isDirectory()
          ? await resolveFilename(join(filename, 'index'), scriptExtensions)
          : filename
      } catch {
        return await resolveFilename(filename, extensions)
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
        ...transformOptions
      })
      return await handleTransformResult(this, transformedCode, map, warnings)
    },

    async renderChunk(code, { fileName }, _options) {
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
        sourcemap: _options.sourcemap !== false,
        ...transformOptions
      })
      return await handleTransformResult(this, transformedCode, map, warnings)
    }
  }
}

export default esbuildTransform
