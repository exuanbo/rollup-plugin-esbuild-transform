#!/usr/bin/env node
'use strict'

const { build } = require('esbuild')
const pkg = require('../package.json')

;(async () => {
  await build({
    bundle: true,
    color: true,
    entryPoints: ['src/index.ts'],
    external: [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)],
    format: 'esm',
    logLevel: 'info',
    outfile: '.cache/index.js',
    platform: 'node',
    write: true
  })
})()
