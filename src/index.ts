import { promises as fs } from 'fs'
import { dirname, isAbsolute, join, resolve } from 'path'
import {
  Loader as EsbuildLoader,
  TransformOptions as EsbuildTransformOptions,
  TransformResult,
  transform,
  formatMessages
} from 'esbuild'
import { FilterPattern, createFilter } from '@rollup/pluginutils'
import type { SourceMapInput, Plugin, PluginContext } from 'rollup'

type Loader = Exclude<EsbuildLoader, 'default'>

const SCRIPT_LOADERS: readonly Loader[] = ['js', 'jsx', 'ts', 'tsx']

const DEFAULT_EXCLUDE_REGEXP = /node_modules/

export interface TransformOptions extends EsbuildTransformOptions {
  /**
   * Path to `tsconfig.json` file relative to `process.cwd()`.
   *
   * It will not be used if `tsconfigRaw` is provided.
   *
   * @default undefined
   * @see https://esbuild.github.io/content-types/#tsconfig-json
   */
  tsconfig?: string
}

export interface Options extends TransformOptions {
  /**
   * Whether this transformation should be performed after the chunk (bundle) has been rendered.
   *
   * If `true`, then the options `include` and `exclude` will be applied to the chunk's filename from `RollupOptions.output.file`.
   *
   * @default false
   */
  output?: boolean
  /**
   * A valid [`picomatch`](https://github.com/micromatch/picomatch#globbing-features) glob pattern, or array of patterns.
   *
   * @default RegExp(`\\.${loader}$`)
   * @default undefined // if `output` is `true`
   * @see https://github.com/exuanbo/rollup-plugin-esbuild-transform#include
   */
  include?: FilterPattern
  /**
   * A valid [`picomatch`](https://github.com/micromatch/picomatch#globbing-features) glob pattern, or array of patterns.
   *
   * @default /node_modules/
   * @default undefined // if `output` is `true`
   * @see https://github.com/exuanbo/rollup-plugin-esbuild-transform#exclude
   */
  exclude?: FilterPattern
}

type CommonOptions = Omit<Options, 'output'>

const splitOptionsByType = (
  options: Options | Options[]
): [inputOptions: CommonOptions[], outputOptions: CommonOptions[]] => {
  const inputOptions: CommonOptions[] = []
  const outputOptions: CommonOptions[] = []
  ;(Array.isArray(options) ? options : [options]).forEach(
    ({ output = false, ...commonOptions }) => {
      ;(output ? outputOptions : inputOptions).push(commonOptions)
    }
  )
  return [inputOptions, outputOptions]
}

const getLoaders = (options: CommonOptions[]): Loader[] => {
  const loaders = options.map(({ loader = 'js' }) => (loader === 'default' ? 'js' : loader))
  return [...new Set(loaders)]
}

type LoaderExtension = Extract<Loader, 'js' | 'jsx' | 'ts' | 'tsx' | 'css' | 'json'>

type Extension = LoaderExtension | `${'c' | 'm'}${'js' | 'ts'}`

const getExtension = (loader: Loader): Extension | Extension[] | undefined => {
  switch (loader) {
    case 'js':
    case 'ts':
      return [loader, `c${loader}`, `m${loader}`]
    case 'jsx':
    case 'tsx':
    case 'css':
    case 'json':
      return loader
  }
}

const getExtensions = (loaders: Loader[]): Extension[] => {
  const extensions: Extension[] = []
  loaders.forEach(loader => {
    const extension = getExtension(loader)
    if (extension !== undefined) {
      extensions.push(...(Array.isArray(extension) ? extension : [extension]))
    }
  })
  return extensions
}

const getTransformOptions = (options: CommonOptions[]): TransformOptions[] =>
  options.map(({ include, exclude, ...transformOptions }) => transformOptions)

const getExtensionRegExp = (extension: Extension | Extension[] | undefined): RegExp => {
  if (extension === undefined) {
    return /^$/
  } else {
    if (Array.isArray(extension)) {
      return new RegExp(`\\.(?:${extension.join('|')})$`)
    } else {
      return new RegExp(`\\.${extension}$`)
    }
  }
}

type Filter = ReturnType<typeof createFilter>

const getInputFilters = (options: CommonOptions[]): Filter[] =>
  options.map(({ include, exclude = DEFAULT_EXCLUDE_REGEXP, loader = 'js' }) => {
    const extension = getExtension(loader === 'default' ? 'js' : loader)
    return createFilter(include ?? getExtensionRegExp(extension), exclude)
  })

const getOutputFilters = (options: CommonOptions[]): Filter[] =>
  options.map(({ include, exclude }) => createFilter(include, exclude))

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

const getEsbuildTransformOptions = async (
  transformOptions: TransformOptions[],
  filters: Filter[],
  id: string
): Promise<EsbuildTransformOptions | null> => {
  let esbuildTransformOptions: EsbuildTransformOptions | null = null
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
    if (esbuildTransformOptions === null) {
      esbuildTransformOptions = { loader, ...restTransformOptions }
    } else {
      Object.assign(esbuildTransformOptions, restTransformOptions)
    }
  }
  return esbuildTransformOptions
}

type HookReturnType = Promise<{
  code: string
  map: SourceMapInput | undefined
}>

const handleTransformResult = async (
  pluginContext: PluginContext,
  { code, map, warnings }: TransformResult
): HookReturnType => {
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
  const [inputOptions, outputOptions] = splitOptionsByType(options)

  const loaders = getLoaders(inputOptions)
  const extensions = getExtensions(loaders)

  const scriptLoaders = loaders.filter(loader => SCRIPT_LOADERS.includes(loader))
  const scriptExtensions = getExtensions(scriptLoaders)

  const inputTransformOptions = getTransformOptions(inputOptions)
  const outputTransformOptions = getTransformOptions(outputOptions)

  const inputFilters = getInputFilters(inputOptions)
  const outputFilters = getOutputFilters(outputOptions)

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
      const esbuildTransformOptions = await getEsbuildTransformOptions(
        inputTransformOptions,
        inputFilters,
        id
      )
      if (esbuildTransformOptions === null) {
        return null
      }
      const transformResult = await transform(code, {
        format: esbuildTransformOptions.loader === 'json' ? 'esm' : undefined,
        sourcefile: id,
        sourcemap: true,
        ...esbuildTransformOptions
      })
      return await handleTransformResult(this, transformResult)
    },

    async renderChunk(code, chunk) {
      const esbuildTransformOptions = await getEsbuildTransformOptions(
        outputTransformOptions,
        outputFilters,
        chunk.fileName
      )
      if (esbuildTransformOptions === null) {
        return null
      }
      const transformResult = await transform(code, {
        sourcefile: chunk.fileName,
        sourcemap: true,
        ...esbuildTransformOptions
      })
      return await handleTransformResult(this, transformResult)
    }
  }
}

export default esbuildTransform
