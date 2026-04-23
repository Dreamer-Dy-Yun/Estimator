/** 결정적 순위 1..mod (목업·UI 표시용). */
export function hashRank(seed: string, mod: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return (h % mod) + 1
}
