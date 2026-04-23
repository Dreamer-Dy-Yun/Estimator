import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ApiUnitErrorBadge } from './ApiUnitErrorBadge'

type Props = {
  page: string
  unit: string
  children: ReactNode
}

type State = {
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

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void error
    void errorInfo
    // noop: 화면 격리를 우선하고 로깅은 추후 연결
  }

  public render() {
    const { error, checkedAt } = this.state
    const { page, unit, children } = this.props

    if (!error) return children

    return (
      <div
        style={{
          border: '1px solid #fecaca',
          background: '#fff1f2',
          borderRadius: 8,
          padding: 10,
          color: '#7f1d1d',
          fontSize: 12,
        }}
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
