import { Component, type ErrorInfo } from 'react'
import { ApiUnitErrorBadge } from './ApiUnitErrorBadge'
import styles from './ComponentErrorBoundary.module.css'

export type Props = {
  page: string
  unit: string
  children: React.ReactNode
}

export type State = {
  error: Error | null
  checkedAt: string
}

export class ComponentErrorBoundary extends Component<Props, State> {
  public state: State = {
    error: null,
    checkedAt: '',
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      error,
      checkedAt: new Date().toISOString(),
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) : void {
    void error
    void errorInfo
    // noop: 화면 격리를 우선하고 로깅은 추후 연결
  }

  public render(): React.ReactNode {
    const { error, checkedAt }: State = this.state
    const { page, unit, children }: Readonly<Props> = this.props

    if (!error) return children

    return (
      <div
        className={styles.fallback}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <strong>{unit}</strong>
        <ApiUnitErrorBadge
          error={{
            checkedAt,
            page,
            request: `render:${unit}`,
            error: error.message || String(error),
          }}
        />
      </div>
    )
  }
}
