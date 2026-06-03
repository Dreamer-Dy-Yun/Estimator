import { createContext, useContext } from 'react'
import type { ScatterGridMetaForDisplay, ScatterGridPointRadiusPolicy } from '../../utils/scatterGridDisplay'
import { getScatterGridCellPointRadius } from '../../utils/scatterGridDisplay'

export interface DashboardDisplayPolicy {
  getScatterPointRadius: (
    meta: ScatterGridMetaForDisplay | null | undefined,
    chartWidth: number,
    chartHeight: number,
  ) => number
}

export interface DashboardDisplayPolicyConfig {
  scatterPointRadius: ScatterGridPointRadiusPolicy
}

export class InjectedDashboardDisplayPolicy implements DashboardDisplayPolicy {
  private readonly scatterPointRadiusPolicy: ScatterGridPointRadiusPolicy

  constructor(config: DashboardDisplayPolicyConfig) {
    this.scatterPointRadiusPolicy = config.scatterPointRadius
  }

  getScatterPointRadius(
    meta: ScatterGridMetaForDisplay | null | undefined,
    chartWidth: number,
    chartHeight: number,
  ): number {
    const normalizedChartWidth: number = Math.max(1, Math.floor(chartWidth))
    const normalizedChartHeight: number = Math.max(1, Math.floor(chartHeight))
    return getScatterGridCellPointRadius(
      meta,
      normalizedChartWidth,
      normalizedChartHeight,
      this.scatterPointRadiusPolicy,
    )
  }
}

export const DashboardDisplayPolicyContext: React.Context<DashboardDisplayPolicy | null> = createContext<DashboardDisplayPolicy | null>(null)

export function useDashboardDisplayPolicy(): DashboardDisplayPolicy {
  const policy: DashboardDisplayPolicy | null = useContext(DashboardDisplayPolicyContext)
  if (!policy) throw new Error('DashboardDisplayPolicyProvider is required.')
  return policy
}
