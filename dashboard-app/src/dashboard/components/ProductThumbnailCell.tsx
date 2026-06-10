import styles from './ProductThumbnailCell.module.css'

export type ProductThumbnailCellSize = 'analysis' | 'candidate'

export type ProductThumbnailCellProps = {
  thumbnailUrl: string | null
  alt: string
  size?: ProductThumbnailCellSize
}

export function ProductThumbnailCell({ thumbnailUrl, alt, size = 'analysis' }: ProductThumbnailCellProps) : React.JSX.Element {
  const className: string = [styles.thumbnailCell, styles[size]].join(' ')
  return (
    <span className={className}>
      {thumbnailUrl
        ? <img className={styles.image} src={thumbnailUrl} alt={alt} loading="lazy" decoding="async" />
        : <span className={styles.placeholder} role="img" aria-label="이미지 없음" />}
    </span>
  )
}
