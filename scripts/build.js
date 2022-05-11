#!/usr/bin/env node
'use strict'

const { buildSync } = require('esbuild')
const { dependencies, peerDependencies } = require('../package.json')

buildSync({
  bundle: true,
  entryPoints: ['src/index.ts'],
  external: [...Object.keys(dependencies), ...Object.keys(peerDependencies)],
  format: 'esm',
  logLevel: 'info',
  outfile: '.cache/index.js',
  platform: 'node',
  target: 'node14'
})
