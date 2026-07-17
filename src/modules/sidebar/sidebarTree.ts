export type SidebarTreeNode = {
  id: string
  label: string
  kind: 'table' | 'view'
  tableId: string
  children?: SidebarTreeNode[]
}

export type FlatSidebarNode = SidebarTreeNode & { depth: number }

/** Flatten a tree for default-expand-all rendering; preserves depth for indentation. */
export function flattenSidebarTree(
  nodes: readonly SidebarTreeNode[],
  depth = 0,
): FlatSidebarNode[] {
  const out: FlatSidebarNode[] = []
  for (const n of nodes) {
    out.push({ ...n, depth, children: n.children })
    if (n.children?.length) {
      out.push(...flattenSidebarTree(n.children, depth + 1))
    }
  }
  return out
}

/** Keep a node if its label matches or any descendant matches (and keep matching children). */
export function filterSidebarTree(
  nodes: readonly SidebarTreeNode[],
  query: string,
): SidebarTreeNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return nodes.map(cloneNode)

  const walk = (list: readonly SidebarTreeNode[]): SidebarTreeNode[] => {
    const out: SidebarTreeNode[] = []
    for (const n of list) {
      const children = n.children?.length ? walk(n.children) : []
      const selfMatch = n.label.toLowerCase().includes(q)
      if (selfMatch || children.length) {
        out.push({ ...n, children })
      }
    }
    return out
  }
  return walk(nodes)
}

function cloneNode(n: SidebarTreeNode): SidebarTreeNode {
  return {
    ...n,
    children: n.children?.map(cloneNode),
  }
}
