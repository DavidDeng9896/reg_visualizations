/** 根据兼容网关推断 DeepSeek 适配器的思考策略。 */

const NON_DEEPSEEK_THINKING_HOST =
  /aliyuncs\.com|dashscope|maas\.aliyun|compatible-mode/i

export function shouldDisableThinking(baseUrl: string, explicitThinking?: string): boolean {
  if (explicitThinking) return false
  return NON_DEEPSEEK_THINKING_HOST.test(baseUrl || '')
}
