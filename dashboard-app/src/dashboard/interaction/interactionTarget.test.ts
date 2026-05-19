// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  eventPathContainsInteractiveControl,
  isDialogOrInteractiveControlTarget,
  isEditingOrComboTarget,
  isInteractiveControlTarget,
} from './interactionTarget'

describe('interactionTarget', () => {
  it('separates text editing targets from general action controls', () => {
    const input = document.createElement('input')
    const button = document.createElement('button')
    const comboPanel = document.createElement('div')
    comboPanel.setAttribute('data-filter-combo-panel', 'true')

    expect(isEditingOrComboTarget(input)).toBe(true)
    expect(isEditingOrComboTarget(comboPanel)).toBe(true)
    expect(isEditingOrComboTarget(button)).toBe(false)
    expect(isInteractiveControlTarget(button)).toBe(true)
  })

  it('recognizes nested controls and dialogs', () => {
    const button = document.createElement('button')
    const child = document.createElement('span')
    const dialog = document.createElement('div')
    button.appendChild(child)
    dialog.setAttribute('role', 'dialog')

    expect(isInteractiveControlTarget(child)).toBe(true)
    expect(isDialogOrInteractiveControlTarget(dialog)).toBe(true)
    expect(isInteractiveControlTarget(dialog)).toBe(false)
  })

  it('checks event paths without treating plain areas as controls', () => {
    const plain = document.createElement('div')
    const label = document.createElement('label')

    expect(eventPathContainsInteractiveControl([plain, document.body])).toBe(false)
    expect(eventPathContainsInteractiveControl([plain, label, document.body])).toBe(true)
  })
})
