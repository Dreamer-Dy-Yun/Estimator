interface MockStreamTimers<Event> {
  emit: (buildEvent: () => Event, delay: number) => void
  close: () => void
}

export function createMockStreamTimers<Event>(
  listener: (event: Event) => void,
): MockStreamTimers<Event> {
  const timers: ReturnType<typeof globalThis.setTimeout>[] = []

  const emit = (buildEvent: () => Event, delay: number) => {
    timers.push(globalThis.setTimeout(() => listener(buildEvent()), delay))
  }

  const close = () => {
    timers.forEach((timer) => globalThis.clearTimeout(timer))
  }

  return { emit, close }
}
