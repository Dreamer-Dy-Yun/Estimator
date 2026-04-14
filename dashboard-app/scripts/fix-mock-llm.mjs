import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../src/dashboard/components/product-secondary/', import.meta.url))
const path = `${dir}mockSecondaryData.ts`
let t = fs.readFileSync(path, 'utf8')
const block = `export async function mockLlmAnswer(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 450))
  const trimmed = prompt.trim() || ${JSON.stringify('\uC785\uB825 \uC5C6\uC74C')}
  const head = trimmed.slice(0, 200)
  const tail = trimmed.length > 200 ? ${JSON.stringify('\u2026')} : ''
  return ${JSON.stringify('[�변]')}+'\\n'+${JSON.stringify('\uC9C8\uC758: ')}+head+tail+'\\n\\n'+${JSON.stringify('\uC2E4\uC81C \uC11C\uBE44\uC2A4\uC5D0\uC11C\uB294 LLM API\uB85C \uAD50\uCCB4\uD569\uB2C8\uB2E4.')}
}`
const re = /export async function mockLlmAnswer\([\s\S]*?\n\}/
if (!re.test(t)) {
  console.error('block not found')
  process.exit(1)
}
t = t.replace(re, block)
fs.writeFileSync(path, t, 'utf8')
console.log('ok')
