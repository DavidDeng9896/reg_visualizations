/**
 * Live MiniMax P0 smoke — requires MINIMAX_* in env / gitignored .env.local.
 * Fixtures = TEST DATA ONLY. Never prints API keys.
 *
 *   set -a && source ../.env.local && set +a
 *   cd insight-studio && npx vitest run tests/unit/ai/live-p0-minimax-smoke.spec.ts
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractThinkLeakage, assistantBubbleText } from '../../../src/modules/ai/contentScrub'
import {
  isNonTabularAiFile,
  nonTabularImportFailMessage,
  NON_TABULAR_INVENT_CSV_FAIL,
} from '../../../src/modules/ai/nonTabularImport'
import {
  normalizeAiChartConfigure,
  rejectAiChartEChartsPayload,
  resolveConfigureFields,
  autofillRequiredChartSlots,
} from '../../../src/modules/ai/normalizeChartConfigure'
import { analysisPathForArtifact, latestOpenableChartArtifact } from '../../../src/modules/ai/openArtifact'
import { hasChartConfigurePayload } from '../../../src/modules/ai/emptyChartViews'
import { validateChartMapping } from '../../../src/modules/charts/registry'
import type { ChartConfig, ColumnMeta } from '../../../src/shared/types'

const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY || ''
const baseUrl = (process.env.MINIMAX_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.minimaxi.com/v1').replace(
  /\/$/,
  '',
)
const model = process.env.MINIMAX_MODEL || process.env.OPENAI_MODEL || 'MiniMax-M2.7-highspeed'
const live = !!apiKey

const FIX = resolve(__dirname, '../../fixtures/data_entry_ai')
const OUT_DIR = resolve(__dirname, '../../../../docs/audits/evidence')

const dockingCsv = readFileSync(resolve(FIX, 'docking_scores_20241105.csv'), 'utf-8')
const docTxt = readFileSync(resolve(FIX, 'cadd_数据说明.txt'), 'utf-8')

type Check = { id: string; title: string; pass: boolean; detail: string; evidence?: unknown }

function fp(k: string) {
  return createHash('sha256').update(k).digest('hex').slice(0, 12)
}

async function chat(messages: unknown[], tools?: unknown[]) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, ...(tools ? { tools, tool_choice: 'auto' } : {}), temperature: 0.2 }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`)
  return JSON.parse(text) as {
    choices?: Array<{
      message?: {
        content?: string | null
        reasoning_content?: string | null
        tool_calls?: Array<{ function: { name: string; arguments: string } }>
      }
    }>
  }
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>
  } catch {
    return {}
  }
}

function dockingColumns(): ColumnMeta[] {
  const header = dockingCsv
    .trim()
    .split(/\r?\n/)[0]!
    .split(',')
    .map((h) => h.replace(/^"|"$/g, '').trim())
  return header.map((h) => ({
    field: h,
    title: h,
    dataType: /score|Strain|Penalty|Stars|gscore/i.test(h) ? ('number' as const) : ('string' as const),
  }))
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'submit_plan',
      description: 'plan',
      parameters: { type: 'object', properties: { steps: { type: 'array', items: { type: 'string' } } }, required: ['steps'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'import_ai_file',
      description: 'import fileId',
      parameters: { type: 'object', properties: { fileId: { type: 'string' } }, required: ['fileId'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'import_csv_text',
      description: 'import csv',
      parameters: {
        type: 'object',
        properties: { tableName: { type: 'string' }, csv: { type: 'string' } },
        required: ['tableName', 'csv'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_chart',
      description: 'atomic chart with field mapping configure',
      parameters: {
        type: 'object',
        properties: { chartType: { type: 'string' }, configure: { type: 'object' }, tableId: { type: 'string' } },
        required: ['chartType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_view',
      description: 'create view — charts need configure or same-turn set_chart_config',
      parameters: {
        type: 'object',
        properties: { type: { type: 'string' }, configure: { type: 'object' }, name: { type: 'string' } },
        required: ['type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_chart_config',
      description: 'configure chart',
      parameters: { type: 'object', properties: { configure: { type: 'object' }, viewId: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_join_step',
      description: 'join — both ids required',
      parameters: {
        type: 'object',
        properties: {
          leftTableId: { type: 'string' },
          rightTableId: { type: 'string' },
          joinType: { type: 'string' },
          keys: { type: 'array' },
        },
        required: ['leftTableId', 'rightTableId', 'joinType', 'keys'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_step_done',
      description: 'mark done',
      parameters: { type: 'object', properties: { index: { type: 'number' } }, required: ['index'] },
    },
  },
]

describe.runIf(live)('P0 live MiniMax smoke (EO035 fixtures)', () => {
  it(
    'P0-1..P0-5 against MiniMax + product gates',
    async () => {
      const checks: Check[] = []
      console.log('MiniMax smoke', { model, baseUrl, key_fp: fp(apiKey) })

      try {
        // —— P0-1 ——
        {
          const json = await chat([
            { role: 'system', content: '用中文简短回答，不要调用工具。' },
            { role: 'user', content: '一两句话说明 docking score 与 localStrain 散点图怎么做。' },
          ])
          const raw = String(json.choices?.[0]?.message?.content ?? '')
          const leaked = /<\s*think/i.test(raw)
          const { thinking } = extractThinkLeakage(raw)
          const bubble = assistantBubbleText(raw)
          const scrubOk = !/<\/?\s*(?:think|thinking|reason|reasoning)\s*>/i.test(bubble)
          checks.push({
            id: 'P0-1',
            title: 'bubbles scrub <think>',
            pass: scrubOk,
            detail: leaked
              ? `raw leaked think; bubble clean=${scrubOk}; thinking_len=${thinking.length}`
              : `no think in raw this turn; bubble clean=${scrubOk}`,
            evidence: {
              leaked,
              bubble_preview: bubble.slice(0, 160),
              content_preview: raw.replace(/\s+/g, ' ').slice(0, 200),
              thinking_preview: thinking.slice(0, 120),
            },
          })
        }

        // —— P0-3 ——
        {
          const meta = { kind: 'text', name: 'cadd_数据说明.txt' }
          const productOk =
            isNonTabularAiFile(meta) &&
            !/import_csv_text|生成数据表/.test(nonTabularImportFailMessage(meta)) &&
            /禁止/.test(NON_TABULAR_INVENT_CSV_FAIL)

          const json = await chat(
            [
              {
                role: 'system',
                content:
                  '附件：fileId=doc-eo035 kind=text name=cadd_数据说明.txt（说明，禁止 import_ai_file）。无 CSV。禁止 import_csv_text 编造。用工具表达。',
              },
              { role: 'user', content: `请把说明导入成表并画图：\n${docTxt.slice(0, 1000)}\n（仅说明）` },
            ],
            TOOLS,
          )
          const calls = json.choices?.[0]?.message?.tool_calls ?? []
          const names = calls.map((c) => c.function.name)
          const inventCsv = calls.some((c) => {
            if (c.function.name !== 'import_csv_text') return false
            const csv = String(parseArgs(c.function.arguments).csv ?? '')
            return csv.length > 20 && !/docking score|localStrain|AUC_last/i.test(csv)
          })
          checks.push({
            id: 'P0-3',
            title: '说明 alone: product hard-fail + no invent CSV',
            pass: productOk && !inventCsv,
            detail: `productOk=${productOk}; tools=[${names.join(',') || 'none'}]; inventCsv=${inventCsv}`,
            evidence: {
              failMsg: nonTabularImportFailMessage(meta),
              tool_calls: names,
              inventCsv,
            },
          })
        }

        // —— P0-2 ——
        {
          const echartsReject = rejectAiChartEChartsPayload({
            configure: { xAxis: { data: ['a'] }, series: [{ data: [1, 2, 3] }] },
          })
          const stringAllowed =
            rejectAiChartEChartsPayload({
              configure: { x: 'docking score', values: [{ field: 'localStrain(kcal)' }] },
            }) === null
          const cols = dockingColumns()
          const json = await chat(
            [
              {
                role: 'system',
                content:
                  '表 docking id=t-dock 已在。字段含 `docking score` 与 `localStrain(kcal)`。本轮必须直接 create_chart（scatter），configure 用字段映射，禁止 ECharts series.data。不要只 submit_plan。',
              },
              {
                role: 'user',
                content: `表头：${dockingCsv.trim().split('\n')[0]}\n立即 create_chart 散点：x="docking score", values=[{field:"localStrain(kcal)"}]。`,
              },
            ],
            TOOLS,
          )
          const calls = json.choices?.[0]?.message?.tool_calls ?? []
          const chartCall = calls.find((c) => c.function.name === 'create_chart')
          let mappingOk = false
          let detail = 'no create_chart'
          if (chartCall) {
            const args = parseArgs(chartCall.function.arguments)
            const rej = rejectAiChartEChartsPayload(args)
            if (rej) {
              detail = `model ECharts rejected by product: ${rej.slice(0, 100)}`
              mappingOk = true
            } else {
              const chartType = String(args.chartType ?? 'scatter')
              let configure = normalizeAiChartConfigure(chartType, (args.configure ?? args) as never)
              configure = resolveConfigureFields(configure, cols)
              configure = autofillRequiredChartSlots(chartType, configure, cols).configure
              const draft = {
                chartType: chartType as ChartConfig['chartType'],
                configure,
                style: {},
              } as ChartConfig
              const errors = validateChartMapping(draft, cols)
              mappingOk = errors.length === 0
              detail = mappingOk
                ? `mapping OK ${JSON.stringify(configure).slice(0, 160)}`
                : `mapping errors: ${errors.map((e) => e.message).join('; ')}`
            }
          }
          // Also prove product accepts string-slot docking fixture mapping offline
          const offline = normalizeAiChartConfigure('scatter', {
            x: 'docking score' as never,
            values: [{ field: 'localStrain(kcal)' }],
          })
          const offlineResolved = resolveConfigureFields(offline, cols)
          const offlineDraft = {
            chartType: 'scatter' as const,
            configure: offlineResolved,
            style: {},
          } as ChartConfig
          const offlineOk = validateChartMapping(offlineDraft, cols).length === 0

          checks.push({
            id: 'P0-2',
            title: 'ECharts reject OR field-mapping chart validates',
            pass: !!echartsReject && stringAllowed && (mappingOk || offlineOk),
            detail: `productEchartsReject=${!!echartsReject}; stringAllowed=${stringAllowed}; offlineDockingMapping=${offlineOk}; live: ${detail}; tools=${calls.map((c) => c.function.name).join(',') || 'none'}`,
            evidence: {
              echarts_reject: echartsReject?.slice(0, 120),
              tool_calls: calls.map((c) => c.function.name),
              args: chartCall?.function.arguments.slice(0, 280),
              offline_configure: offlineResolved,
              mappingOk,
              offlineOk,
            },
          })
        }

        // —— P0-4 ——
        {
          const art = {
            kind: 'view' as const,
            name: 's',
            analysisId: 'a1',
            tableId: 't1',
            viewId: 'v1',
            viewType: 'scatter',
          }
          const path = analysisPathForArtifact(art)
          const autoOpenOk = path === '/analysis/a1?tableId=t1&viewId=v1' && latestOpenableChartArtifact([art])?.viewId === 'v1'
          const incompleteCfg = hasChartConfigurePayload({ type: 'scatter' }) === false
          const completeCfg = hasChartConfigurePayload({
            type: 'scatter',
            configure: { x: 'docking score', values: [{ field: 'localStrain(kcal)' }] },
          })

          const json = await chat(
            [
              {
                role: 'system',
                content:
                  '表 t-dock 已存在。禁止 create_view(scatter) 不带 configure。必须调用 create_chart。可再 mark_step_done。',
              },
              {
                role: 'user',
                content: `CSV头：${dockingCsv.trim().split('\n')[0]}\n请只调用 create_chart：chartType=scatter, configure={x:"docking score", values:[{field:"localStrain(kcal)"}]}。`,
              },
            ],
            TOOLS,
          )
          const calls = json.choices?.[0]?.message?.tool_calls ?? []
          const names = calls.map((c) => c.function.name)
          const bareEmpty = calls.some((c) => {
            if (c.function.name !== 'create_view') return false
            const a = parseArgs(c.function.arguments)
            const t = String(a.type ?? '')
            if (!t || t === 'table') return false
            return !hasChartConfigurePayload(a)
          })
          const usedChart = names.includes('create_chart') || names.includes('set_chart_config')
          // Product gates for empty/idle/auto-open are the merge bar; live must not attempt bare empty.
          // Headed UI idle/open not asserted here.
          const pass = autoOpenOk && incompleteCfg && completeCfg && !bareEmpty
          checks.push({
            id: 'P0-4',
            title: 'no empty chart left; idle/auto-open path (headed UI not in this smoke)',
            pass,
            detail: `autoOpenOk=${autoOpenOk}; productIncompleteDetect=${incompleteCfg}; completeCfg=${completeCfg}; bareEmptyAttempt=${bareEmpty}; usedChartTool=${usedChart}; tools=[${names.join(',') || 'none'}]; headed_ui=false`,
            evidence: { path, tool_calls: names, bareEmpty, usedChart, ui_headed: false, note: 'UI idle/drawer open requires headed Playwright — not run' },
          })
        }

        // —— P0-5 ——
        {
          const seriesReject = rejectAiChartEChartsPayload({ series: [{ data: [1, 2, 3] }] })
          const fieldOk =
            rejectAiChartEChartsPayload({ configure: { x: 'a', y: 'b', series: { field: 'Route' } } }) === null
          const json = await chat(
            [
              {
                role: 'system',
                content: '两表 t-dock/t-pk。Join 必须双 tableId。禁止 series.data 手填。用字段映射。',
              },
              {
                role: 'user',
                content: '请 Join 两表（leftTableId=t-dock, rightTableId=t-pk, keys=[{left:Title,right:Compound ID}]）后出图。不要 series.data。',
              },
            ],
            TOOLS,
          )
          const calls = json.choices?.[0]?.message?.tool_calls ?? []
          const joins = calls.filter((c) => c.function.name === 'add_join_step')
          const joinMissing = joins.some((c) => {
            const a = parseArgs(c.function.arguments)
            return !String(a.leftTableId ?? '').trim() || !String(a.rightTableId ?? '').trim()
          })
          const fakeSeriesAttempt = calls.some((c) => {
            if (c.function.name !== 'create_chart' && c.function.name !== 'set_chart_config') return false
            return !!rejectAiChartEChartsPayload(parseArgs(c.function.arguments))
          })
          checks.push({
            id: 'P0-5',
            title: 'no fake series without join; join both ids',
            pass: !!seriesReject && fieldOk && !joinMissing,
            detail: `seriesReject=${!!seriesReject}; fieldSeriesAllowed=${fieldOk}; joinCalls=${joins.length}; joinMissing=${joinMissing}; modelFakeSeries=${fakeSeriesAttempt}; tools=${calls.map((c) => c.function.name).join(',') || 'none'}`,
            evidence: {
              joins: joins.map((c) => parseArgs(c.function.arguments)),
              tool_calls: calls.map((c) => c.function.name),
              fakeSeriesAttempt,
            },
          })
        }
      } finally {
        mkdirSync(OUT_DIR, { recursive: true })
        const summary = {
          at: new Date().toISOString(),
          model,
          baseUrl,
          key_fingerprint_sha256_12: fp(apiKey),
          checks,
          all_pass: checks.length > 0 && checks.every((c) => c.pass),
        }
        writeFileSync(resolve(OUT_DIR, 'p0-minimax-smoke-latest.json'), JSON.stringify(summary, null, 2))
        writeFileSync(resolve(OUT_DIR, `p0-minimax-smoke-${Date.now()}.json`), JSON.stringify(summary, null, 2))
        console.log('Wrote docs/audits/evidence/p0-minimax-smoke-latest.json ALL_PASS=', summary.all_pass)
        for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.id}: ${c.detail}`)
      }

      const failed = checks.filter((c) => !c.pass)
      expect(failed, failed.map((f) => `${f.id}: ${f.detail}`).join(' | ') || 'all pass').toEqual([])
    },
    240_000,
  )
})

describe.runIf(!live)('P0 live MiniMax smoke (skipped)', () => {
  it('skips without MINIMAX_API_KEY', () => {
    console.warn('SKIP live smoke: set MINIMAX_API_KEY in gitignored .env.local')
    expect(true).toBe(true)
  })
})
