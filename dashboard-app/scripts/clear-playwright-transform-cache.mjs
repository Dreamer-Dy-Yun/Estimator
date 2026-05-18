import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import nodeProcess from 'node:process'

const cachePath = join(tmpdir(), 'playwright-transform-cache')

const command =
  nodeProcess.platform === 'win32'
    ? {
        file: 'powershell',
        args: [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          '$path = $env:PLAYWRIGHT_TRANSFORM_CACHE_PATH; if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Recurse -Force }',
        ],
      }
    : {
        file: 'rm',
        args: ['-rf', cachePath],
      }

const result = spawnSync(command.file, command.args, {
  env: { ...nodeProcess.env, PLAYWRIGHT_TRANSFORM_CACHE_PATH: cachePath },
  stdio: 'inherit',
})

if (result.error) {
  throw result.error
}

if (result.status !== 0) {
  nodeProcess.exit(result.status ?? 1)
}

console.log(`[e2e] cleared Playwright transform cache: ${cachePath}`)
