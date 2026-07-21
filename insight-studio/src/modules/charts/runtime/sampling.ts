/**
 * 采样消费：管道已在 ViewResult 完成采样，这里只生成警告文案。
 */
import type { ViewResult } from '../../../shared/pipeline'

export interface SamplingNotice {
  sampled: boolean
  message: string
}

/** 「Showing a random sample of 10,000 rows out of N」（截图 07 黄条）。 */
export function samplingNotice(result: ViewResult): SamplingNotice {
  if (!result.sampled) return { sampled: false, message: '' }
  const fmt = (n: number) => n.toLocaleString('en-US')
  return {
    sampled: true,
    message: `Showing a random sample of ${fmt(result.rows.length)} rows out of ${fmt(result.totalRows)}`,
  }
}
