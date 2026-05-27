import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const cachePath = join(tmpdir(), 'playwright-transform-cache')

rmSync(cachePath, { force: true, recursive: true })

console.log(`[e2e] cleared Playwright transform cache: ${cachePath}`)
