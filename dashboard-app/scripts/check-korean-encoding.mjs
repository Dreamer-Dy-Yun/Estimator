import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import process from 'node:process'

const ROOTS = ['src', 'e2e', 'scripts', '../MD', '../AGENTS.md']
const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.md', '.json', '.html', '.yml', '.yaml'])
const IGNORED_DIRS = new Set(['dist', 'node_modules', '.git'])

const KNOWN_MOJIBAKE_FRAGMENTS = [
  '\u7570\ubdbf',
  '\u8e42\ub2ff',
  '\uf9e3\uc10e',
  '\u907a\ub348',
  '\u5bc3\uc38c',
  '\u91ab',
  '\u936e',
  '\u63f4',
  '\u8adb',
  '\u6e72',
]

function collectFiles(path, out = []) {
  if (!existsSync(path)) return out

  const stat = statSync(path)
  if (!stat.isDirectory()) {
    if (TEXT_EXTS.has(extname(path))) out.push(path)
    return out
  }

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) collectFiles(join(path, entry.name), out)
      continue
    }
    if (TEXT_EXTS.has(extname(entry.name))) out.push(join(path, entry.name))
  }
  return out
}

function hasCjkUnifiedIdeograph(line) {
  return [...line].some((char) => {
    const cp = char.codePointAt(0)
    return cp >= 0x4e00 && cp <= 0x9fff
  })
}

function hasQuestionMarkHangulMojibake(line) {
  const chars = [...line]
  return chars.some((char, index) => {
    if (char !== '?') return false
    const next = chars[index + 1]?.codePointAt(0)
    return next != null && next >= 0xac00 && next <= 0xd7af
  })
}

function hasQuestionMarkProseMojibake(line, file, insideFence) {
  if (!file.endsWith('.md') || insideFence) return false
  if (!line.includes('??')) return false

  const trimmed = line.trim()
  if (!trimmed) return false

  const groups = trimmed.match(/\?{2,}/g) ?? []
  if (groups.length >= 3) return true
  if (/^#{1,6}\s+.*\?{2,}/.test(trimmed)) return true
  if (/^\|\s*\?{2,}\s*\|/.test(trimmed)) return true
  return false
}

function hasKnownMojibakeFragment(line) {
  return KNOWN_MOJIBAKE_FRAGMENTS.some((fragment) => line.includes(fragment))
}

function hasMojibakeMarker(line, file, insideFence) {
  if (line.includes('intentional-mojibake-example')) return false
  if (line.includes(String.fromCodePoint(0xfffd))) return true
  if (hasKnownMojibakeFragment(line)) return true
  if (hasCjkUnifiedIdeograph(line)) return true
  if (hasQuestionMarkHangulMojibake(line)) return true
  if (hasQuestionMarkProseMojibake(line, file, insideFence)) return true
  return false
}

const findings = []

for (const root of ROOTS) {
  for (const file of collectFiles(root)) {
    let insideFence = false
    readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      if (file.endsWith('.md') && /^\s*```/.test(line)) {
        insideFence = !insideFence
      }
      if (hasMojibakeMarker(line, file, insideFence)) {
        findings.push(`${file}:${index + 1}: ${line}`)
      }
    })
  }
}

if (findings.length) {
  console.error('Possible Korean mojibake found:')
  console.error(findings.join('\n'))
  process.exit(1)
}

console.log('Korean encoding check passed.')
