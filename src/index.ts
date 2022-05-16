import { promises as fs } from 'fs'
import { dirname, isAbsolute, join, resolve } from 'path'
import {
  Loader,
  TransformOptions as EsbuildTransformOptions,
  TransformResult,
  transform,
  formatMessages
} from 'esbuild'
import { FilterPattern, createFilter } from '@rollup/pluginutils'
import type { SourceMapInput, Plugin, PluginContext } from 'rollup'

const SCRIPT_LOADERS: readonly Loader[] = ['js', 'jsx', 'ts', 'tsx']

const DEFAULT_EXCLUDE_REGEXP = /node_modules/

export interface TransformOptions extends EsbuildTransformOptions {
  /**
   * Path to `tsconfig.json` file relative to `process.cwd()`.
   *
   * It will not be used if `tsconfigRaw` is provided.
   *
   * @see <https://esbuild.github.io/content-types/#tsconfig-json>
   */
  tsconfig?: string
}

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
): [inputOptions: CommonOptions[], outputOptions: CommonOptions[]] => {
  const inputOptions: CommonOptions[] = []
  const outputOptions: CommonOptions[] = []
  options.forEach(({ output = false, ...commonOptions }) => {
    ;(output ? outputOptions : inputOptions).push(commonOptions)
  })
  return [inputOptions, outputOptions]
}

type Extension = Loader | `${'c' | 'm'}${'js' | 'ts'}`

const getExtensions = (loaders: Loader[]): Extension[] => {
  const extensions: Extension[] = []
  loaders.forEach(loader => {
    if (loader === 'js' || loader === 'ts') {
      extensions.push(loader, `c${loader}`, `m${loader}`)
    } else {
      extensions.push(loader)
    }
  })
  return extensions
}

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

type Filter = ReturnType<typeof createFilter>

const getTransformOptions = async (
  transformOptions: TransformOptions[],
  filters: Filter[],
  id: string
): Promise<EsbuildTransformOptions | null> => {
  let resultTransformOptions: EsbuildTransformOptions | null = null
  for (let index = 0; index < transformOptions.length; index++) {
    if (!filters[index](id)) {
      continue
    }
    const { loader, tsconfig, ...restTransformOptions } = transformOptions[index]
    const { tsconfigRaw } = restTransformOptions
    if (
      (loader === 'ts' || loader === 'tsx') &&
      tsconfigRaw === undefined &&
      tsconfig !== undefined
    ) {
      const tsconfigPath = resolve(process.cwd(), tsconfig)
      restTransformOptions.tsconfigRaw = await fs.readFile(tsconfigPath, 'utf8')
    }
    if (resultTransformOptions === null) {
      resultTransformOptions = { loader, ...restTransformOptions }
    } else {
      Object.assign(resultTransformOptions, restTransformOptions)
    }
  }
  return resultTransformOptions
}

interface HookReturn {
  code: string
  map?: SourceMapInput
}

const handleTransformResult = async (
  pluginContext: PluginContext,
  { code, map, warnings }: TransformResult
): Promise<HookReturn> => {
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
    code,
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
      const transformOptions = await getTransformOptions(inputTransformOptions, inputFilters, id)
      if (transformOptions === null) {
        return null
      }
      const transformResult = await transform(code, {
        format: transformOptions.loader === 'json' ? 'esm' : undefined,
        sourcefile: id,
        sourcemap: true,
        ...transformOptions
      })
      return await handleTransformResult(this, transformResult)
    },

    async renderChunk(code, { fileName: id }, _options) {
      const transformOptions = await getTransformOptions(outputTransformOptions, outputFilters, id)
      if (transformOptions === null) {
        return null
      }
      const transformResult = await transform(code, {
        sourcefile: id,
        sourcemap: _options.sourcemap !== false,
        ...transformOptions
      })
      return await handleTransformResult(this, transformResult)
    }
  }
}

export default esbuildTransform
