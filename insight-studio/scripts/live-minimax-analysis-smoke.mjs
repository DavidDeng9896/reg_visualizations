#!/usr/bin/env node
/**
 * Live MiniMax smoke：用 data_entry_ai fixtures 验证模型在复杂表场景下会发 tool_calls。
 * 密钥只从环境变量读取；绝不打印 key。
 *
 *   set -a && source .env.local && set +a
 *   node insight-studio/scripts/live-minimax-analysis-smoke.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIX = resolve(__dirname, '../tests/fixtures/data_entry_ai')

const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY || ''
const baseUrl = (process.env.MINIMAX_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.minimaxi.com/v1').replace(
  /\/$/,
  '',
)
const model = process.env.MINIMAX_MODEL || process.env.OPENAI_MODEL || 'MiniMax-M2.7-highspeed'

if (!apiKey) {
  console.error('FAIL: set MINIMAX_API_KEY (or OPENAI_API_KEY) in env / .env.local — do not commit secrets')
  process.exit(2)
}

const docking = readFileSync(resolve(FIX, 'docking_scores_20241105.csv'), 'utf-8').trim()
const pk = readFileSync(resolve(FIX, 'mouse_pk_auc_f.csv'), 'utf-8').trim()

const tools = [
  {
    type: 'function',
    function: {
      name: 'submit_plan',
      description: 'Submit 3-6 step plan',
      parameters: { type: 'object', properties: { steps: { type: 'array', items: { type: 'string' } } }, required: ['steps'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_table_schema',
      description: 'Get table schema with field names',
      parameters: { type: 'object', properties: { tableId: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_chart',
      description: 'Atomically create chart with configure',
      parameters: {
        type: 'object',
        properties: {
          tableId: { type: 'string' },
          chartType: { type: 'string' },
          configure: { type: 'object' },
        },
        required: ['chartType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'import_csv_text',
      description: 'Import CSV text as table',
      parameters: {
        type: 'object',
        properties: { tableName: { type: 'string' }, csv: { type: 'string' } },
        required: ['tableName', 'csv'],
      },
    },
  },
]

const system = `你是数据分析助手。复杂表头必须用精确 field。用户要出图时：先 submit_plan，再 import_csv_text 或 get_table_schema，再用 create_chart。禁止只聊天。使用工具调用。`

const user = `请分析下面两张表并出图：
1) docking 表 CSV：
${docking}

2) mouse PK 表 CSV：
${pk}

目标：对 docking score 与 localStrain 做散点相关图；对 Compound ID 的 AUC 做柱状对比。必须用 tool_calls。`

async function main() {
  const url = `${baseUrl}/chat/completions`
  console.log('POST', url, 'model=', model, 'key_len=', apiKey.length)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      tools,
      tool_choice: 'auto',
      temperature: 0.2,
    }),
  })
  const text = await res.text()
  if (!res.ok) {
    console.error('HTTP', res.status, text.slice(0, 500))
    process.exit(1)
  }
  let json
  try {
    json = JSON.parse(text)
  } catch {
    console.error('Non-JSON response', text.slice(0, 300))
    process.exit(1)
  }
  const msg = json.choices?.[0]?.message
  const calls = msg?.tool_calls ?? []
  const names = calls.map((c) => c.function?.name).filter(Boolean)
  console.log('tool_calls:', names.length ? names.join(', ') : '(none)')
  if (msg?.content) console.log('content_preview:', String(msg.content).replace(/\s+/g, ' ').slice(0, 200))

  const ok =
    names.includes('submit_plan') ||
    names.includes('import_csv_text') ||
    names.includes('create_chart') ||
    names.includes('get_table_schema')
  if (!ok) {
    console.error('FAIL: expected analysis tool_calls for complex-table chart request')
    process.exit(1)
  }
  console.log('PASS: MiniMax returned analysis-oriented tool_calls')
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e)
  process.exit(1)
})
