import { describe, expect, it } from 'vitest'
import { SecondaryOrderDraft } from './SecondaryOrderDraft'

describe('SecondaryOrderDraft', () : void => {
  it('uses recommended quantities in live mode even when a snapshot exists', () : void => {
    const draft: SecondaryOrderDraft = new SecondaryOrderDraft({
      mode: 'live',
      manualConfirmBySize: {},
      snapshotConfirmBySize: { M: 12 },
    })

    expect(draft.confirmQty('M', 7)).toBe(7)
  })

  it('uses saved snapshot quantities only in snapshot mode', () : void => {
    const draft: SecondaryOrderDraft = new SecondaryOrderDraft({
      mode: 'snapshot',
      manualConfirmBySize: {},
      snapshotConfirmBySize: { M: 12 },
    })

    expect(draft.confirmQty('M', 7)).toBe(12)
  })

  it('removes manual override when the user returns to the active baseline', () : void => {
    const draft: SecondaryOrderDraft = new SecondaryOrderDraft({
      mode: 'live',
      manualConfirmBySize: { M: 9 },
      snapshotConfirmBySize: { M: 12 },
    })

    expect(draft.nextManualConfirmBySize('M', 7, 7)).toEqual({})
  })
})
