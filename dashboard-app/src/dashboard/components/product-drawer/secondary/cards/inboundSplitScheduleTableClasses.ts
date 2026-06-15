import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'

export function cx(...classNames: Array<string | null | undefined>): string { return classNames.filter(Boolean).join(' ') }

export function ariaDiffLabel(label: string, diffClassName: string): string {
  return diffClassName ? `${label} ${KO.ariaInboundSplitConfirmedDiff}` : label
}

export function diffClass(confirmed: number, suggested: number): string {
  return Math.max(0, Math.round(confirmed)) === Math.max(0, Math.round(suggested)) ? '' : styles.inboundSplitConfirmedDiff
}

export const stickyRoundClassName: string = cx(styles.inboundSplitRoundCell, styles.inboundSplitStickyCol, styles.inboundSplitStickyColRound)
export const stickyDateClassName: string = cx(styles.inboundSplitDateCell, styles.inboundSplitStickyCol, styles.inboundSplitStickyColDate)
export const stickyKindClassName: string = cx(styles.inboundSplitKindCell, styles.inboundSplitStickyCol, styles.inboundSplitStickyColKind)
export const stickyTotalClassName: string = cx(styles.num, styles.inboundSplitTotalCell, styles.inboundSplitStickyCol, styles.inboundSplitStickyColTotal)
export const qtyInputClassName: string = cx(styles.stockNumberInput, styles.inboundSplitQtyInput)
