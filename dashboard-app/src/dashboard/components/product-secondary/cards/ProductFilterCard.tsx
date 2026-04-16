import type { SecondaryCompetitorChannel } from '../../../../api'
import type { ApiUnitErrorInfo } from '../../../../types'
import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import { KO } from '../ko'
import styles from '../productSecondaryPanel.module.css'

type Props = {
  filter: {
    channelId: string
    minOpMarginPct: number
    competitorChannels: SecondaryCompetitorChannel[]
    error: ApiUnitErrorInfo | null
  }
  actions: {
    onChannelChange: (next: string) => void
    onMinOpMarginPctChange: (next: number) => void
  }
}

export function ProductFilterCard({ filter, actions }: Props) {
  const { channelId, minOpMarginPct, competitorChannels, error } = filter
  const { onChannelChange, onMinOpMarginPctChange } = actions

  return (
    <div className={`${styles.card} ${styles.filterCard}`}>
      <div className={styles.controlsRow}>
        <label className={styles.control}>
          <span>
            {KO.labelCompetitorChannel}
            <ApiUnitErrorBadge error={error} />
          </span>
          <select value={channelId} onChange={(e) => onChannelChange(e.target.value)}>
            {competitorChannels.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.label}</option>
            ))}
          </select>
        </label>
        <label className={styles.control}>
          {KO.labelMinOpMargin}
          <input
            type="number"
            step={0.1}
            value={minOpMarginPct}
            onChange={(e) => onMinOpMarginPctChange(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  )
}
