export interface MockProductImageInput {
  skuGroupKey: string
  code: string
  colorCode: string
  productName: string
}

const MOCK_IMAGE_PALETTE: readonly string[] = [
  '#e0f2fe',
  '#dcfce7',
  '#fef9c3',
  '#fae8ff',
  '#fee2e2',
  '#e0e7ff',
] as const

function hashText(value: string): number {
  return [...value].reduce((hash: number, char: string): number => ((hash * 33) + char.charCodeAt(0)) >>> 0, 11)
}

function escapeSvgText(value: string): string {
  return value.replace(/[&<>"']/g, (char: string): string => {
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

export function buildMockProductImageUrl({ skuGroupKey, code, colorCode, productName }: MockProductImageInput): string {
  const hash: number = hashText(`${skuGroupKey}:${code}:${colorCode}:${productName}`)
  const background: string = MOCK_IMAGE_PALETTE[hash % MOCK_IMAGE_PALETTE.length]!
  const accent: string = MOCK_IMAGE_PALETTE[(hash + 2) % MOCK_IMAGE_PALETTE.length]!
  const darkAccent: string = MOCK_IMAGE_PALETTE[(hash + 4) % MOCK_IMAGE_PALETTE.length]!
  const title: string = escapeSvgText(productName.slice(0, 28) || code)
  const skuLabel: string = escapeSvgText(`${code} / ${colorCode}`)
  const svg: string = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">',
    `<rect width="640" height="360" rx="18" fill="${background}"/>`,
    `<path d="M0 260 C90 210 155 230 230 190 C330 135 420 170 640 96 L640 360 L0 360 Z" fill="${accent}" opacity="0.82"/>`,
    `<path d="M360 308 C410 240 470 210 580 186 L640 174 L640 360 L318 360 Z" fill="${darkAccent}" opacity="0.58"/>`,
    '<rect x="58" y="60" width="296" height="126" rx="22" fill="#ffffff" opacity="0.86"/>',
    `<text x="82" y="116" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#0f172a">${escapeSvgText(code)}</text>`,
    `<text x="82" y="151" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#475569">${skuLabel}</text>`,
    `<text x="82" y="266" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#0f172a">${title}</text>`,
    '</svg>',
  ].join('')
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
