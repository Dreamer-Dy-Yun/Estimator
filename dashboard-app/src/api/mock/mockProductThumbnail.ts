export interface MockProductThumbnailInput {
  skuGroupKey: string
  code: string
  colorCode: string
}

const MOCK_THUMBNAIL_PALETTE: readonly string[] = [
  '#dbeafe',
  '#dcfce7',
  '#fef3c7',
  '#fee2e2',
  '#e0e7ff',
  '#cffafe',
] as const

function hashText(value: string): number {
  return [...value].reduce((hash: number, char: string) : number => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7)
}

function escapeSvgText(value: string): string {
  return value.replace(/[&<>"']/g, (char: string) : string => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&apos;'
    }
  })
}

export function buildMockProductThumbnailUrl({ skuGroupKey, code, colorCode }: MockProductThumbnailInput): string {
  const hash: number = hashText(`${skuGroupKey}:${code}:${colorCode}`)
  const background: string = MOCK_THUMBNAIL_PALETTE[hash % MOCK_THUMBNAIL_PALETTE.length]!
  const accent: string = MOCK_THUMBNAIL_PALETTE[(hash + 3) % MOCK_THUMBNAIL_PALETTE.length]!
  const label: string = escapeSvgText((code.replace(/[^A-Za-z0-9-]/g, '').slice(0, 7) || 'SKU').toUpperCase())
  const colorLabel: string = escapeSvgText(colorCode)
  const svg: string = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">',
    `<rect width="72" height="72" rx="14" fill="${background}"/>`,
    `<path d="M12 50 C20 34 29 27 44 26 C51 25 58 21 62 14 L62 58 L12 58 Z" fill="${accent}" opacity="0.76"/>`,
    '<rect x="12" y="13" width="48" height="34" rx="10" fill="#ffffff" opacity="0.82"/>',
    `<text x="36" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#0f172a">${label}</text>`,
    `<text x="36" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#475569">${colorLabel}</text>`,
    '</svg>',
  ].join('')
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
