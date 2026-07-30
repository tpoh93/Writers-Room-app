const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')
const test = require('node:test')

const frontendRoot = resolve(__dirname, '../..')
const writer = join(frontendRoot, 'scripts/write-build-meta.cjs')

const validMetadata = {
  gitSha: 'a'.repeat(40),
  gitBranch: 'feature/writer-ready-01-acceptance',
  gitDirty: false,
  workspaceFingerprint: 'b'.repeat(64),
  builtAt: '2026-07-30T12:34:56Z',
  composeProject: 'writer-ready-fixture'
}

function base64(value = validMetadata) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64')
}

function run(value, output) {
  return spawnSync(process.execPath, [writer, value, output], { encoding: 'utf8' })
}

test('writes compact validated metadata with mode 0644', () => {
  const directory = mkdtempSync(join(tmpdir(), 'novelforge-meta-'))
  try {
    const output = join(directory, 'build-meta.json')
    const result = run(base64(), output)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(readFileSync(output, 'utf8'), `${JSON.stringify(validMetadata)}\n`)
    assert.equal(statSync(output).mode & 0o777, 0o644)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

for (const [name, mutate] of [
  ['a seventh key', value => ({ ...value, extra: true })],
  ['a short git SHA', value => ({ ...value, gitSha: 'a'.repeat(39) })],
  ['a string dirty flag', value => ({ ...value, gitDirty: 'false' })],
  ['a short fingerprint', value => ({ ...value, workspaceFingerprint: 'b'.repeat(63) })],
  ['a non-UTC timestamp', value => ({ ...value, builtAt: '2026-07-30T12:34:56+01:00' })],
  ['a non-fixture project', value => ({ ...value, composeProject: 'writers-room' })]
]) {
  test(`rejects ${name}`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'novelforge-meta-'))
    try {
      const result = run(base64(mutate(validMetadata)), join(directory, 'build-meta.json'))
      assert.notEqual(result.status, 0)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
}

test('rejects malformed Base64', () => {
  const directory = mkdtempSync(join(tmpdir(), 'novelforge-meta-'))
  try {
    assert.notEqual(run('not base64!', join(directory, 'build-meta.json')).status, 0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('rejects an output whose parent cannot be created', () => {
  const directory = mkdtempSync(join(tmpdir(), 'novelforge-meta-'))
  try {
    const blockingFile = join(directory, 'not-a-directory')
    writeFileSync(blockingFile, 'blocked')
    assert.notEqual(run(base64(), join(blockingFile, 'build-meta.json')).status, 0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('Dockerfile only invokes the writer for a nonempty argument', () => {
  const dockerfile = readFileSync(join(frontendRoot, 'Dockerfile.web'), 'utf8')
  assert.match(dockerfile, /if \[ -n "\$NOVELFORGE_BUILD_META_B64" \]; then[\s\\]+node scripts\/write-build-meta\.cjs/)
})
