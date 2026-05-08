export type XlsxCellValue = string | number | null | undefined

export type XlsxWorksheet = {
  name: string
  rows: XlsxCellValue[][]
  columnWidths?: number[]
}

const textEncoder = new TextEncoder()

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function columnName(index: number): string {
  let n = index + 1
  let name = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function worksheetXml(sheet: XlsxWorksheet): string {
  const maxColumnCount = Math.max(
    sheet.columnWidths?.length ?? 0,
    ...sheet.rows.map((row) => row.length),
  )
  const columns = sheet.columnWidths?.length
    ? `<cols>${sheet.columnWidths.map((width, index) => {
        const col = index + 1
        return `<col min="${col}" max="${col}" width="${Math.max(6, width)}" customWidth="1"/>`
      }).join('')}</cols>`
    : ''
  const rowXml = sheet.rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1
    const cells = row.map((cell, cellIndex) => {
      if (cell == null) return ''
      const ref = `${columnName(cellIndex)}${rowNumber}`
      if (typeof cell === 'number' && Number.isFinite(cell)) {
        return `<c r="${ref}"><v>${cell}</v></c>`
      }
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(cell))}</t></is></c>`
    }).join('')
    return `<row r="${rowNumber}">${cells}</row>`
  }).join('')
  const dimension = maxColumnCount > 0 && sheet.rows.length > 0
    ? `A1:${columnName(maxColumnCount - 1)}${sheet.rows.length}`
    : 'A1'

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  ${columns}
  <sheetData>${rowXml}</sheetData>
</worksheet>`
}

function workbookXml(sheets: XlsxWorksheet[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}
  </sheets>
</workbook>`
}

function workbookRelsXml(sheets: XlsxWorksheet[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
}

function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
}

const crc32Table = makeCrc32Table()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc = crc32Table[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUInt16LE(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

function writeUInt32LE(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function dosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear())
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { dosTime, dosDate }
}

type ZipFile = {
  name: string
  data: Uint8Array
}

function createZip(files: ZipFile[]): Uint8Array {
  const chunks: Uint8Array[] = []
  const centralChunks: Uint8Array[] = []
  let offset = 0
  const { dosTime, dosDate } = dosDateTime(new Date())

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name)
    const crc = crc32(file.data)
    const local = new Uint8Array(30 + nameBytes.length)
    writeUInt32LE(local, 0, 0x04034b50)
    writeUInt16LE(local, 4, 20)
    writeUInt16LE(local, 6, 0)
    writeUInt16LE(local, 8, 0)
    writeUInt16LE(local, 10, dosTime)
    writeUInt16LE(local, 12, dosDate)
    writeUInt32LE(local, 14, crc)
    writeUInt32LE(local, 18, file.data.length)
    writeUInt32LE(local, 22, file.data.length)
    writeUInt16LE(local, 26, nameBytes.length)
    writeUInt16LE(local, 28, 0)
    local.set(nameBytes, 30)
    chunks.push(local, file.data)

    const central = new Uint8Array(46 + nameBytes.length)
    writeUInt32LE(central, 0, 0x02014b50)
    writeUInt16LE(central, 4, 20)
    writeUInt16LE(central, 6, 20)
    writeUInt16LE(central, 8, 0)
    writeUInt16LE(central, 10, 0)
    writeUInt16LE(central, 12, dosTime)
    writeUInt16LE(central, 14, dosDate)
    writeUInt32LE(central, 16, crc)
    writeUInt32LE(central, 20, file.data.length)
    writeUInt32LE(central, 24, file.data.length)
    writeUInt16LE(central, 28, nameBytes.length)
    writeUInt16LE(central, 30, 0)
    writeUInt16LE(central, 32, 0)
    writeUInt16LE(central, 34, 0)
    writeUInt16LE(central, 36, 0)
    writeUInt32LE(central, 38, 0)
    writeUInt32LE(central, 42, offset)
    central.set(nameBytes, 46)
    centralChunks.push(central)

    offset += local.length + file.data.length
  }

  const centralDirectoryOffset = offset
  const centralDirectory = concatBytes(centralChunks)
  const end = new Uint8Array(22)
  writeUInt32LE(end, 0, 0x06054b50)
  writeUInt16LE(end, 4, 0)
  writeUInt16LE(end, 6, 0)
  writeUInt16LE(end, 8, files.length)
  writeUInt16LE(end, 10, files.length)
  writeUInt32LE(end, 12, centralDirectory.length)
  writeUInt32LE(end, 16, centralDirectoryOffset)
  writeUInt16LE(end, 20, 0)
  chunks.push(centralDirectory, end)
  return concatBytes(chunks)
}

// This is a narrow prototype writer for the current order export only.
// If Excel output needs formulas, styles, merged cells, or more sheet shapes,
// replace this with xlsx/exceljs or a backend-generated download endpoint.
export function createXlsxWorkbookBlob(sheets: [XlsxWorksheet, XlsxWorksheet]): Blob {
  const files: ZipFile[] = [
    { name: '[Content_Types].xml', data: textEncoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: textEncoder.encode(rootRelsXml) },
    { name: 'xl/workbook.xml', data: textEncoder.encode(workbookXml(sheets)) },
    { name: 'xl/_rels/workbook.xml.rels', data: textEncoder.encode(workbookRelsXml(sheets)) },
    { name: 'xl/styles.xml', data: textEncoder.encode(stylesXml) },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: textEncoder.encode(worksheetXml(sheet)),
    })),
  ]
  const zipBytes = createZip(files)
  const payload = new ArrayBuffer(zipBytes.byteLength)
  new Uint8Array(payload).set(zipBytes)
  return new Blob([payload], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
