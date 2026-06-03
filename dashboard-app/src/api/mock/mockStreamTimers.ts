export interface MockStreamTimers<Event> {
  emit: (buildEvent: () => Event, delay: number) => void
  close: () => void
}

export function createMockStreamTimers<Event>(
  listener: (event: Event) => void,
): MockStreamTimers<Event> {
  const timers: ReturnType<typeof globalThis.setTimeout>[] = []

  const emit: (buildEvent: () => Event, delay: number) => void = (buildEvent: () => Event, delay: number) : void => {
    timers.push(globalThis.setTimeout(() : void => listener(buildEvent()), delay))
  }

  const close: () => void = () : void => {
    timers.forEach((timer: ReturnType<typeof setTimeout>) : void => globalThis.clearTimeout(timer))
  }

  return { emit, close }
}
