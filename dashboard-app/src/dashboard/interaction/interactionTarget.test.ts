// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  eventPathContainsInteractiveControl,
  isDialogOrInteractiveControlTarget,
  isEditingOrComboTarget,
  isInteractiveControlTarget,
} from './interactionTarget'

describe('interactionTarget', () : void => {
  it('separates text editing targets from general action controls', () : void => {
    const input: HTMLInputElement = document.createElement('input')
    const button: HTMLButtonElement = document.createElement('button')
    const comboPanel: HTMLDivElement = document.createElement('div')
    comboPanel.setAttribute('data-filter-combo-panel', 'true')

    expect(isEditingOrComboTarget(input)).toBe(true)
    expect(isEditingOrComboTarget(comboPanel)).toBe(true)
    expect(isEditingOrComboTarget(button)).toBe(false)
    expect(isInteractiveControlTarget(button)).toBe(true)
  })

  it('recognizes nested controls and dialogs', () : void => {
    const button: HTMLButtonElement = document.createElement('button')
    const child: HTMLSpanElement = document.createElement('span')
    const dialog: HTMLDivElement = document.createElement('div')
    button.appendChild(child)
    dialog.setAttribute('role', 'dialog')

    expect(isInteractiveControlTarget(child)).toBe(true)
    expect(isDialogOrInteractiveControlTarget(dialog)).toBe(true)
    expect(isInteractiveControlTarget(dialog)).toBe(false)
  })

  it('checks event paths without treating plain areas as controls', () : void => {
    const plain: HTMLDivElement = document.createElement('div')
    const label: HTMLLabelElement = document.createElement('label')

    expect(eventPathContainsInteractiveControl([plain, document.body])).toBe(false)
    expect(eventPathContainsInteractiveControl([plain, label, document.body])).toBe(true)
  })
})
