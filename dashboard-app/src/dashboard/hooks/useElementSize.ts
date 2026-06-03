import { useLayoutEffect, useRef, useState } from 'react'

export type ElementSize = {
  width: number
  height: number
}

export function useElementSize<T extends HTMLElement>() : { ref: React.RefObject<T | null>; width: number; height: number; ready: boolean; } {
  const ref: React.RefObject<T | null> = useRef<T | null>(null)
  const [size, setSize]: [ElementSize, React.Dispatch<React.SetStateAction<ElementSize>>] = useState<ElementSize>({ width: 0, height: 0 })

  useLayoutEffect(() : (() => void) | undefined => {
    const el: T | null = ref.current
    if (!el) return

    const update: () => void = () : void => {
      const rect: DOMRect = el.getBoundingClientRect()
      const next: { width: number; height: number; } = {
        width: rect.width,
        height: rect.height,
      }
      setSize((prev: ElementSize) : ElementSize => (
        prev.width === next.width && prev.height === next.height ? prev : next
      ))
    }

    update()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () : void => window.removeEventListener('resize', update)
    }

    const ro: ResizeObserver = new ResizeObserver(() : void => update())
    ro.observe(el)
    return () : void => ro.disconnect()
  }, [])

  return {
    ref,
    width: size.width,
    height: size.height,
    ready: size.width > 0 && size.height > 0,
  }
}
