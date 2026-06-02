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

function findHeader(label: string) {
  const header = [...document.querySelectorAll('th')].find((node) => node.textContent?.includes(label))
  expect(header).toBeTruthy()
  return header as HTMLTableCellElement
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
    const qtyHeader = findHeader('판매량')

    act(() => {
      qtyHeader?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['a', 'c', 'b'])
  })

  it('exposes aria-sort and sort action labels on sortable headers', () => {
    renderTable()
    const labelHeader = findHeader('상품명')
    const qtyHeader = findHeader('판매량')

    expect(labelHeader.getAttribute('aria-sort')).toBe('none')
    expect(labelHeader.getAttribute('aria-label')).toBe('상품명 기준 오름차순 정렬')
    expect(labelHeader.getAttribute('title')).toBe('상품명 기준 오름차순 정렬')
    expect(qtyHeader.getAttribute('aria-sort')).toBe('ascending')
    expect(qtyHeader.getAttribute('aria-label')).toBe('판매량 기준 내림차순 정렬')
    expect(qtyHeader.tabIndex).toBe(0)
  })

  it('sorts from the focused header with Enter', () => {
    const { onOrderedRowIdsChange } = renderTable()
    const qtyHeader = findHeader('판매량')

    act(() => {
      qtyHeader.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(qtyHeader.getAttribute('aria-sort')).toBe('descending')
    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['a', 'c', 'b'])
  })

  it('sorts from the focused header with Space', () => {
    const { onOrderedRowIdsChange } = renderTable()
    const labelHeader = findHeader('상품명')

    act(() => {
      labelHeader.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })

    expect(labelHeader.getAttribute('aria-sort')).toBe('ascending')
    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['a', 'b', 'c'])
  })

  it('resets to default sort when the reset key changes', async () => {
    const { onOrderedRowIdsChange } = renderTable()
    const qtyHeader = document.querySelectorAll('th')[1] as HTMLTableCellElement

    act(() => {
      qtyHeader.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['a', 'c', 'b'])

    act(() => {
      root?.render(
        <PaginatedTable<Row>
          paginated={false}
          rows={rows}
          columns={[
            { key: 'label', header: 'label', cell: (row) => row.label, sortValue: (row) => row.label },
            { key: 'qty', header: 'qty', cell: (row) => row.qty, sortValue: (row) => row.qty },
          ]}
          defaultSort={{ key: 'qty', dir: 'asc' }}
          resetSortKey="query-2"
          onOrderedRowIdsChange={onOrderedRowIdsChange}
        />,
      )
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect((document.querySelectorAll('th')[1] as HTMLTableCellElement).getAttribute('aria-sort')).toBe('ascending')
    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['b', 'c', 'a'])
  })
})
