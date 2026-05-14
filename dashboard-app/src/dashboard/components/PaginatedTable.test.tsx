// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaginatedTable } from './PaginatedTable'

type Row = {
  id: string
  label: string
  qty: number
}

const rows: Row[] = [
  { id: 'a', label: 'A', qty: 30 },
  { id: 'b', label: 'B', qty: 10 },
  { id: 'c', label: 'C', qty: 20 },
]

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderTable(onOrderedRowIdsChange = vi.fn()) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <PaginatedTable<Row>
        paginated={false}
        rows={rows}
        columns={[
          { key: 'label', header: '상품명', cell: (row) => row.label, sortValue: (row) => row.label },
          { key: 'qty', header: '판매량', cell: (row) => row.qty, sortValue: (row) => row.qty },
        ]}
        defaultSort={{ key: 'qty', dir: 'asc' }}
        onOrderedRowIdsChange={onOrderedRowIdsChange}
      />,
    )
  })

  return { onOrderedRowIdsChange }
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('PaginatedTable', () => {
  it('reports row ids in the rendered default sort order', () => {
    const { onOrderedRowIdsChange } = renderTable()

    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['b', 'c', 'a'])
  })

  it('reports row ids again when the visible sort order changes', () => {
    const { onOrderedRowIdsChange } = renderTable()
    const qtyHeader = [...document.querySelectorAll('th')].find((node) => node.textContent?.includes('판매량'))
    expect(qtyHeader).toBeTruthy()

    act(() => {
      qtyHeader?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['a', 'c', 'b'])
  })
})
