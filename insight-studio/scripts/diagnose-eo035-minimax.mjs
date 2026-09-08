#!/usr/bin/env node
/**
 * DIAGNOSIS ONLY — multi-turn MiniMax ReAct against data_entry_ai fixtures.
 * Does not modify product code. Never prints API keys.
 *
 *   set -a && source .env.local && set +a
 *   node insight-studio/scripts/diagnose-eo035-minimax.mjs
 *
 * Writes redacted JSON under docs/audits/evidence/ (caller commits docs only).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const FIX = resolve(__dirname, '../tests/fixtures/data_entry_ai')
const OUT_DIR = resolve(ROOT, 'docs/audits/evidence')

const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY || ''
const baseUrl = (process.env.MINIMAX_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.minimaxi.com/v1').replace(
  /\/$/,
  '',
)
const model = process.env.MINIMAX_MODEL || process.env.OPENAI_MODEL || 'MiniMax-M2.7-highspeed'

if (!apiKey) {
  console.error('FAIL: MINIMAX_API_KEY missing (use gitignored .env.local)')
  process.exit(2)
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim())
  const rows = lines.slice(1).map((line) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)/g)?.map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"')) ?? []
    const o = {}
    headers.forEach((h, i) => {
      const v = cells[i] ?? ''
      o[h] = v === '' ? null : Number.isFinite(Number(v)) && v.trim() !== '' ? Number(v) : v
    })
    return o
  })
  return { headers, rows }
}

function inferType(values) {
  const nonEmpty = values.filter((v) => v != null && v !== '')
  if (!nonEmpty.length) return 'string'
  if (nonEmpty.every((v) => typeof v === 'number' || Number.isFinite(Number(v)))) return 'number'
  return 'string'
}

function formatSchema(name, id, headers, rows) {
  const cols = headers.map((h) => {
    const vals = rows.map((r) => r[h])
    const dt = inferType(vals)
    const unit = h.match(/\(([^)]+)\)\s*$/)?.[1]
    return `- field=\`${h}\` (${dt}${unit ? ` unit=${unit}` : ''})`
  })
  const samples = rows.slice(0, 3).map((r, i) => {
    const cells = headers.slice(0, 12).map((h) => `${h}=${JSON.stringify(r[h])}`).join(', ')
    return `  row${i + 1}: {${cells}}`
  })
  return [`表「${name}」（id: ${id}，${rows.length} 行 × ${headers.length} 列）`, '列：', ...cols, '样例：', ...samples].join('\n')
}

const dockingRaw = readFileSync(resolve(FIX, 'docking_scores_20241105.csv'), 'utf-8')
const pkRaw = readFileSync(resolve(FIX, 'mouse_pk_auc_f.csv'), 'utf-8')
const pharmaRaw = readFileSync(resolve(FIX, 'pharmacophore_TREM_20251219.csv'), 'utf-8')
const docking = parseCsv(dockingRaw)
const pk = parseCsv(pkRaw)
const pharma = parseCsv(pharmaRaw)

/** In-memory fake analysis for tool execution during diagnosis. */
const tables = new Map()
const views = []

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'submit_plan',
      description: '开工前必须调用：提交执行计划（3-6 个步骤）',
      parameters: { type: 'object', properties: { steps: { type: 'array', items: { type: 'string' } } }, required: ['steps'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_step_done',
      description: '每完成计划中的一个步骤后调用',
      parameters: { type: 'object', properties: { index: { type: 'number' } }, required: ['index'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'import_csv_text',
      description: '把 CSV 文本导入为表',
      parameters: { type: 'object', properties: { tableName: { type: 'string' }, csv: { type: 'string' } }, required: ['tableName', 'csv'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tables',
      description: '列出分析中所有表',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_table_schema',
      description: '获取表的列 field 与样例',
      parameters: { type: 'object', properties: { tableId: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_join_step',
      description: 'Join 两表；必须 leftTableId+rightTableId',
      parameters: {
        type: 'object',
        properties: {
          leftTableId: { type: 'string' },
          rightTableId: { type: 'string' },
          joinType: { type: 'string' },
          keys: { type: 'array', items: { type: 'object' } },
        },
        required: ['leftTableId', 'rightTableId', 'joinType', 'keys'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_view',
      description: '创建图表视图',
      parameters: {
        type: 'object',
        properties: { tableId: { type: 'string' }, type: { type: 'string' }, name: { type: 'string' } },
        required: ['tableId', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_chart_config',
      description: '配置图表；bar:{x,y} scatter:{x,values[]}',
      parameters: {
        type: 'object',
        properties: {
          tableId: { type: 'string' },
          viewId: { type: 'string' },
          chartType: { type: 'string' },
          configure: { type: 'object' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_chart',
      description: '原子建图',
      parameters: {
        type: 'object',
        properties: {
          tableId: { type: 'string' },
          chartType: { type: 'string' },
          name: { type: 'string' },
          configure: { type: 'object' },
        },
        required: ['chartType'],
      },
    },
  },
]

const SYSTEM = `你是「科学数据管理」平台内置的数据分析助手。必须用工具完成导入与出图。
工作方式：先 submit_plan；探路用 list_tables / get_table_schema；配图必须用 schema 返回的 field 精确名（可含空格与括号单位如 localStrain(kcal)、Dose (mg/kg)）。
Join 必须显式 leftTableId 与 rightTableId。标准图用 create_chart 或 create_view+set_chart_config。
禁止过程独白；需要行动时直接 tool_calls。总结用简洁中文。`

const USER = `请用下面三份 CSV（来自 data_entry_ai EO035 测试夹具，仅测试数据）完成分析并真正出图：

【任务 A · docking】导入为表 docking，对 docking score 与 localStrain 做散点相关图。
CSV:
${dockingRaw.trim()}

【任务 B · mouse PK】导入为表 mouse_pk，按 Compound ID 对 AUC 做柱状对比（mean）。
CSV:
${pkRaw.trim()}

【任务 C】list_tables 后说明各表 field；不要臆造列名。完成后 mark_step_done 并简短总结。

必须 tool_calls，不要只聊天。`

function execTool(name, args) {
  if (name === 'submit_plan') {
    const steps = args.steps ?? []
    return { ok: true, summary: `ok：已提交计划（${steps.length} 步）` }
  }
  if (name === 'mark_step_done') {
    return { ok: true, summary: `ok：步骤 ${Number(args.index) + 1} 完成` }
  }
  if (name === 'import_csv_text') {
    const tableName = String(args.tableName || 'imported')
    const parsed = parseCsv(String(args.csv || ''))
    const id = randomUUID()
    tables.set(id, { id, name: tableName, ...parsed })
    return {
      ok: true,
      summary: `已导入表「${tableName}」（${parsed.rows.length} 行 × ${parsed.headers.length} 列）id=${id}`,
      tableId: id,
    }
  }
  if (name === 'list_tables') {
    if (!tables.size) return { ok: true, summary: '当前分析还没有表。' }
    const lines = [...tables.values()].map(
      (t) => `- ${t.name}（id: ${t.id}，${t.rows.length} 行，${t.headers.length} 列）`,
    )
    return { ok: true, summary: `表：\n${lines.join('\n')}` }
  }
  if (name === 'get_table_schema') {
    const id = String(args.tableId || '')
    let t = tables.get(id)
    if (!t) t = [...tables.values()].find((x) => x.name === id) || [...tables.values()].at(-1)
    if (!t) return { ok: false, summary: '表不存在' }
    return { ok: true, summary: formatSchema(t.name, t.id, t.headers, t.rows) }
  }
  if (name === 'add_join_step') {
    const leftId = String(args.leftTableId || '').trim()
    const rightId = String(args.rightTableId || '').trim()
    if (!leftId || !rightId) {
      return {
        ok: false,
        summary: 'Join 必须显式提供 leftTableId 与 rightTableId（不可省略、不可依赖默认表）',
      }
    }
    if (!tables.has(leftId) || !tables.has(rightId)) {
      return { ok: false, summary: `表不存在：left=${leftId} right=${rightId}` }
    }
    return { ok: true, summary: `已创建 Join left=${leftId} right=${rightId}` }
  }
  if (name === 'create_view') {
    const tableId = String(args.tableId || '')
    const type = String(args.type || 'bar')
    const viewId = randomUUID()
    const name = String(args.name || type)
    views.push({ viewId, tableId, type, name, configure: null })
    return { ok: true, summary: `已创建视图「${name}」（view id: ${viewId}，${type}）`, viewId }
  }
  if (name === 'set_chart_config' || name === 'create_chart') {
    const configure = args.configure || {}
    const chartType = String(args.chartType || args.type || 'scatter')
    const fields = []
    const walk = (o) => {
      if (!o || typeof o !== 'object') return
      if (typeof o.field === 'string') fields.push(o.field)
      for (const v of Object.values(o)) {
        if (Array.isArray(v)) v.forEach(walk)
        else if (v && typeof v === 'object') walk(v)
      }
    }
    walk(configure)
    const table =
      tables.get(String(args.tableId || '')) ||
      [...tables.values()].find((t) => t.name === args.tableId) ||
      [...tables.values()].at(-1)
    const known = new Set(table?.headers ?? [])
    const missing = fields.filter((f) => !known.has(f))
    // fuzzy: allow localStrain → localStrain(kcal)
    const fuzzyMissing = missing.filter((f) => {
      const norm = f.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[_\s-]+/g, '')
      return ![...known].some((h) => h.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[_\s-]+/g, '') === norm)
    })
    if (fuzzyMissing.length) {
      return {
        ok: false,
        summary: `图表映射校验未通过：列不存在 ${fuzzyMissing.join(', ')}。可用：${[...known].join('、')}`,
        fields,
        missing: fuzzyMissing,
      }
    }
    const viewId = name === 'create_chart' ? randomUUID() : String(args.viewId || views.at(-1)?.viewId || randomUUID())
    views.push({ viewId, tableId: table?.id, type: chartType, configure, fields })
    return {
      ok: true,
      summary: `图表配置完成（${chartType}）view id: ${viewId}`,
      fields,
      resolvedOk: true,
    }
  }
  return { ok: false, summary: `未知工具 ${name}` }
}

async function chat(messages) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.2,
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`)
  return JSON.parse(text)
}

function redact(s) {
  return String(s || '')
    .replace(apiKey, '[REDACTED_KEY]')
    .replace(/sk-[A-Za-z0-9._-]{20,}/g, '[REDACTED_KEY]')
}

const trace = []
const findings = {
  intent: [],
  schema: [],
  chart: [],
  other: [],
}

const messages = [
  { role: 'system', content: SYSTEM },
  { role: 'user', content: USER },
]

const MAX_ROUNDS = 8
console.log(`diagnose MiniMax model=${model} base=${baseUrl} key_len=${apiKey.length} max_rounds=${MAX_ROUNDS}`)

for (let round = 1; round <= MAX_ROUNDS; round++) {
  console.log(`\n=== round ${round} ===`)
  let json
  try {
    json = await chat(messages)
  } catch (e) {
    findings.other.push(`round ${round} API error: ${e.message}`)
    console.error('API error', e.message)
    break
  }
  const msg = json.choices?.[0]?.message || {}
  const content = String(msg.content || '')
  const reasoning = String(msg.reasoning_content || '')
  const calls = msg.tool_calls || []
  const thinkInContent = /<\s*think[\s>]/i.test(content)
  const roundRec = {
    round,
    finish_reason: json.choices?.[0]?.finish_reason,
    content_preview: redact(content).replace(/\s+/g, ' ').slice(0, 280),
    reasoning_len: reasoning.length,
    think_tag_in_content: thinkInContent,
    tool_calls: calls.map((c) => ({
      name: c.function?.name,
      args_preview: redact(c.function?.arguments || '').slice(0, 400),
    })),
  }
  trace.push(roundRec)
  console.log(
    'tools:',
    roundRec.tool_calls.map((t) => t.name).join(', ') || '(none)',
    'think_in_content:',
    thinkInContent,
  )

  if (thinkInContent) {
    findings.intent.push(`R${round}: MiniMax leaked <think> into content (len=${content.length})`)
  }

  messages.push({
    role: 'assistant',
    content: msg.content ?? null,
    tool_calls: calls.length ? calls : undefined,
  })

  if (!calls.length) {
    findings.intent.push(`R${round}: no tool_calls — model ended with prose`)
    break
  }

  for (const call of calls) {
    let args = {}
    try {
      args = JSON.parse(call.function.arguments || '{}')
    } catch {
      args = {}
    }
    const name = call.function.name
    // Intent observations
    if (name === 'submit_plan') {
      const steps = args.steps || []
      const joined = steps.join(' | ')
      if (!/图|chart|scatter|bar|散点|柱/i.test(joined)) {
        findings.intent.push(`R${round}: submit_plan steps lack explicit chart deliverable: ${JSON.stringify(steps)}`)
      } else {
        findings.intent.push(`R${round}: submit_plan includes chart-ish steps (${steps.length})`)
      }
    }
    if (name === 'add_join_step' && (!args.leftTableId || !args.rightTableId)) {
      findings.schema.push(`R${round}: add_join_step missing table ids`)
    }
    if (name === 'set_chart_config' || name === 'create_chart') {
      const cfg = JSON.stringify(args.configure || {})
      if (/\blocalStrain\b/.test(cfg) && !/localStrain\(kcal\)/.test(cfg)) {
        findings.schema.push(`R${round}: ${name} used localStrain without (kcal) unit suffix: ${cfg.slice(0, 200)}`)
      }
      if (/\bdocking_score\b/.test(cfg)) {
        findings.schema.push(`R${round}: ${name} used docking_score underscore form: ${cfg.slice(0, 200)}`)
      }
      if (/"AUC_last"/.test(cfg) && !/"AUC_last \(h\*ng\/mL\)"/.test(cfg)) {
        findings.schema.push(`R${round}: ${name} used AUC_last without unit suffix: ${cfg.slice(0, 200)}`)
      }
    }

    const result = execTool(name, args)
    const entry = roundRec.tool_calls.find((t) => t.name === name && t.result == null)
    if (entry) entry.result = { ok: result.ok, summary: redact(result.summary).slice(0, 300) }

    if ((name === 'set_chart_config' || name === 'create_chart') && !result.ok) {
      findings.chart.push(`R${round}: ${name} FAILED — ${result.summary}`)
    }
    if ((name === 'set_chart_config' || name === 'create_chart') && result.ok) {
      findings.chart.push(`R${round}: ${name} OK fields=${JSON.stringify(result.fields)}`)
    }
    if (name === 'get_table_schema' && result.ok) {
      const hasField = /field=`/.test(result.summary)
      findings.schema.push(`R${round}: get_table_schema field= tags present=${hasField}`)
    }

    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: result.summary,
    })
  }

  const chartOk = views.some((v) => v.configure)
  const planDoneish = calls.some((c) => c.function?.name === 'mark_step_done')
  if (chartOk && tables.size >= 2 && planDoneish && round >= 4) {
    // allow one more summary round
  }
}

// Summarize
const toolSeq = trace.flatMap((r) => r.tool_calls.map((t) => t.name))
const uniqueTools = [...new Set(toolSeq)]
const chartSuccess = views.filter((v) => v.configure).length
const summary = {
  when: new Date().toISOString(),
  model,
  baseUrl,
  key_fingerprint: createHash('sha256').update(apiKey).digest('hex').slice(0, 12),
  fixtures: ['docking_scores_20241105.csv', 'mouse_pk_auc_f.csv', 'pharmacophore_TREM_20251219.csv'],
  note: 'data_entry_ai fixtures used as TEST DATA ONLY — no product requirements imported',
  tool_sequence: toolSeq,
  unique_tools: uniqueTools,
  tables_imported: [...tables.values()].map((t) => ({ name: t.name, id: t.id, cols: t.headers })),
  charts_configured: chartSuccess,
  views,
  think_leak_rounds: trace.filter((r) => r.think_tag_in_content).map((r) => r.round),
  findings,
  rounds: trace,
}

mkdirSync(OUT_DIR, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outPath = resolve(OUT_DIR, `eo035-minimax-diagnose-${stamp}.json`)
writeFileSync(outPath, JSON.stringify(summary, null, 2))
writeFileSync(resolve(OUT_DIR, 'eo035-minimax-diagnose-latest.json'), JSON.stringify(summary, null, 2))
console.log('\n=== SUMMARY ===')
console.log('tools:', toolSeq.join(' → '))
console.log('charts_configured:', chartSuccess)
console.log('think_leak_rounds:', summary.think_leak_rounds)
console.log('wrote', outPath)
console.log(JSON.stringify({ findings }, null, 2))
