#!/usr/bin/env node
/**
 * Raises the patch number of the version, in package.json and in the two copies
 * npm keeps at the head of package-lock.json.
 *
 * Called by .githooks/pre-commit, so every commit carries a version of its own
 * and a deployment can be told apart from the one before it.
 *
 * The edit is textual on purpose: rewriting a parsed 260 kB lockfile would put
 * its whole formatting in the diff, for two numbers.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const manifestPath = fileURLToPath(new URL('package.json', root))
const lockPath = fileURLToPath(new URL('package-lock.json', root))

const manifest = readFileSync(manifestPath, 'utf8')
const found = manifest.match(/"version":\s*"(\d+)\.(\d+)\.(\d+)"/)
if (!found) {
  console.error('bump-patch: no "version": "a.b.c" found in package.json')
  process.exit(1)
}

const [line, major, minor, patch] = found
const previous = `${major}.${minor}.${patch}`
const next = `${major}.${minor}.${Number(patch) + 1}`

writeFileSync(manifestPath, manifest.replace(line, `"version": "${next}"`))

// The lockfile repeats the version twice, at the top and under packages[""].
// Both sit in its first lines; further down are the dependencies, untouched.
try {
  const lock = readFileSync(lockPath, 'utf8')
  let done = 0
  writeFileSync(
    lockPath,
    lock.replace(new RegExp(`"version":\\s*"${previous}"`, 'g'), (match) =>
      (done += 1) <= 2 ? `"version": "${next}"` : match,
    ),
  )
} catch (cause) {
  if (cause.code !== 'ENOENT') throw cause
}

console.log(`version ${previous} → ${next}`)
