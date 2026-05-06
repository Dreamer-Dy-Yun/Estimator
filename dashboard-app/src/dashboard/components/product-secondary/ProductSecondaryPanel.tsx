import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BlockMath } from 'react-katex'
import { dashboardApi, type SecondaryCompetitorChannel } from '../../../api'
import { ComponentErrorBoundary } from '../../../components/ComponentErrorBoundary'
import type { ApiUnitErrorInfo, ProductPrimarySummary, ProductSecondaryDetail } from '../../../types'
import {
  daysInclusiveBetween,
  formatDateTimeMinute,
} from '../../../utils/date'
import { PortalHelpPopoverLayer } from '../PortalHelpPopover'
import commonStyles from '../common.module.css'
import { buildShadeRanges, normalizeMonthKey } from '../trend/trendRangeUtils'
import { usePortalHelpPopover } from '../usePortalHelpPopover'
import { AiMockCard } from './cards/AiMockCard'
import { ProductMetaCard } from './cards/ProductMetaCard'
import { SalesForecastCard } from './cards/SalesForecastCard'
import { SalesTrendDailyCard } from './cards/SalesTrendDailyCard'
import { SizeOrderCard } from './cards/SizeOrderCard'
import { computeClientStockOrder } from './model/clientStockOrderCompute'
import { KO } from './ko'
import { buildSalesKpiColumn } from '../../../utils/salesKpiColumn'
import { mergePrimarySecondarySizeMix } from './model/secondaryPanelCalc'
import styles from './productSecondaryPanel.module.css'
import type {
  SecondaryForecastCalc,
  SecondaryForecastDerived,
  SecondaryForecastInputs,
  SecondaryHelpId,
} from './secondaryPanelTypes'
import { ORDER_SNAPSHOT_SCHEMA_VERSION, type OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import {
  CandidateStashOrderActionCard,
  InnerCandidateActionCard,
  type CandidateItemPanelContext,
} from './candidateActionCards'

export type { CandidateItemPanelContext }

type Props = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  periodStart: string
  periodEnd: string
  /** 오더 스냅샷용: 월간 포캐스트 개월 수 */
  forecastMonths: number
  pageName?: string
  /** 후보군 등에서 불러온 저장 스냅샷으로 폼·확정 수량 복원 */
  prefillFromSnapshot?: OrderSnapshotDocumentV1 | null
  candidateItemContext?: CandidateItemPanelContext | null
  channelState: {
    channelId: string
    competitorChannels: SecondaryCompetitorChannel[]
    onChannelChange: (next: string) => void
  }
}

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildDefaultLeadTimeDates() {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setMonth(startDate.getMonth() + 6)
  const start = toIsoDateLocal(startDate)
  const endDate = new Date(today)
  endDate.setFullYear(endDate.getFullYear() + 1)
  const end = toIsoDateLocal(endDate)
  return { start, end }
}

export function ProductSecondaryPanel({
  primary,
  secondary,
  periodStart,
  periodEnd,
  forecastMonths,
  pageName = 'ProductSecondaryPanel',
  prefillFromSnapshot = null,
  candidateItemContext = null,
  channelState,
}: Props) {
  const defaultLeadTime = useMemo(() => buildDefaultLeadTimeDates(), [])
  const {
    channelId,
    competitorChannels,
    onChannelChange,
  } = channelState
  const confirmOrderHelpId = useId()
  const forecastQtyCalcHelpId = useId()
  const expectedOpProfitRateHelpId = useId()
  const totalOrderBalanceHelpId = useId()
  const expectedInboundOrderBalanceHelpId = useId()
  const sizeRecQtyHelpId = useId()
  const salesForecastSizeOrderHelpId = useId()
  const portalHelp = usePortalHelpPopover<SecondaryHelpId>()
  const [safetyStockMode] = useState<'manual' | 'formula'>('formula')
  const [manualSafetyStock] = useState(0)
  /** null: 예측 수량연산용 μ는 클라이언트 가중모형값. 숫자면 해당 값으로 덮어씀. */
  const [dailyMeanClient, setDailyMeanClient] = useState<number | null>(null)
  const [serviceLevelPct] = useState(95)
  const [leadTimeStartDate, setLeadTimeStartDate] = useState(defaultLeadTime.start)
  const [leadTimeEndDate, setLeadTimeEndDate] = useState(defaultLeadTime.end)
  const [bufferStock, setBufferStock] = useState(0)
  const [unitCostInput, setUnitCostInput] = useState(Math.max(0, Math.round(primary.price * 0.78)))
  const [unitPriceInput, setUnitPriceInput] = useState(Math.max(0, Math.round(primary.price)))
  const [expectedFeeRatePct, setExpectedFeeRatePct] = useState(13)
  const [llmPrompt, setLlmPrompt] = useState('')
  const [llmAnswer, setLlmAnswer] = useState('')
  const [selfWeightPct, setSelfWeightPct] = useState(50)
  /** 사용자가 직접 덮어쓴 확정 수량만 — 스냅샷 값은 snapshotConfirmBySize에서 병합 */
  const [confirmBySize, setConfirmBySize] = useState<Record<string, number>>({})
  const dailyTrendReqSeqRef = useRef(0)
  const [forecastCalc, setForecastCalc] = useState<SecondaryForecastCalc | null>(null)
  const [forecastCalcError, setForecastCalcError] = useState<ApiUnitErrorInfo | null>(null)
  const [dailyTrendError, setDailyTrendError] = useState<ApiUnitErrorInfo | null>(null)
  const [prefillError, setPrefillError] = useState<string | null>(null)
  const [candidateActionLoading, setCandidateActionLoading] = useState(false)
  const [candidateListOpen, setCandidateListOpen] = useState(false)
  const [candidateStashes, setCandidateStashes] = useState<Array<{
    uuid: string
    name: string
    note: string | null
    dbCreatedAt: string
  }>>([])
  const [selectedCandidate, setSelectedCandidate] = useState<{
    uuid: string
    name: string
    dbCreatedAt: string
  } | null>(null)
  const [candidateNameInput, setCandidateNameInput] = useState('')
  const [candidateNoteInput, setCandidateNoteInput] = useState('')

  useEffect(() => {
    setCandidateListOpen(false)
    setCandidateStashes([])
    setSelectedCandidate(null)
  }, [primary.id])

  const makeApiErrorInfo = useCallback((request: string, err: unknown): ApiUnitErrorInfo => ({
    checkedAt: new Date().toISOString(),
    page: pageName,
    request,
    error: err instanceof Error ? err.message : String(err),
  }), [pageName])

  const minOrderDate = toIsoDateLocal(new Date())

  const channel = useMemo<SecondaryCompetitorChannel>(
    () =>
      competitorChannels.find((ch) => ch.id === channelId)
      ?? competitorChannels[0]
      ?? { id: '', label: '경쟁사', priceSkew: 1, qtySkew: 1 },
    [channelId, competitorChannels],
  )

  const selfCol = useMemo(() => buildSalesKpiColumn('self', primary, secondary, channel), [primary, secondary, channel])
  const compCol = useMemo(() => buildSalesKpiColumn('competitor', primary, secondary, channel), [primary, secondary, channel])

  const selectedStart = normalizeMonthKey(periodStart)
  const selectedEnd = normalizeMonthKey(periodEnd)
  useEffect(() => {
    if (prefillFromSnapshot != null) return
    setDailyMeanClient(null)
  }, [primary.id, selectedEnd, selectedStart, prefillFromSnapshot])

  useEffect(() => {
    setUnitCostInput(Math.max(0, Math.round(selfCol.avgCost ?? 0)))
    setUnitPriceInput(Math.max(0, Math.round(selfCol.avgPrice)))
    setExpectedFeeRatePct(Math.max(0, Math.round((selfCol.feeRatePct ?? 0) * 10) / 10))
  }, [primary.id, selfCol.avgCost, selfCol.avgPrice, selfCol.feeRatePct])

  useEffect(() => {
    setLeadTimeStartDate((s) => (s < minOrderDate ? minOrderDate : s))
  }, [minOrderDate, primary.id])

  useEffect(() => {
    setLeadTimeEndDate((e) => (e < leadTimeStartDate ? leadTimeStartDate : e))
  }, [leadTimeStartDate])

  const leadTimeDays = useMemo(
    () => daysInclusiveBetween(leadTimeStartDate, leadTimeEndDate),
    [leadTimeEndDate, leadTimeStartDate],
  )

  /** 기대 일평균은 선택 시작월부터 차기 오더 입고월까지의 예측 구간 평균으로 산출. */
  const forecastMeanPeriodEnd = leadTimeEndDate.slice(0, 7)
  /** 사이즈별 판매예측(EA) 구간 일수: 금번 오더 입고일~차기 오더 입고일(양끝 포함). */
  const forecastSalesHorizonDays = leadTimeDays

  const clientStock = useMemo(
    () =>
      computeClientStockOrder({
        monthlySalesTrend: primary.monthlySalesTrend,
        periodStart: selectedStart,
        periodEnd: selectedEnd,
        forecastPeriodEnd: forecastMeanPeriodEnd,
        serviceLevelPct,
        leadTimeDays,
        safetyStockMode,
        manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
        dailyMeanClient,
        availableStock: primary.availableStock,
        price: primary.price,
      }),
    [
      primary.monthlySalesTrend,
      primary.availableStock,
      primary.price,
      selectedStart,
      selectedEnd,
      forecastMeanPeriodEnd,
      serviceLevelPct,
      leadTimeDays,
      safetyStockMode,
      manualSafetyStock,
      dailyMeanClient,
    ],
  )

  const forecastInputs: SecondaryForecastInputs = {
    trendDailyMean: clientStock.trendDailyMean,
    dailyMean: dailyMeanClient ?? clientStock.forecastDailyMean,
    sigma: clientStock.sigma,
    serviceLevelPct,
    leadTimeStartDate,
    leadTimeEndDate,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
  }
  const forecastDerived: SecondaryForecastDerived = {
    safetyStock: clientStock.safetyStock,
    recommendedOrderQty: clientStock.safetyRecQty,
    expectedOrderAmount: clientStock.safetyExpectedOrderAmount,
    expectedSalesAmount: clientStock.safetyExpectedSalesAmount,
    expectedOpProfit: clientStock.safetyExpectedOpProfit,
  }

  const currentStockBySize = forecastCalc?.display.currentStockQtyBySize ?? []
  const expectedInboundBySize = forecastCalc?.display.expectedInboundOrderBalanceBySize ?? []

  /** 재고·오더잔량 등 `display`만 사용. 판매예측·추천수량·표 금액은 `clientStock` 연산. */
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const params = {
          productId: primary.id,
          periodStart: selectedStart,
          periodEnd: selectedEnd,
          forecastPeriodEnd: forecastMeanPeriodEnd,
          serviceLevelPct,
          leadTimeDays,
          safetyStockMode,
          manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
          ...(dailyMeanClient != null ? { dailyMean: dailyMeanClient } : {}),
        }
        const result = await dashboardApi.getSecondaryStockOrderCalc(params)
        if (!alive) return
        setForecastCalc(result)
        setForecastCalcError(null)
      } catch (err) {
        if (!alive) return
        setForecastCalc(null)
        setForecastCalcError(
          makeApiErrorInfo(
            `getSecondaryStockOrderCalc(${JSON.stringify({ productId: primary.id, periodStart: selectedStart, periodEnd: selectedEnd, forecastPeriodEnd: forecastMeanPeriodEnd, serviceLevelPct, leadTimeDays, safetyStockMode, manualSafetyStock })})`,
            err,
          ),
        )
      }
    })()
    return () => {
      alive = false
    }
  }, [
    dailyMeanClient,
    leadTimeDays,
    makeApiErrorInfo,
    manualSafetyStock,
    primary.id,
    safetyStockMode,
    selectedEnd,
    selectedStart,
    forecastMeanPeriodEnd,
    serviceLevelPct,
  ])

  const stockDisplayKey = useMemo(() => {
    const d = forecastCalc?.display
    if (!d) return ''
    return [
      d.currentStockQtyTotal,
      d.totalOrderBalanceTotal,
      d.expectedInboundOrderBalanceTotal,
      ...d.currentStockQtyBySize,
      ...d.totalOrderBalanceBySize,
      ...d.expectedInboundOrderBalanceBySize,
    ].join('|')
  }, [forecastCalc])

  /** 스냅샷에 저장된 사이즈별 확정 수량 — 없으면 아래 연산 recommendedQty 사용 */
  const snapshotConfirmBySize = useMemo((): Record<string, number> => {
    if (prefillFromSnapshot == null) return {}
    const rows = prefillFromSnapshot?.drawer2?.sizeRows
    if (!rows?.length) {
      throw new Error('스냅샷 sizeRows 누락')
    }
    const out: Record<string, number> = {}
    for (const r of rows) {
      if (typeof r.confirmQty !== 'number' || !Number.isFinite(r.confirmQty)) {
        throw new Error(`스냅샷 confirmQty 누락: ${r.size}`)
      }
      out[r.size] = Math.max(0, Math.round(r.confirmQty))
    }
    return out
  }, [prefillFromSnapshot])

  useEffect(() => {
    setConfirmBySize({})
  }, [primary.id, prefillFromSnapshot])

  useEffect(() => {
    if (prefillFromSnapshot != null) return
    setConfirmBySize({})
  }, [
    prefillFromSnapshot,
    bufferStock,
    dailyMeanClient,
    leadTimeEndDate,
    leadTimeStartDate,
    manualSafetyStock,
    safetyStockMode,
    selectedEnd,
    selectedStart,
    selfWeightPct,
    serviceLevelPct,
    stockDisplayKey,
  ])

  useEffect(() => {
    const d2 = prefillFromSnapshot?.drawer2
    if (!d2) {
      setPrefillError(null)
      return
    }
    if (!d2.competitorChannelId) {
      setPrefillError('스냅샷 competitorChannelId 누락')
      return
    }
    if (typeof d2.bufferStock !== 'number' || !Number.isFinite(d2.bufferStock)) {
      setPrefillError('스냅샷 bufferStock 누락')
      return
    }
    if (typeof d2.selfWeightPct !== 'number' || !Number.isFinite(d2.selfWeightPct)) {
      setPrefillError('스냅샷 selfWeightPct 누락')
      return
    }
    if (typeof d2.llmPrompt !== 'string' || typeof d2.llmAnswer !== 'string') {
      setPrefillError('스냅샷 LLM 필드 누락')
      return
    }
    const si = d2.stockInputs
    if (
      !si
      || !si.leadTimeStartDate
      || !si.leadTimeEndDate
      || typeof si.dailyMean !== 'number'
      || !Number.isFinite(si.dailyMean)
    ) {
      setPrefillError('스냅샷 stockInputs 누락')
      return
    }
    setPrefillError(null)
        onChannelChange(d2.competitorChannelId)
    setBufferStock(d2.bufferStock)
    setSelfWeightPct(d2.selfWeightPct)
    setLlmPrompt(d2.llmPrompt)
    setLlmAnswer(d2.llmAnswer)
    setLeadTimeStartDate(si.leadTimeStartDate)
    setLeadTimeEndDate(si.leadTimeEndDate)
    setDailyMeanClient(si.dailyMean)
  }, [prefillFromSnapshot, primary.id, onChannelChange])

  const sizeAgg = useMemo(() => {
    const mix = mergePrimarySecondarySizeMix(primary, secondary)
    const sSum = mix.reduce((a, r) => a + r.ratio, 0)
    const cSum = mix.reduce((a, r) => a + r.competitorRatio, 0)
    const wSelf = selfWeightPct / 100
    const wComp = 1 - wSelf
    const raw = mix.map((r) => {
      const selfShare = sSum > 0 ? (r.ratio / sSum) * 100 : 0
      const compShare = cSum > 0 ? (r.competitorRatio / cSum) * 100 : 0
      const blended = selfShare * wSelf + compShare * wComp
      return {
        size: r.size,
        selfSharePct: selfShare,
        competitorSharePct: compShare,
        blendedRaw: blended,
        avgPrice: r.avgPrice,
      }
    })
    const blendSum = raw.reduce((a, r) => a + r.blendedRaw, 0) || 1
    return raw.map((r) => ({
      size: r.size,
      selfSharePct: r.selfSharePct,
      competitorSharePct: r.competitorSharePct,
      blendedSharePct: (r.blendedRaw / blendSum) * 100,
      avgPrice: r.avgPrice,
    }))
  }, [primary, secondary, selfWeightPct])

  const sizeRows = useMemo(() => {
    const dailyMeanEa = dailyMeanClient ?? clientStock.forecastMuRaw
    const totalQtyWindow = dailyMeanEa * forecastSalesHorizonDays

    return sizeAgg.map((row, i) => {
      const forecastQty = Math.ceil((totalQtyWindow * row.blendedSharePct) / 100)
      /** 여유재고는 일수(일분) — EA로 환산: 일평균 기대 × 일수 × 사이즈비중, 판매예측과 동일하게 ceil */
      const bufferQtyEa = Math.ceil((dailyMeanEa * bufferStock * row.blendedSharePct) / 100)
      const stock = currentStockBySize[i] ?? 0
      const inbound = expectedInboundBySize[i] ?? 0
      const recommendedQty = Math.max(0, Math.round(forecastQty - stock - inbound + bufferQtyEa))
      const confirmQty =
        confirmBySize[row.size] ?? snapshotConfirmBySize[row.size] ?? recommendedQty
      return { ...row, forecastQty, recommendedQty, confirmQty }
    })
  }, [
    sizeAgg,
    clientStock.forecastMuRaw,
    dailyMeanClient,
    forecastSalesHorizonDays,
    currentStockBySize,
    expectedInboundBySize,
    bufferStock,
    confirmBySize,
    snapshotConfirmBySize,
  ])

  /** 사용자가 덮어쓴 사이즈만 확정 셀 강조 */
  const manualConfirmDerived = useMemo(() => {
    const o: Record<string, true> = {}
    for (const k of Object.keys(confirmBySize)) {
      o[k] = true
    }
    return o
  }, [confirmBySize])

  const [dailyTrendSeries, setDailyTrendSeries] = useState<Array<{
    idx: number
    date: string
    month: string
    sales: number
    stockBar: number
    inboundAccumBar: number
    selfSales: number | null
    competitorSales: number | null
    isForecast: boolean
  }>>([])

  useEffect(() => {
    const reqSeq = dailyTrendReqSeqRef.current + 1
    dailyTrendReqSeqRef.current = reqSeq
    void (async () => {
      try {
        const params = {
          productId: primary.id,
          startMonth: selectedStart,
          leadTimeDays,
        }
        const series = await dashboardApi.getSecondaryDailyTrend(params)
        if (dailyTrendReqSeqRef.current !== reqSeq) return
        if (!series.length) throw new Error('일별 판매추이 데이터가 비어 있습니다.')
        setDailyTrendSeries(series)
        setDailyTrendError(null)
      } catch (err) {
        if (dailyTrendReqSeqRef.current !== reqSeq) return
        setDailyTrendSeries([])
        setDailyTrendError(
          makeApiErrorInfo(
            `getSecondaryDailyTrend(${JSON.stringify({ productId: primary.id, startMonth: selectedStart, leadTimeDays })})`,
            err,
          ),
        )
      }
    })()
  }, [leadTimeDays, makeApiErrorInfo, selectedStart, primary.id])

  const { periodShade: dailyPeriodShade, forecastShade: dailyForecastShade } = useMemo(
    () => buildShadeRanges(
      dailyTrendSeries.map((p) => ({ date: p.month, isForecast: p.isForecast })),
      selectedStart,
      selectedEnd,
    ),
    [dailyTrendSeries, selectedEnd, selectedStart],
  )

  const dailyTickIndices = useMemo(() => {
    const n = dailyTrendSeries.length
    if (n === 0) return [] as number[]
    const targetTicks = 26
    const step = Math.max(1, Math.ceil(n / targetTicks))
    const ticks: number[] = []
    for (let i = 0; i < n; i += step) ticks.push(dailyTrendSeries[i]!.idx)
    const last = dailyTrendSeries[n - 1]!.idx
    if (ticks[ticks.length - 1] !== last) ticks.push(last)
    return ticks
  }, [dailyTrendSeries])

  /** 일간 판매추이 사이즈 선택 — API는 상품 합계만 주고, 비중으로 스케일 */
  const dailyTrendSizeOptions = useMemo(() => {
    const mix = primary.sizeMix
    if (!mix.length) return []
    const sum = mix.reduce((a, r) => a + r.ratio, 0) || 1
    return mix.map((r) => ({
      id: r.size,
      label: r.size,
      share: r.ratio / sum,
    }))
  }, [primary.sizeMix])

  const buildSnapshot = useCallback((): OrderSnapshotDocumentV1 => ({
      schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
      productId: primary.id,
      savedAt: new Date().toISOString(),
      context: {
        periodStart,
        periodEnd,
        forecastMonths,
        dailyTrendStartMonth: selectedStart,
        dailyTrendLeadTimeDays: leadTimeDays,
      },
      drawer1: {
        summary: (() => {
          const { monthlySalesTrend, ...rest } = primary
          void monthlySalesTrend
          return rest
        })(),
      },
      drawer2: {
        secondary,
        competitorChannelId: channel.id,
        competitorChannelLabel: channel.label,
        minOpMarginPct: null,
        salesSelf: selfCol,
        salesCompetitor: compCol,
        stockInputs: forecastInputs,
        stockDerived: forecastDerived,
        selfWeightPct,
        sizeForecastSource: 'forecastQty',
        bufferStock,
        llmPrompt,
        llmAnswer,
        confirmedTotals: (() => {
          const orderQty = sizeRows.reduce((acc, r) => acc + Math.max(0, Math.round(r.confirmQty)), 0)
          const perUnitFee = Math.round((unitPriceInput * expectedFeeRatePct) / 100)
          const perUnitOpMargin = unitPriceInput - unitCostInput - perUnitFee
          const expectedSalesAmount = orderQty * unitPriceInput
          const expectedOpProfit = orderQty * perUnitOpMargin
          return {
            orderQty,
            expectedSalesAmount,
            expectedOpProfit,
            expectedOpProfitRatePct: expectedSalesAmount > 0
              ? (expectedOpProfit / expectedSalesAmount) * 100
              : null,
          }
        })(),
        sizeRows: sizeRows.map((r) => ({
          size: r.size,
          selfSharePct: r.selfSharePct,
          competitorSharePct: r.competitorSharePct,
          blendedSharePct: r.blendedSharePct,
          forecastQty: r.forecastQty,
          recommendedQty: r.recommendedQty,
          confirmQty: r.confirmQty,
        })),
      },
    }), [
    primary,
    periodStart,
    periodEnd,
    forecastMonths,
    secondary,
    channel.id,
    channel.label,
    selfCol,
    compCol,
    forecastInputs,
    forecastDerived,
    llmPrompt,
    llmAnswer,
    selfWeightPct,
    bufferStock,
    unitPriceInput,
    unitCostInput,
    expectedFeeRatePct,
    sizeRows,
    selectedStart,
    leadTimeDays,
  ])

  const refreshCandidates = useCallback(async () => {
    const stashes = await dashboardApi.getCandidateStashes()
    setCandidateStashes(stashes.map((s) => ({
      uuid: s.uuid,
      name: s.name,
      note: s.note,
      dbCreatedAt: s.dbCreatedAt,
    })))
    return stashes
  }, [primary.id])

  if (prefillError) {
    throw new Error(prefillError)
  }

  const confirmOrder = useCallback(async () => {
    if (selectedCandidate == null) return
    const snap = buildSnapshot()
    setCandidateActionLoading(true)
    try {
      await dashboardApi.appendCandidateItem({
        stashUuid: selectedCandidate.uuid,
        productId: primary.id,
        details: snap,
        isLatestLlmComment: false,
      })
    } finally {
      setCandidateActionLoading(false)
    }
  }, [buildSnapshot, primary.id, selectedCandidate])

  const saveCandidateItemChanges = useCallback(async () => {
    if (candidateItemContext == null) return
    const snap = buildSnapshot()
    setCandidateActionLoading(true)
    try {
      await dashboardApi.updateCandidateItem({
        itemUuid: candidateItemContext.itemUuid,
        details: snap,
        isLatestLlmComment: false,
      })
      candidateItemContext.onSaved?.()
    } finally {
      setCandidateActionLoading(false)
    }
  }, [buildSnapshot, candidateItemContext])

  const createCandidate = useCallback(async () => {
    setCandidateActionLoading(true)
    try {
      const created = await dashboardApi.createCandidateStash({
        productId: primary.id,
        name: candidateNameInput.trim(),
        note: candidateNoteInput.trim(),
      })
      await refreshCandidates()
      setSelectedCandidate({
        uuid: created.uuid,
        name: created.name,
        dbCreatedAt: created.dbCreatedAt,
      })
      setCandidateNameInput('')
      setCandidateNoteInput('')
      setCandidateListOpen(false)
    } finally {
      setCandidateActionLoading(false)
    }
  }, [candidateNameInput, candidateNoteInput, primary.id, refreshCandidates])

  const handleConfirmQtyChange = useCallback((size: string, next: number, recommendedQty: number) => {
    const v = Math.max(0, Math.round(Number.isFinite(next) ? next : 0))
    const rec = Math.max(0, Math.round(recommendedQty))
    const baseline = snapshotConfirmBySize[size] ?? rec
    if (v === baseline) {
      setConfirmBySize((prev) => {
        if (!(size in prev)) return prev
        const { [size]: removed, ...rest } = prev
        void removed
        return rest
      })
      return
    }
    setConfirmBySize((prev) => ({ ...prev, [size]: v }))
  }, [snapshotConfirmBySize])

  const recommendedQtyTotal = useMemo(
    () => sizeRows.reduce((acc, r) => acc + Math.max(0, Math.round(r.recommendedQty)), 0),
    [sizeRows],
  )
  const confirmedQtyTotal = useMemo(
    () => sizeRows.reduce((acc, r) => acc + Math.max(0, Math.round(r.confirmQty)), 0),
    [sizeRows],
  )
  const perUnitFee = Math.round((unitPriceInput * expectedFeeRatePct) / 100)
  const perUnitOpMargin = unitPriceInput - unitCostInput - perUnitFee
  /** 예상 열 금액·이익은 추천 수량 합 × 카드 입력 단가·원가·수수료와 동일 규칙 */
  const forecastExpectedSalesFromRec = recommendedQtyTotal * unitPriceInput
  const forecastOpProfitFromRec = recommendedQtyTotal * perUnitOpMargin
  const confirmedExpectedSales = confirmedQtyTotal * unitPriceInput
  const confirmedExpectedOpProfit = confirmedQtyTotal * perUnitOpMargin

  const getHelpTooltipId = (id: SecondaryHelpId) => {
    switch (id) {
      case 'confirmOrder':
        return confirmOrderHelpId
      case 'forecastQtyCalc':
        return forecastQtyCalcHelpId
      case 'expectedOpProfitRate':
        return expectedOpProfitRateHelpId
      case 'totalOrderBalance':
        return totalOrderBalanceHelpId
      case 'expectedInboundOrderBalance':
        return expectedInboundOrderBalanceHelpId
      case 'sizeRecQty':
        return sizeRecQtyHelpId
      case 'salesForecastSizeOrder':
        return salesForecastSizeOrderHelpId
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.metaFilterRow}>
        <div className={styles.metaFilterMetaBlock}>
          <ComponentErrorBoundary page={pageName} unit="ProductMetaCard">
            <ProductMetaCard primary={primary} />
          </ComponentErrorBoundary>
        </div>
        <div className={styles.metaFilterActionBlock}>
          <div className={`${styles.card} ${styles.metaFilterActionCard}`}>
            <div className={styles.metaFilterActionGrid}>
              {candidateItemContext != null ? (
                <InnerCandidateActionCard
                  context={candidateItemContext}
                  loading={candidateActionLoading}
                  onSave={saveCandidateItemChanges}
                />
              ) : (
                <CandidateStashOrderActionCard
                  selectedTitle={selectedCandidate?.name ?? '-'}
                  selectedSub={
                    selectedCandidate?.dbCreatedAt
                      ? formatDateTimeMinute(selectedCandidate.dbCreatedAt)
                      : '-'
                  }
                  loading={candidateActionLoading}
                  onOpenStashPicker={async () => {
                    setCandidateListOpen((prev) => !prev)
                    setCandidateActionLoading(true)
                    try {
                      await refreshCandidates()
                    } finally {
                      setCandidateActionLoading(false)
                    }
                  }}
                  onConfirmOrder={confirmOrder}
                  portalHelp={portalHelp}
                  confirmOrderHelpId={confirmOrderHelpId}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.salesStockAiRow}>
        <ComponentErrorBoundary page={pageName} unit="SalesForecastCard">
          <SalesForecastCard
            forecast={{
              inputs: forecastInputs,
              error: forecastCalcError,
              computed: {
                recommendedOrderQtyTotal: recommendedQtyTotal,
                confirmedOrderQtyTotal: confirmedQtyTotal,
                forecastExpectedSales: forecastExpectedSalesFromRec,
                forecastOpProfit: forecastOpProfitFromRec,
                confirmedExpectedSales,
                confirmedOpProfit: confirmedExpectedOpProfit,
              },
            }}
            orderSettings={{
              currentOrderDate: leadTimeStartDate,
              nextOrderDate: leadTimeEndDate,
              minOrderDate,
              bufferStock,
              unitCost: unitCostInput,
              unitPrice: unitPriceInput,
              expectedFeeRatePct,
            }}
            actions={{
              onCurrentOrderDateChange: (next) => {
                const v = next < minOrderDate ? minOrderDate : next
                setLeadTimeStartDate(v)
                setLeadTimeEndDate((e) => (e < v ? v : e))
              },
              onNextOrderDateChange: (next) => {
                let v = next < minOrderDate ? minOrderDate : next
                if (v < leadTimeStartDate) v = leadTimeStartDate
                setLeadTimeEndDate(v)
              },
              onBufferStockChange: setBufferStock,
              onUnitCostChange: setUnitCostInput,
              onUnitPriceChange: setUnitPriceInput,
              onExpectedFeeRatePctChange: setExpectedFeeRatePct,
            }}
            help={{
              labelIds: {
                forecastQtyCalc: forecastQtyCalcHelpId,
                expectedOpProfitRate: expectedOpProfitRateHelpId,
              },
              portal: portalHelp,
            }}
          />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary page={pageName} unit="AiMockCard">
          <AiMockCard
            ai={{
              answer: llmAnswer,
            }}
          />
        </ComponentErrorBoundary>
      </div>

      <ComponentErrorBoundary page={pageName} unit="SalesTrendDailyCard">
        <SalesTrendDailyCard
          productId={primary.id}
          competitorChannelLabel={channel.label}
          sizeOptions={dailyTrendSizeOptions}
          trend={{
            series: dailyTrendSeries,
            tickIndices: dailyTickIndices,
            periodShade: dailyPeriodShade,
            forecastShade: dailyForecastShade,
            error: dailyTrendError,
          }}
        />
      </ComponentErrorBoundary>

      <ComponentErrorBoundary page={pageName} unit="SizeOrderCard">
        <SizeOrderCard
          sizeOrder={{
            channelLabel: channel.label,
            selfWeightPct,
            sizeRows,
            totalOrderBalanceHelpId,
            expectedInboundOrderBalanceHelpId,
            sizeRecQtyHelpId,
            salesForecastHelpId: salesForecastSizeOrderHelpId,
            currentStockQty: forecastCalc?.display.currentStockQtyTotal ?? 0,
            totalOrderBalanceQty: forecastCalc?.display.totalOrderBalanceTotal ?? 0,
            expectedInboundOrderBalanceQty: forecastCalc?.display.expectedInboundOrderBalanceTotal ?? 0,
            currentStockQtyBySize: forecastCalc?.display.currentStockQtyBySize ?? [],
            totalOrderBalanceBySize: forecastCalc?.display.totalOrderBalanceBySize ?? [],
            expectedInboundOrderBalanceBySize: forecastCalc?.display.expectedInboundOrderBalanceBySize ?? [],
            manualConfirmBySize: manualConfirmDerived,
          }}
          actions={{
            onSelfWeightPctChange: setSelfWeightPct,
            onConfirmQtyChange: handleConfirmQtyChange,
          }}
          help={portalHelp}
        />
      </ComponentErrorBoundary>
      <PortalHelpPopoverLayer
        help={portalHelp}
        popoverClassName={commonStyles.helpPopoverPortal}
        getTooltipId={getHelpTooltipId}
      >
        {(hid) => (
          <>
            {hid === 'confirmOrder' && (
              <p>{KO.hintSnapshot}</p>
            )}
            {hid === 'forecastQtyCalc' && (
              <p>{KO.helpForecastQtyCalc}</p>
            )}
            {hid === 'expectedOpProfitRate' && (
              <BlockMath math={KO.helpExpectedOpProfitRateLatex} />
            )}
            {hid === 'totalOrderBalance' && (
              <p>{KO.helpTotalOrderBalance}</p>
            )}
            {hid === 'expectedInboundOrderBalance' && (
              <p>{KO.helpExpectedInboundOrderBalance}</p>
            )}
            {hid === 'sizeRecQty' && (
              <p>{KO.helpSizeRecQty}</p>
            )}
            {hid === 'salesForecastSizeOrder' && (
              <p>{KO.helpSalesForecastSizeOrder}</p>
            )}
          </>
        )}
      </PortalHelpPopoverLayer>
      {candidateListOpen &&
        createPortal(
          <div
            className={styles.candidateModalBackdrop}
            role="presentation"
            onClick={() => setCandidateListOpen(false)}
          >
            <div
              className={styles.candidateModal}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.candidatePanel}>
                <div className={styles.candidateModalHeader}>
                  <h4 className={styles.candidateModalTitle}>{KO.btnSelectCandidate}</h4>
                  <button
                    type="button"
                    className={`${commonStyles.iconCloseButton} ${styles.candidateModalClose}`}
                    onClick={() => setCandidateListOpen(false)}
                    aria-label="후보군 선택 닫기"
                  />
                </div>
                <div className={styles.candidateCreateForm}>
                  <div className={styles.candidateCreateField}>
                    <label className={styles.candidateCreateLabel} htmlFor="candidate-name-input">
                      {KO.labelCandidateName}
                    </label>
                    <input
                      id="candidate-name-input"
                      type="text"
                      className={styles.candidateTextInput}
                      placeholder={KO.labelCandidateName}
                      value={candidateNameInput}
                      onChange={(e) => setCandidateNameInput(e.target.value)}
                    />
                  </div>
                  <div className={styles.candidateCreateField}>
                    <label className={styles.candidateCreateLabel} htmlFor="candidate-note-input">
                      {KO.labelCandidateNote}
                    </label>
                    <input
                      id="candidate-note-input"
                      type="text"
                      className={styles.candidateTextInput}
                      placeholder={KO.labelCandidateNote}
                      value={candidateNoteInput}
                      onChange={(e) => setCandidateNoteInput(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary} ${styles.btnViewportAdaptive}`}
                    onClick={createCandidate}
                    disabled={candidateActionLoading}
                  >
                    {KO.btnCreateCandidateConfirm}
                  </button>
                </div>
                <div className={styles.candidateList}>
                  {candidateStashes.length === 0 ? (
                    <div className={styles.candidateEmptyState}>
                      <p className={styles.candidateEmptyTitle}>{KO.msgCandidateEmpty}</p>
                      <p className={styles.metaFilterActionHint}>상단에서 이름과 비고를 입력해 후보군을 먼저 생성하세요.</p>
                    </div>
                  ) : (
                    candidateStashes.map((row) => (
                      <button
                        key={row.uuid}
                        type="button"
                        className={`${styles.candidateListItem} ${selectedCandidate?.uuid === row.uuid ? styles.candidateListItemActive : ''}`}
                        onClick={() => {
                          setSelectedCandidate({
                            uuid: row.uuid,
                            name: row.name,
                            dbCreatedAt: row.dbCreatedAt,
                          })
                          setCandidateListOpen(false)
                        }}
                      >
                        <div className={styles.candidateListItemTop}>
                          <span className={styles.candidateListItemName}>{row.name}</span>
                          {selectedCandidate?.uuid === row.uuid && (
                            <span className={styles.candidateListItemBadge}>선택됨</span>
                          )}
                        </div>
                        <span className={styles.candidateListItemMeta}>
                          생성일: {formatDateTimeMinute(row.dbCreatedAt)}
                        </span>
                        <span className={styles.candidateListItemDesc}>
                          {row.note?.trim() ? row.note : KO.msgNoNote}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
