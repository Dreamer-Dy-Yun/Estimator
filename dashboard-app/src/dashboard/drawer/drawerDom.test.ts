// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { drawerKeepOpenDataProps, shouldKeepDrawerOpenFromEventPath } from './drawerDom'

function pathFor(element: Element): EventTarget[] {
  return [element, document.body, document.documentElement, document]
}

describe('drawerDom', () : void => {
  it('keeps the drawer open when the outside target is an interactive control', () : void => {
    const button: HTMLButtonElement = document.createElement('button')
    const input: HTMLInputElement = document.createElement('input')
    const label: HTMLLabelElement = document.createElement('label')
    const option: HTMLDivElement = document.createElement('div')
    option.setAttribute('data-filter-combo-panel', 'true')

    expect(shouldKeepDrawerOpenFromEventPath(pathFor(button))).toBe(true)
    expect(shouldKeepDrawerOpenFromEventPath(pathFor(input))).toBe(true)
    expect(shouldKeepDrawerOpenFromEventPath(pathFor(label))).toBe(true)
    expect(shouldKeepDrawerOpenFromEventPath(pathFor(option))).toBe(true)
  })

  it('keeps the drawer open inside an explicitly marked drawer-safe area', () : void => {
    const wrapper: HTMLDivElement = document.createElement('div')
    Object.entries(drawerKeepOpenDataProps()).forEach(([key, value]: [string, 'true']) : void => wrapper.setAttribute(key, value))
    const child: HTMLSpanElement = document.createElement('span')
    wrapper.appendChild(child)

    expect(shouldKeepDrawerOpenFromEventPath([child, wrapper, document.body])).toBe(true)
  })

  it('does not keep the drawer open for a plain non-interactive area', () : void => {
    const plain: HTMLDivElement = document.createElement('div')

    expect(shouldKeepDrawerOpenFromEventPath(pathFor(plain))).toBe(false)
  })
})
