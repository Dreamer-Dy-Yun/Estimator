import { spawnSync } from 'node:child_process'
import process from 'node:process'

const steps = [
  ['lint', ['run', 'lint']],
  ['encoding', ['run', 'check:encoding']],
  ['unit', ['run', 'test:run']],
  ['build', ['run', 'build', '--', '--base=/Estimator/']],
]

function runNpm(args) {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], {
      stdio: 'inherit',
    })
  }

  return spawnSync('npm', args, { stdio: 'inherit' })
}

for (const [name, args] of steps) {
  console.log(`\n[verify:deploy] ${name}`)
  const result = runNpm(args)

  if (result.error) {
    console.error(`[verify:deploy] ${name} failed to start`)
    console.error(result.error)
    process.exit(1)
  }

  if (result.status !== 0) {
    console.error(`[verify:deploy] ${name} failed`)
    process.exit(result.status ?? 1)
  }
}

console.log('\n[verify:deploy] all checks passed')
