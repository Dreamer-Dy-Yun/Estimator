import { useLayoutEffect, useRef, useState } from 'react'

type ElementSize = {
  width: number
  height: number
}

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      const next = {
        width: rect.width,
        height: rect.height,
      }
      setSize((prev) => (
        prev.width === next.width && prev.height === next.height ? prev : next
      ))
    }

    update()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }

    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return {
    ref,
    width: size.width,
    height: size.height,
    ready: size.width > 0 && size.height > 0,
  }
}
