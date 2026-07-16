import type { ViewNode } from '@/shared/types/analysis'

export function findView(views: ViewNode[], id: string): ViewNode | null {
  for (const v of views) {
    if (v.id === id) return v
    const c = findView(v.children, id)
    if (c) return c
  }
  return null
}

export function flattenViews(views: ViewNode[]): ViewNode[] {
  const out: ViewNode[] = []
  for (const v of views) {
    out.push(v, ...flattenViews(v.children))
  }
  return out
}

export function walkViews(root: ViewNode, fn: (v: ViewNode) => void) {
  fn(root)
  for (const c of root.children) walkViews(c, fn)
}
