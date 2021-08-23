import { SourceMapConsumer, SourceMapGenerator, RawSourceMap } from 'source-map'

export const merge = async (map: string | RawSourceMap, newMap: string): Promise<RawSourceMap> => {
  const rawMap: RawSourceMap = typeof map === 'string' ? JSON.parse(map) : map
  const newRawMap: RawSourceMap = JSON.parse(newMap)

  const mapConsumer = await new SourceMapConsumer(rawMap)
  const newMapConsumer = await new SourceMapConsumer(newRawMap)

  const mergedMapGenerator = new SourceMapGenerator({
    // file: oldRawMap.file,
    sourceRoot: rawMap.sourceRoot
  })

  mapConsumer.sources.forEach(source => {
    const sourceContent = mapConsumer.sourceContentFor(source)!
    mergedMapGenerator.setSourceContent(source, sourceContent)
  })

  newMapConsumer.eachMapping(({ generatedLine, generatedColumn, originalLine, originalColumn }) => {
    const originalPosition = mapConsumer.originalPositionFor({
      line: originalLine,
      column: originalColumn
    })

    if (originalPosition.source === null) {
      return
    }

    mergedMapGenerator.addMapping({
      generated: {
        line: generatedLine,
        column: generatedColumn
      },
      original: {
        line: originalPosition.line!,
        column: originalPosition.column!
      },
      source: originalPosition.source
      // name: originalPosition.name!
    })
  })

  return mergedMapGenerator.toJSON()
}
