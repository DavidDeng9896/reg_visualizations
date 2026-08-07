/**
 * report 步骤：无上下游连线，配置即落地（HTML 报告文档）。
 */
import type { StepExecCtx, StepExecResult } from './types'
import { readReportConfig } from '../report/reportModel'

export function execReport(ctx: StepExecCtx): StepExecResult {
  const report = readReportConfig(ctx.step.config)
  if (!report.title.trim()) {
    return { status: 'failed', error: '报告标题不能为空' }
  }
  // 无产表；配置写入即视为 configured
  ctx.step.config.report = report
  return { status: 'configured', outputTables: [] }
}
