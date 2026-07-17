/** Workspace skip-link target selection (Round 29). */

export function workspaceSkipHref(opts: {
  mode: 'flowchart' | 'workspace'
  flowchartEmpty: boolean
  workspaceEmpty: boolean
}): string {
  if (opts.mode === 'flowchart' && opts.flowchartEmpty) return '#flow-empty'
  if (opts.mode === 'workspace' && opts.workspaceEmpty) return '#ws-empty'
  return '#workspace-main'
}
