import { NavLink } from 'react-router-dom'
import styles from './top-tabs.module.css'

const tabs = [
  { to: '/self', label: '자사 분석' },
  { to: '/competitor', label: '경쟁사 분석' },
  { to: '/order-sim', label: '오더 시뮬레이션' },
]

export const TopTabs = () => (
  <div className={styles.wrap}>
    {tabs.map((tab) => (
      <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
        {tab.label}
      </NavLink>
    ))}
  </div>
)
