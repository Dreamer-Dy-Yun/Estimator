// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi , type Mock} from 'vitest';
import { PaginatedTable } from './PaginatedTable'

export type Row = {
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

function renderTable(onOrderedRowIdsChange: Mock<(...args: unknown[]) => unknown> = vi.fn()) : { onOrderedRowIdsChange: Mock<(...args: unknown[]) => unknown>; } {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  act(() : void => {
    root?.render(
      <PaginatedTable<Row>
        paginated={false}
        rows={rows}
        columns={[
          { key: 'label', header: '상품명', cell: (row: Row) : string => row.label, sortValue: (row: Row) : string => row.label },
          { key: 'qty', header: '판매량', cell: (row: Row) : number => row.qty, sortValue: (row: Row) : number => row.qty },
        ]}
        defaultSort={{ key: 'qty', dir: 'asc' }}
        onOrderedRowIdsChange={onOrderedRowIdsChange}
      />,
    )
  })

  return { onOrderedRowIdsChange }
}

function findHeader(label: string) : HTMLTableCellElement {
  const header: HTMLTableCellElement | undefined = [...document.querySelectorAll('th')].find((node: HTMLTableCellElement) : boolean => node.textContent?.includes(label))
  expect(header).toBeTruthy()
  return header as HTMLTableCellElement
}

afterEach(() : void => {
  act(() : void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('PaginatedTable', () : void => {
  it('reports row ids in the rendered default sort order', () : void => {
    const { onOrderedRowIdsChange }: { onOrderedRowIdsChange: Mock<(...args: unknown[]) => unknown>; } = renderTable()

    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['b', 'c', 'a'])
  })

  it('reports row ids again when the visible sort order changes', () : void => {
    const { onOrderedRowIdsChange }: { onOrderedRowIdsChange: Mock<(...args: unknown[]) => unknown>; } = renderTable()
    const qtyHeader: HTMLTableCellElement = findHeader('판매량')

    act(() : void => {
      qtyHeader?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['a', 'c', 'b'])
  })

  it('exposes aria-sort and sort action labels on sortable headers', () : void => {
    renderTable()
    const labelHeader: HTMLTableCellElement = findHeader('상품명')
    const qtyHeader: HTMLTableCellElement = findHeader('판매량')

    expect(labelHeader.getAttribute('aria-sort')).toBe('none')
    expect(labelHeader.getAttribute('aria-label')).toBe('상품명 기준 오름차순 정렬')
    expect(labelHeader.getAttribute('title')).toBe('상품명 기준 오름차순 정렬')
    expect(qtyHeader.getAttribute('aria-sort')).toBe('ascending')
    expect(qtyHeader.getAttribute('aria-label')).toBe('판매량 기준 내림차순 정렬')
    expect(qtyHeader.tabIndex).toBe(0)
  })

  it('sorts from the focused header with Enter', () : void => {
    const { onOrderedRowIdsChange }: { onOrderedRowIdsChange: Mock<(...args: unknown[]) => unknown>; } = renderTable()
    const qtyHeader: HTMLTableCellElement = findHeader('판매량')

    act(() : void => {
      qtyHeader.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(qtyHeader.getAttribute('aria-sort')).toBe('descending')
    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['a', 'c', 'b'])
  })

  it('sorts from the focused header with Space', () : void => {
    const { onOrderedRowIdsChange }: { onOrderedRowIdsChange: Mock<(...args: unknown[]) => unknown>; } = renderTable()
    const labelHeader: HTMLTableCellElement = findHeader('상품명')

    act(() : void => {
      labelHeader.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })

    expect(labelHeader.getAttribute('aria-sort')).toBe('ascending')
    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['a', 'b', 'c'])
  })

  it('resets to default sort when the reset key changes', async () : Promise<void> => {
    const { onOrderedRowIdsChange }: { onOrderedRowIdsChange: Mock<(...args: unknown[]) => unknown>; } = renderTable()
    const qtyHeader: HTMLTableCellElement = document.querySelectorAll('th')[1] as HTMLTableCellElement

    act(() : void => {
      qtyHeader.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['a', 'c', 'b'])

    act(() : void => {
      root?.render(
        <PaginatedTable<Row>
          paginated={false}
          rows={rows}
          columns={[
            { key: 'label', header: 'label', cell: (row: Row) : string => row.label, sortValue: (row: Row) : string => row.label },
            { key: 'qty', header: 'qty', cell: (row: Row) : number => row.qty, sortValue: (row: Row) : number => row.qty },
          ]}
          defaultSort={{ key: 'qty', dir: 'asc' }}
          resetSortKey="query-2"
          onOrderedRowIdsChange={onOrderedRowIdsChange}
        />,
      )
    })
    await act(async () : Promise<void> => {
      await Promise.resolve()
    })

    expect((document.querySelectorAll('th')[1] as HTMLTableCellElement).getAttribute('aria-sort')).toBe('ascending')
    expect(onOrderedRowIdsChange).toHaveBeenLastCalledWith(['b', 'c', 'a'])
  })
})
