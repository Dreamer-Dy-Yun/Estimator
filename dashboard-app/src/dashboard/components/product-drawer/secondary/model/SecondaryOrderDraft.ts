export type SecondaryOrderDraftMode = 'live' | 'snapshot'

export type SecondaryOrderDraftInput = {
  mode: SecondaryOrderDraftMode
  manualConfirmBySize: Record<string, number>
  snapshotConfirmBySize?: Record<string, number>
}

export class SecondaryOrderDraft {
  private readonly mode: SecondaryOrderDraftMode
  private readonly manualConfirmBySize: Record<string, number>
  private readonly snapshotConfirmBySize: Record<string, number>

  constructor({
    mode,
    manualConfirmBySize,
    snapshotConfirmBySize = {},
  }: SecondaryOrderDraftInput) {
    this.mode = mode
    this.manualConfirmBySize = manualConfirmBySize
    this.snapshotConfirmBySize = snapshotConfirmBySize
  }

  confirmQty(size: string, recommendedQty: number): number {
    return this.manualConfirmBySize[size] ?? this.baselineQty(size, recommendedQty)
  }

  baselineQty(size: string, recommendedQty: number): number {
    if (this.mode === 'snapshot') {
      return this.snapshotConfirmBySize[size] ?? recommendedQty
    }
    return recommendedQty
  }

  manualFlags(): Record<string, true> {
    const flags: Record<string, true> = {}
    for (const size of Object.keys(this.manualConfirmBySize)) {
      flags[size] = true
    }
    return flags
  }

  nextManualConfirmBySize(size: string, nextQty: number, recommendedQty: number): Record<string, number> {
    const roundedQty: number = Math.max(0, Math.round(Number.isFinite(nextQty) ? nextQty : 0))
    const baseline: number = Math.max(0, Math.round(this.baselineQty(size, recommendedQty)))

    if (roundedQty === baseline) {
      if (!(size in this.manualConfirmBySize)) return this.manualConfirmBySize
      const { [size]: _removed, ...rest }: Record<string, number> = this.manualConfirmBySize
      void _removed
      return rest
    }

    return {
      ...this.manualConfirmBySize,
      [size]: roundedQty,
    }
  }
}
