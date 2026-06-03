export const sleep: (ms: number) => Promise<unknown> = (ms: number) : Promise<unknown> => new Promise((r: (value: unknown) => void) : ReturnType<typeof setTimeout> => setTimeout(r, ms))

export const clamp: (v: number, min: number, max: number) => number = (v: number, min: number, max: number) : number => Math.max(min, Math.min(max, v))

export function makeUuid32(): string {
  const chars = 'abcdef0123456789' as const
  let out: string = ''
  for (let i: number = 0; i < 32; i += 1) out += chars[Math.floor(Math.random() * chars.length)]!
  return out
}
