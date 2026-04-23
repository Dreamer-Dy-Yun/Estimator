export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const logApiCalled = (message: string) => {
  if (typeof console === 'undefined') return
  console.info(`[API CALLED] ${message}`)
}

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export function makeUuid32(): string {
  const chars = 'abcdef0123456789'
  let out = ''
  for (let i = 0; i < 32; i += 1) out += chars[Math.floor(Math.random() * chars.length)]!
  return out
}
