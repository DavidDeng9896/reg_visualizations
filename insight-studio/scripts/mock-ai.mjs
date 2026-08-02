/**
 * 本地 mock OpenAI 兼容端点（OpenAI SSE 协议），用于 AI 助手联调与演示。
 * 用法：node scripts/mock-ai.mjs [port=8789]，然后把 AI 设置里的 Base URL 填 http://127.0.0.1:8789/v1。
 * 行为：按轮次（tool 角色消息数）返回编排好的工具调用，最后给中文总结。
 */
import http from 'node:http'

const port = Number(process.argv[2] ?? 8789)

function chunk(delta, finish = null) {
  return `data: ${JSON.stringify({ id: 'mock', object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`
}
function toolCall(name, args) {
  return {
    index: 0,
    id: `call_${name}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'function',
    function: { name, arguments: JSON.stringify(args) },
  }
}

/** 从消息里提取工具结果中的 id。 */
function extract(messages, re, group = 1) {
  for (const m of messages) {
    if (m.role === 'tool' && typeof m.content === 'string') {
      const hit = m.content.match(re)
      if (hit) return hit[group]
    }
  }
  return null
}

function script(messages) {
  const round = messages.filter((m) => m.role === 'tool').length + 1
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  if (/流程图|flowchart/i.test(lastUser)) {
    return respond(round, messages, 'flow')
  }
  return respond(round, messages, 'chart')
}

function respond(round, messages, kind) {
  switch (round) {
    case 1:
      return [toolCall('submit_plan', { steps: ['查看当前表结构', '创建散点视图并配置映射', '加线性拟合与拟合注释'] })]
    case 2:
      return [toolCall('list_tables', {})]
    case 3: {
      const tableId = extract(messages, /[(（]id: ([0-9a-f-]{8,})/i)
      return [toolCall('create_view', { tableId, type: 'scatter', name: 'AI 散点分析' })]
    }
    case 4: {
      const viewId = extract(messages, /view id: ([0-9a-f-]+)/i)
      const tableId = extract(messages, /[(（]id: ([0-9a-f-]{8,})/i)
      const cfg =
        kind === 'flow'
          ? { configure: { x: { field: 'weight_kg' }, values: [{ field: 'length_cm' }], regression: { model: 'linear' } }, style: { fitAnnotation: true, referenceLines: [{ axis: 'y', value: 140, label: '参考线' }] } }
          : { configure: { x: { field: 'weight_kg' }, values: [{ field: 'length_cm' }], regression: { model: 'linear' } }, style: { fitAnnotation: true } }
      return [toolCall('set_chart_config', { tableId, viewId, chartType: 'scatter', ...cfg })]
    }
    case 5:
      return [toolCall('mark_step_done', { index: 0 })]
    case 6:
      return [toolCall('mark_step_done', { index: 1 })]
    case 7:
      return [toolCall('mark_step_done', { index: 2 })]
    default:
      return {
        content:
          '已完成：\n- 查看了当前表结构\n- 创建了散点视图「AI 散点分析」并配置 X=weight_kg、Y=length_cm\n- 加了线性拟合与拟合注释\n\n产物已在下方卡片中，可直接点击打开继续编辑。',
      }
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors()).end()
    return
  }
  if (req.method !== 'POST' || !req.url?.includes('/chat/completions')) {
    res.writeHead(404, cors()).end('not found')
    return
  }
  let body = ''
  req.on('data', (d) => (body += d))
  req.on('end', () => {
    let messages = []
    try {
      messages = JSON.parse(body).messages ?? []
    } catch {
      /* ignore */
    }
    const out = script(messages)
    res.writeHead(200, { ...cors(), 'Content-Type': 'text/event-stream; charset=utf-8' })
    if (Array.isArray(out)) {
      res.write(chunk({ role: 'assistant', tool_calls: out }))
      res.write(chunk({}, 'stop'))
    } else {
      for (const part of splitText(out.content)) res.write(chunk({ role: 'assistant', content: part }))
      res.write(chunk({}, 'stop'))
    }
    res.write('data: [DONE]\n\n')
    res.end()
  })
})

function splitText(s) {
  return s.split(/(?<=。|：|\n)/).filter(Boolean)
}
function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

server.listen(port, '127.0.0.1', () => {
  console.log(`[mock-ai] OpenAI 兼容端点 http://127.0.0.1:${port}/v1/chat/completions`)
})
