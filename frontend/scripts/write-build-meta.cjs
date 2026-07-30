#!/usr/bin/env node
'use strict'

const { mkdirSync, writeFileSync } = require('node:fs')
const { basename, dirname } = require('node:path')

const expectedKeys = [
  'gitSha',
  'gitBranch',
  'gitDirty',
  'workspaceFingerprint',
  'builtAt',
  'composeProject'
]

function fail(message) {
  process.stderr.write(`build metadata: ${message}\n`)
  process.exit(1)
}

function isUtcTimestamp(value) {
  if (typeof value !== 'string' || !value.endsWith('Z')) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && value === parsed.toISOString().replace('.000Z', 'Z')
}

function isValidMetadata(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  if (Object.keys(value).length !== expectedKeys.length) return false
  if (!expectedKeys.every(key => Object.hasOwn(value, key))) return false
  return (
    typeof value.gitSha === 'string' && /^[0-9a-f]{40}$/.test(value.gitSha) &&
    typeof value.gitBranch === 'string' && value.gitBranch.length > 0 &&
    typeof value.gitDirty === 'boolean' &&
    typeof value.workspaceFingerprint === 'string' && /^[0-9a-f]{64}$/.test(value.workspaceFingerprint) &&
    isUtcTimestamp(value.builtAt) &&
    value.composeProject === 'writer-ready-fixture'
  )
}

function decodeCanonicalBase64(value) {
  if (typeof value !== 'string' || value.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    fail('invalid Base64 input')
  }
  const decoded = Buffer.from(value, 'base64')
  if (decoded.length === 0 || decoded.toString('base64') !== value) fail('invalid Base64 input')
  return decoded
}

const [encoded, outputPath] = process.argv.slice(2)
if (process.argv.length !== 4) fail('expected Base64 JSON and output path')
if (basename(outputPath) !== 'build-meta.json') fail('invalid output location')

let metadata
try {
  metadata = JSON.parse(decodeCanonicalBase64(encoded).toString('utf8'))
} catch (error) {
  fail('invalid JSON input')
}
if (!isValidMetadata(metadata)) fail('invalid metadata schema')

try {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(metadata)}\n`, { encoding: 'utf8', mode: 0o644 })
} catch (error) {
  fail('cannot write output file')
}
