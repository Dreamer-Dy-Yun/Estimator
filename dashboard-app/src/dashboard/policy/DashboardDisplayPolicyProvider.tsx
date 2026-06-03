import type { DashboardDisplayPolicy } from './DashboardDisplayPolicy'
import { DashboardDisplayPolicyContext } from './DashboardDisplayPolicy'

export interface DashboardDisplayPolicyProviderProps {
  policy: DashboardDisplayPolicy
  children: React.ReactNode
}

export function DashboardDisplayPolicyProvider({
  policy,
  children,
}: DashboardDisplayPolicyProviderProps): React.JSX.Element {
  return (
    <DashboardDisplayPolicyContext.Provider value={policy}>
      {children}
    </DashboardDisplayPolicyContext.Provider>
  )
}
