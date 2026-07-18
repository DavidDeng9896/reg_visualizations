/**
 * Cold-start route module prefetch (Round 33).
 * After first paint, warm list + workspace route chunks so the first
 * Analysis open pays less for async imports. Uses a sentinel analysis id
 * that only triggers the route component resolve (store handles missing).
 */

import { warmIdle } from '@/shared/ui/warmIdle'

export function analysisRoutePrefetchPaths(): string[] {
  return ['/', '/analyses/__prefetch__']
}

export type RoutePrefetchRecord = {
  components?: Record<string, unknown> | null
}

export type RoutePrefetchLocation = {
  matched?: RoutePrefetchRecord[]
}

export type RoutePrefetchOptions = {
  idle?: (run: () => void) => void
}

/** Invoke lazy route component factories when present. */
export function warmMatchedComponents(loc: RoutePrefetchLocation): number {
  let warmed = 0
  for (const record of loc.matched ?? []) {
    for (const comp of Object.values(record.components ?? {})) {
      if (typeof comp === 'function') {
        try {
          void Promise.resolve((comp as () => unknown)())
          warmed += 1
        } catch {
          /* ignore load errors during idle warm */
        }
      }
    }
  }
  return warmed
}

export function scheduleRoutePrefetch(
  router: { resolve: (to: string) => unknown },
  options: RoutePrefetchOptions = {},
): void {
  const idle = options.idle ?? ((run: () => void) => warmIdle(run))
  idle(() => {
    for (const path of analysisRoutePrefetchPaths()) {
      warmMatchedComponents(router.resolve(path) as RoutePrefetchLocation)
    }
  })
}
