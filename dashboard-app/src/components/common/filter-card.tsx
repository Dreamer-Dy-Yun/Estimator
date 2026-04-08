import styles from './filter-card.module.css'

type Props = { rows: Array<{ label: string; left?: string; right?: string; unit?: string }> }

export const FilterCard = ({ rows }: Props) => (
  <table className={styles.table}>
    <tbody>
      {rows.map((r) => (
        <tr key={r.label}>
          <th>{r.label}</th>
          <td>{r.left ?? ''}</td>
          <td className={styles.mid}>{r.right !== undefined ? '~' : ''}</td>
          <td>{r.right ?? ''}</td>
          <td className={styles.unit}>{r.unit ?? ''}</td>
        </tr>
      ))}
    </tbody>
  </table>
)
