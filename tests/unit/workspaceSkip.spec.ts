import { describe, expect, it } from 'vitest'
import { workspaceSkipHref } from '@/modules/analysis/workspaceSkip'

describe('workspaceSkip', () => {
  it('targets flow-empty when flowchart has no nodes', () => {
    expect(
      workspaceSkipHref({
        mode: 'flowchart',
        flowchartEmpty: true,
        workspaceEmpty: false,
      }),
    ).toBe('#flow-empty')
  })

  it('targets ws-empty when workspace has no selection', () => {
    expect(
      workspaceSkipHref({
        mode: 'workspace',
        flowchartEmpty: false,
        workspaceEmpty: true,
      }),
    ).toBe('#ws-empty')
  })

  it('falls back to workspace-main when content is present', () => {
    expect(
      workspaceSkipHref({
        mode: 'flowchart',
        flowchartEmpty: false,
        workspaceEmpty: false,
      }),
    ).toBe('#workspace-main')
    expect(
      workspaceSkipHref({
        mode: 'workspace',
        flowchartEmpty: true,
        workspaceEmpty: false,
      }),
    ).toBe('#workspace-main')
  })
})
