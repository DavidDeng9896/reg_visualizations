/**
 * 浏览器入口：未绑定工作区时自动接到 Pinia。
 */
import type { ToolExecResult } from '../agentLoop'
import { execTool as execToolCore, type ToolCtx, cloneAnalysisForDraft } from './execCore'
import { getWorkspace, runWithWorkspaceAsync } from './workspace'
import { createPiniaWorkspace } from './piniaWorkspace'

export type { ToolCtx }
export { cloneAnalysisForDraft }

export async function execTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolExecResult> {
  try {
    getWorkspace()
    return execToolCore(name, args, ctx)
  } catch {
    return runWithWorkspaceAsync(createPiniaWorkspace(), () => execToolCore(name, args, ctx))
  }
}
