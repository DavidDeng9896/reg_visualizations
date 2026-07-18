/**
 * Cold-start route module prefetch (Round 33–34).
 *
 * Round 34: cold start only warms the list route. Prefetching the workspace
 * chunk from `/` pulled AnalysisWorkspaceView (+ sidebar/table shell deps)
 * before the user opened an analysis — wasteful on list-only sessions.
 * Workspace warm is scheduled from the list page after mount instead.
 */

import { warmIdle } from '@/shared/ui/warmIdle'

/** Paths warmed on app boot (list only). */
export function analysisRoutePrefetchPaths(): string[] {
  return ['/']
}

/** Paths warmed after the list page is interactive. */
export function analysisWorkspacePrefetchPaths(): string[] {
  return ['/analyses/__prefetch__']
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

function schedulePaths(
  router: { resolve: (to: string) => unknown },
  paths: string[],
  options: RoutePrefetchOptions = {},
): void {
  const idle = options.idle ?? ((run: () => void) => warmIdle(run))
  idle(() => {
    for (const path of paths) {
      warmMatchedComponents(router.resolve(path) as RoutePrefetchLocation)
    }
  })
}

export function scheduleRoutePrefetch(
  router: { resolve: (to: string) => unknown },
  options: RoutePrefetchOptions = {},
): void {
  schedulePaths(router, analysisRoutePrefetchPaths(), options)
}

/** Call from AnalysisListView after mount — deferred workspace chunk warm. */
export function scheduleWorkspaceRoutePrefetch(
  router: { resolve: (to: string) => unknown },
  options: RoutePrefetchOptions = {},
): void {
  schedulePaths(router, analysisWorkspacePrefetchPaths(), options)
}
