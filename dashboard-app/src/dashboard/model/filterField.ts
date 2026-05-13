export type FilterField = {
  label: string
  /** `listCombo`: free input with option suggestions rendered by the shared `FilterListCombo`. */
  kind: 'input' | 'select' | 'listCombo'
  inputType?: 'text' | 'date'
  defaultValue?: string
  value?: string
  displayValue?: string
  disabled?: boolean
  onChange?: (value: string) => void
  /** `select`: fixed choices. `listCombo`: suggestion list. */
  options?: string[]
}
