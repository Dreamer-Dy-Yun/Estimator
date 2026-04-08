import type { PropsWithChildren } from 'react'
import styles from './panel.module.css'

export const SectionPanel = ({ title, children }: PropsWithChildren<{ title: string }>) => (
  <section className={styles.panel}>
    <header className={styles.head}>{title}</header>
    <div className={styles.body}>{children}</div>
  </section>
)
