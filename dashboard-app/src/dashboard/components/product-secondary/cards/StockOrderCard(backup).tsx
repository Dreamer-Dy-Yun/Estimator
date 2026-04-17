/**
 * STOCK ORDER CARD BACKUP
 *
 * - 이 파일은 2차 드로워의 "재고 및 오더(StockOrderCard)" 원본 구현 백업본이다.
 * - 포함 범위: 안전재고 기준 토글, 입력 폼, 재고/오더 계산 테이블, 도움말 마크 연동.
 * - 운영 정책: 사용자가 이 파일 경로를 명시적으로 지정해 삭제를 요청하기 전까지 절대 삭제하지 않는다.
 */
import { PortalHelpMark } from '../../PortalHelpPopover'
import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import type { ApiUnitErrorInfo } from '../../../../types'
import { c, won } from '../../../../utils/format'
import commonStyles from '../../common.module.css'
import { usePortalHelpPopover } from '../../usePortalHelpPopover'
import { KO } from '../ko'
import styles from '../productSecondaryPanel.module.css'
import type {
  SecondaryHelpId,
  SecondaryStockCalc,
  SecondaryStockDerived,
  SecondaryStockInputs,
} from '../secondaryPanelTypes'

type Props = {
  stock: {
    inputs: SecondaryStockInputs
    derived: SecondaryStockDerived
    calc: SecondaryStockCalc | null
    error: ApiUnitErrorInfo | null
  }
  help: {
    labelIds: {
      serviceLevel: string
      leadTime: string
      safetyStockCalc: string
      forecastQtyCalc: string
      recOrderQty: string
      stockCalcColumn: string
    }
    portal: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
  }
  actions: {
    onDailyMeanChange: (next: number) => void
    onSafetyStockModeChange: (next: 'manual' | 'formula') => void
    onManualSafetyStockChange: (next: number) => void
    onLeadTimeStartDateChange: (next: string) => void
    onLeadTimeEndDateChange: (next: string) => void
    onServiceLevelPctChange: (next: number) => void
  }
}

/** 백업본 — 복원 시 `StockOrderCard.tsx`로 내용을 옮기고 export 이름을 `StockOrderCard`로 맞춘다. */
export function StockOrderCardBackup({ stock, help, actions }: Props) {
  const { inputs, derived, calc, error } = stock
  const { labelIds, portal } = help

  const {
    onSafetyStockModeChange,
    onManualSafetyStockChange,
    onLeadTimeStartDateChange,
    onLeadTimeEndDateChange,
    onServiceLevelPctChange,
    onDailyMeanChange,
  } = actions

  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <div className={styles.stockTitleRow}>
        <h3 className={styles.sectionTitle}>
          {KO.sectionStock}
          <ApiUnitErrorBadge error={error} />
        </h3>
        <label className={styles.stockModeToggle}>
          <span className={styles.stockModeToggleText}>{KO.labelDirectInput}</span>
          <input
            type="checkbox"
            className={styles.stockModeToggleInput}
            checked={inputs.safetyStockMode === 'manual'}
            onChange={(e) => onSafetyStockModeChange(e.target.checked ? 'manual' : 'formula')}
            aria-label={KO.labelDirectInput}
          />
          <span className={styles.stockModeToggleTrack} aria-hidden />
        </label>
      </div>
      <div className={styles.stockInputList}>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelDailyMean}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <input
              type="number"
              className={`${styles.stockNumberInput} ${styles.stockFillInput}`}
              min={0}
              step={0.1}
              value={Math.round(inputs.dailyMean * 10) / 10}
              onChange={(e) => onDailyMeanChange(Math.max(0, Number(e.target.value) || 0))}
              aria-label={KO.labelDailyMean}
            />
            <span className={styles.inlineUnit}>EA/일</span>
          </span>
        </div>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>
            {inputs.safetyStockMode === 'manual' ? (
              KO.labelSafetyStockManual
            ) : (
              <span className={commonStyles.cardTitleWithHelp}>
                {KO.labelServiceLevel}
                <PortalHelpMark
                  helpId="serviceLevel"
                  placement="above"
                  labelId={labelIds.serviceLevel}
                  markClassName={commonStyles.helpMark}
                  help={portal}
                />
              </span>
            )}
          </span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            {inputs.safetyStockMode === 'manual' ? (
              <>
                <input
                  type="number"
                  className={`${styles.stockNumberInput} ${styles.stockFillInput}`}
                  min={0}
                  value={inputs.manualSafetyStock}
                  onChange={(e) => onManualSafetyStockChange(Math.max(0, Number(e.target.value) || 0))}
                  aria-label={KO.labelSafetyStockManual}
                />
                <span className={styles.inlineUnit}>EA</span>
              </>
            ) : (
              <>
                <input
                  type="number"
                  className={`${styles.stockNumberInput} ${styles.stockFillInput}`}
                  min={80}
                  max={99.9}
                  step={0.5}
                  value={inputs.serviceLevelPct}
                  onChange={(e) => onServiceLevelPctChange(Number(e.target.value))}
                  aria-label={KO.labelServiceLevel}
                />
                <span className={styles.inlineUnit}>%</span>
              </>
            )}
          </span>
        </div>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelLeadTimeStartDate}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <input
              type="date"
              className={`${styles.stockDateInput} ${styles.stockFillInput}`}
              value={inputs.leadTimeStartDate}
              onChange={(e) => onLeadTimeStartDateChange(e.target.value)}
              aria-label={KO.labelLeadTimeStartDate}
            />
          </span>
        </div>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelLeadTimeEndDate}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <input
              type="date"
              className={`${styles.stockDateInput} ${styles.stockFillInput}`}
              value={inputs.leadTimeEndDate}
              onChange={(e) => onLeadTimeEndDateChange(e.target.value)}
              aria-label={KO.labelLeadTimeEndDate}
            />
          </span>
        </div>
      </div>
      <div className={styles.cardTableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{KO.thMetric}</th>
              <th className={styles.num}>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.thSafetyStockCalc}
                  <PortalHelpMark
                    helpId="stockCalcColumn"
                    placement="above"
                    labelId={labelIds.stockCalcColumn}
                    markClassName={commonStyles.helpMark}
                    help={portal}
                  />
                </span>
              </th>
              <th className={styles.num}>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.thForecastQtyCalc}
                  <PortalHelpMark
                    helpId="forecastQtyCalc"
                    placement="above"
                    labelId={labelIds.forecastQtyCalc}
                    markClassName={commonStyles.helpMark}
                    help={portal}
                  />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className={styles.stockMetricCell}>
                  <span className={commonStyles.cardTitleWithHelp}>
                    {KO.rowSafetyStock}
                    {inputs.safetyStockMode === 'formula' ? (
                      <PortalHelpMark
                        helpId="safetyStockCalc"
                        placement="above"
                        labelId={labelIds.safetyStockCalc}
                        markClassName={commonStyles.helpMark}
                        help={portal}
                      />
                    ) : null}
                  </span>
                </div>
              </td>
              <td className={styles.num}>{c(derived.safetyStock)}</td>
              <td className={styles.num}>-</td>
            </tr>
            <tr>
              <td>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.rowRecOrderQty}
                  <PortalHelpMark
                    helpId="recOrderQty"
                    placement="above"
                    labelId={labelIds.recOrderQty}
                    markClassName={commonStyles.helpMark}
                    help={portal}
                  />
                </span>
              </td>
              <td className={styles.num}>{c(derived.recommendedOrderQty)}</td>
              <td className={styles.num}>{c(calc?.forecastQtyCalc.recommendedOrderQty ?? 0)}</td>
            </tr>
            <tr>
              <td>{KO.rowExpectedOrderAmt}</td>
              <td className={styles.num}>{won(derived.expectedOrderAmount)}</td>
              <td className={styles.num}>{won(calc?.forecastQtyCalc.expectedOrderAmount ?? 0)}</td>
            </tr>
            <tr>
              <td>{KO.rowExpectedSales}</td>
              <td className={styles.num}>{won(derived.expectedSalesAmount)}</td>
              <td className={styles.num}>{won(calc?.forecastQtyCalc.expectedSalesAmount ?? 0)}</td>
            </tr>
            <tr>
              <td>{KO.rowExpectedOpProfit}</td>
              <td className={styles.num}>{won(derived.expectedOpProfit)}</td>
              <td className={styles.num}>{won(calc?.forecastQtyCalc.expectedOpProfit ?? 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
