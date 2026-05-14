/**
 * Hardened module: deterministic rank helper.
 * Responsibility: derive a stable display/mock rank from a string seed.
 * Contract: `mod` is a positive integer and the return value is always in `1..mod`.
 * Side effects: none.
 */
/** 결정적 순위 1..mod (목업·UI 표시용). */
export function hashRank(seed: string, mod: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return (h % mod) + 1
}
