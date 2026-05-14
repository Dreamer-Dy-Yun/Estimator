import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import process from 'node:process'

const ROOTS = ['src', '../MD', '../AGENTS.md']
const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.md', '.json', '.html', '.yml', '.yaml'])
const IGNORED_DIRS = new Set(['dist', 'node_modules'])

function collectFiles(dir, out = []) {
  if (!statSync(dir).isDirectory()) return TEXT_EXTS.has(extname(dir)) ? [...out, dir] : out

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) collectFiles(join(dir, entry.name), out)
      continue
    }
    if (TEXT_EXTS.has(extname(entry.name))) out.push(join(dir, entry.name))
  }
  return out
}

function hasMojibakeMarker(line) {
  const chars = [...line]
  for (let i = 0; i < chars.length; i += 1) {
    const cp = chars[i].codePointAt(0)
    if (cp === 0xfffd) return true
    if (cp >= 0x4e00 && cp <= 0x9fff) return true
    if (chars[i] === '?' && chars[i + 1]) {
      const next = chars[i + 1].codePointAt(0)
      if (next >= 0xac00 && next <= 0xd7af) return true
    }
  }
  return false
}

const findings = []

for (const root of ROOTS) {
  for (const file of collectFiles(root)) {
    readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      if (hasMojibakeMarker(line)) findings.push(`${file}:${index + 1}: ${line}`)
    })
  }
}

if (findings.length) {
  console.error('Possible Korean mojibake found:')
  console.error(findings.join('\n'))
  process.exit(1)
}

console.log('Korean encoding check passed.')
