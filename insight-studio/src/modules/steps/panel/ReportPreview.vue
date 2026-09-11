<script setup lang="ts">
/**
 * 报告实况预览：Vue 文档内嵌 Plotly 图表；导出 PDF 时截取静态图再打印。
 */
import { computed, nextTick, ref } from 'vue'
import type { Analysis, AnalysisReport, ReportSection } from '../../../shared/types'
import type { ReportTemplateId } from '../../../shared/types'
import { reportThemePageClass, resolveReportTheme } from '../report/reportTemplates'
import { renderReportHtmlWithImages, type ReportEmbedImages } from '../report/reportModel'
import { IButton, IIcon } from '../../../ui'
import ReportEmbedChart from './ReportEmbedChart.vue'
import ReportEmbedTable from './ReportEmbedTable.vue'

const props = defineProps<{
  /** 由父级顶栏托管「导出 PDF」时隐藏内置工具条 */
  hideToolbar?: boolean

  report: AnalysisReport
  analysis: Analysis | null
}>()

const themeId = computed((): ReportTemplateId =>
  resolveReportTheme(props.report.theme, props.report.templateId),
)
const themePageClass = computed(() => reportThemePageClass(themeId.value))

const chartRefs = ref<Record<string, InstanceType<typeof ReportEmbedChart> | null>>({})
const exporting = ref(false)

function setChartRef(id: string, el: unknown) {
  if (el) chartRefs.value[id] = el as InstanceType<typeof ReportEmbedChart>
  else delete chartRefs.value[id]
}

function sectionLabel(sec: ReportSection): string {
  if (sec.kind === 'chart') {
    if (sec.chartId) {
      const ch = props.analysis?.charts?.find((c) => c.id === sec.chartId)
      return `图 · ${ch?.name ?? sec.chartId}`
    }
    const table = props.analysis?.tables.find((t) => t.id === sec.tableId)
    let name = sec.viewId
    if (table && sec.viewId) {
      const walk = (nodes: typeof table.views): string | undefined => {
        for (const v of nodes) {
          if (v.id === sec.viewId) return v.name
          const n = v.children?.length ? walk(v.children) : undefined
          if (n) return n
        }
        return undefined
      }
      name = walk(table.views) ?? sec.viewId
    }
    return `图 · ${name ?? '未指定视图'}`
  }
  if (sec.kind === 'table') {
    const table = props.analysis?.tables.find((t) => t.id === sec.tableId)
    return `表 · ${table?.name ?? sec.tableId ?? '未指定表'}`
  }
  return sec.title || ''
}

async function collectImages(): Promise<ReportEmbedImages> {
  const images: ReportEmbedImages = {}
  await nextTick()
  // 稍等 Plotly 布局稳定
  await new Promise((r) => setTimeout(r, 120))
  for (const sec of props.report.sections) {
    if (sec.kind !== 'chart') continue
    const ref = chartRefs.value[sec.id]
    if (!ref) continue
    const url = await ref.getDataURL()
    if (url) images[sec.id] = url
  }
  return images
}

async function printPdf() {
  if (exporting.value) return
  exporting.value = true
  try {
    const images = await collectImages()
    const html = renderReportHtmlWithImages(props.report, props.analysis, images)
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) {
      // 弹窗被拦时退化为当前页临时 iframe
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)
      const doc = iframe.contentDocument
      if (doc) {
        doc.open()
        doc.write(html)
        doc.close()
        iframe.onload = () => {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          setTimeout(() => iframe.remove(), 1000)
        }
      }
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    // 等图片解码后再 print
    setTimeout(() => {
      win.print()
    }, 350)
  } finally {
    exporting.value = false
  }
}

defineExpose({ printPdf })
</script>

<template>
  <div class="rpv">
    <div v-if="!props.hideToolbar" class="rpv__bar">
      <span class="rpv__hint">实况预览（可交互图表）· 导出 PDF 时嵌入静态图</span>
      <IButton size="sm" variant="secondary" :loading="exporting" @click="printPdf">
        <IIcon name="file-text" :size="14" />
        导出 PDF
      </IButton>
    </div>

    <div class="rpv__scroll">
      <article class="rp" :class="themePageClass">
        <header class="rp__header">
          <p class="rp__kicker">Analysis Report</p>
          <h1 class="rp__title">{{ report.title }}</h1>
          <p v-if="report.subtitle" class="rp__subtitle">{{ report.subtitle }}</p>
          <p class="rp__meta">
            <template v-if="analysis?.name">分析：{{ analysis.name }} · </template>
            生成于 {{ report.generatedAt }}
            <template v-if="report.templateId && report.templateId !== 'research'">
              · 模板 {{ report.templateId }}
            </template>
          </p>
        </header>

        <template v-for="sec in report.sections" :key="sec.id">
          <section v-if="sec.kind === 'heading'" class="rp__section">
            <h2 class="rp__h2">{{ sec.title }}</h2>
          </section>

          <section v-else-if="sec.kind === 'paragraph'" class="rp__section">
            <h2 v-if="sec.title" class="rp__h2">{{ sec.title }}</h2>
            <div class="rp__body">
              <p v-for="(p, i) in (sec.body || '').split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)" :key="i">
                <template v-for="(line, j) in p.split('\n')" :key="j">
                  <br v-if="j > 0" />{{ line }}
                </template>
              </p>
            </div>
          </section>

          <section v-else-if="sec.kind === 'bullets'" class="rp__section">
            <h2 v-if="sec.title" class="rp__h2">{{ sec.title }}</h2>
            <ul class="rp__ul">
              <li v-for="(item, i) in sec.items ?? []" :key="i">{{ item }}</li>
            </ul>
          </section>

          <section v-else-if="sec.kind === 'chart' || sec.kind === 'table'" class="rp__section">
            <figure class="rp__figure">
              <div class="rp__figure-label">{{ sectionLabel(sec) }}</div>
              <ReportEmbedChart
                v-if="sec.kind === 'chart'"
                :ref="(el) => setChartRef(sec.id, el)"
                :analysis="analysis"
                :table-id="sec.tableId"
                :view-id="sec.viewId"
                :chart-id="sec.chartId"
              />
              <ReportEmbedTable
                v-else
                :analysis="analysis"
                :table-id="sec.tableId"
              />
              <figcaption v-if="sec.caption" class="rp__caption">{{ sec.caption }}</figcaption>
            </figure>
          </section>

          <hr v-else-if="sec.kind === 'divider'" class="rp__divider" />
        </template>

        <aside v-if="report.conclusion?.trim()" class="rp__conclusion">
          <h2>结论</h2>
          <div class="rp__body">
            <p
              v-for="(p, i) in report.conclusion.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)"
              :key="i"
            >
              <template v-for="(line, j) in p.split('\n')" :key="j">
                <br v-if="j > 0" />{{ line }}
              </template>
            </p>
          </div>
        </aside>
      </article>
    </div>
  </div>
</template>

<style scoped>
.rpv {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 360px;
  flex: 1;
  height: 100%;
  min-width: 0;
}
.rpv__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}
.rpv__hint {
  font-size: 12px;
  color: var(--is-text-secondary, #667085);
}
.rpv__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--is-border, #d0d5dd);
  border-radius: 4px;
  background: #fbfbf9;
}

/* 与 RESEARCH_REPORT_CSS 对齐的实况文档样式 */
.rp {
  --rp-ink: #1a1d21;
  --rp-muted: #5c6570;
  --rp-line: #d8dde3;
  --rp-paper: #fbfbf9;
  --rp-accent: #1f4e79;
  --rp-accent-soft: #e8eef5;
  max-width: 820px;
  margin: 0 auto;
  padding: 36px 28px 48px;
  color: var(--rp-ink);
  font-size: 15px;
  line-height: 1.65;
}
.rp__header {
  border-bottom: 2px solid var(--rp-accent);
  padding-bottom: 20px;
  margin-bottom: 28px;
}
.rp__kicker {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rp-accent);
  font-weight: 600;
  margin: 0 0 10px;
}
.rp__title {
  font-family: "Source Serif 4", "IBM Plex Serif", "Noto Serif SC", Georgia, serif;
  font-size: 26px;
  font-weight: 650;
  line-height: 1.25;
  margin: 0 0 8px;
}
.rp__subtitle {
  margin: 0;
  color: var(--rp-muted);
  font-size: 14px;
}
.rp__meta {
  margin-top: 12px;
  font-size: 12px;
  color: var(--rp-muted);
}
.rp__section {
  margin: 24px 0;
}
.rp__h2 {
  font-family: "Source Serif 4", "IBM Plex Serif", "Noto Serif SC", Georgia, serif;
  font-size: 17px;
  font-weight: 650;
  margin: 0 0 12px;
  color: var(--rp-accent);
}
.rp__body p {
  margin: 0 0 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.rp__ul {
  margin: 0;
  padding-left: 1.25em;
}
.rp__ul li {
  margin: 4px 0;
}
.rp__figure {
  margin: 12px 0 8px;
  padding: 12px;
  background: var(--rp-accent-soft);
  border: 1px solid var(--rp-line);
}
.rp__figure-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--rp-accent);
  margin: 0 0 8px;
}
.rp__caption {
  font-size: 12px;
  color: var(--rp-muted);
  margin: 8px 0 0;
  font-style: italic;
  white-space: pre-wrap;
  word-break: break-word;
}
.rp__divider {
  border: 0;
  border-top: 1px solid var(--rp-line);
  margin: 24px 0;
}
.rp__conclusion {
  margin-top: 32px;
  padding: 18px 20px;
  border-left: 3px solid var(--rp-accent);
  background: #fff;
  border-top: 1px solid var(--rp-line);
  border-right: 1px solid var(--rp-line);
  border-bottom: 1px solid var(--rp-line);
}
.rp__conclusion h2 {
  font-family: "Source Serif 4", "IBM Plex Serif", "Noto Serif SC", Georgia, serif;
  font-size: 16px;
  margin: 0 0 8px;
  color: var(--rp-accent);
}

/* Lumen theme pages on live preview */
.rp.research-page {
  --rp-ink: #1a1d21;
  --rp-muted: #5c6570;
  --rp-line: #d8dde3;
  --rp-paper: #ffffff;
  --rp-accent: #1a1d21;
  --rp-accent-soft: #f3f4f6;
  background: #fff;
}
.rp.research-page .rp__title,
.rp.research-page .rp__h2,
.rp.research-page .rp__conclusion h2 {
  font-family: "Source Serif 4", "IBM Plex Serif", "Noto Serif SC", Georgia, serif;
  color: var(--rp-ink);
}
.rp.research-page .rp__header { border-bottom: 1px solid var(--rp-line); }
.rp.research-page .rp__kicker { color: var(--rp-muted); }
.rp.research-page .rp__figure {
  background: #fff;
  border: 0;
  border-top: 1px solid var(--rp-line);
  border-bottom: 1px solid var(--rp-line);
  border-radius: 0;
  padding: 12px 0;
}

.rp.antibody-page {
  --rp-ink: #0f172a;
  --rp-muted: #64748b;
  --rp-line: #e2e8f0;
  --rp-paper: #f8fafc;
  --rp-accent: #1e3a5f;
  --rp-accent-soft: #e8eef5;
  background: var(--rp-paper);
  font-family: "Source Sans 3", "IBM Plex Sans", "Noto Sans SC", "PingFang SC", sans-serif;
}
.rp.antibody-page .rp__title,
.rp.antibody-page .rp__h2,
.rp.antibody-page .rp__conclusion h2 {
  font-family: inherit;
}
.rp.antibody-page .rp__header {
  margin: -36px -28px 28px;
  padding: 18px 28px 22px;
  background: var(--rp-accent);
  border-bottom: 0;
  color: #fff;
}
.rp.antibody-page .rp__kicker { color: rgba(255,255,255,0.75); letter-spacing: 0.16em; }
.rp.antibody-page .rp__title { color: #fff; }
.rp.antibody-page .rp__subtitle,
.rp.antibody-page .rp__meta { color: rgba(255,255,255,0.8); }
.rp.antibody-page .rp__h2 { color: var(--rp-accent); }
.rp.antibody-page .rp__figure {
  background: #fff;
  border: 1px solid var(--rp-line);
  border-radius: 8px;
}
.rp.antibody-page .rp__conclusion { border-left-color: var(--rp-accent); }

.rp.dash-page {
  --rp-ink: #0f172a;
  --rp-muted: #64748b;
  --rp-line: #e5e7eb;
  --rp-paper: #f3f4f6;
  --rp-accent: #2563eb;
  --rp-accent-soft: #eff6ff;
  background: var(--rp-paper);
  font-family: "Source Sans 3", "IBM Plex Sans", "Noto Sans SC", "PingFang SC", sans-serif;
}
.rp.dash-page .rp__title,
.rp.dash-page .rp__h2,
.rp.dash-page .rp__conclusion h2 {
  font-family: inherit;
  color: var(--rp-ink);
}
.rp.dash-page .rp__header {
  background: #fff;
  border: 1px solid var(--rp-line);
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.rp.dash-page .rp__kicker {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #374151;
  font-size: 10px;
}
.rp.dash-page .rp__section {
  background: #fff;
  border: 1px solid var(--rp-line);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.rp.dash-page .rp__figure {
  background: #f9fafb;
  border: 1px solid var(--rp-line);
  border-radius: 10px;
}
.rp.dash-page .rp__conclusion {
  border: 1px solid var(--rp-line);
  border-left: 3px solid var(--rp-accent);
  border-radius: 12px;
  background: #fff;
}
.rp.dash-page .rp__conclusion h2 { color: var(--rp-accent); }

/* scroll bg follows theme paper */
.rpv__scroll:has(.antibody-page) { background: #f8fafc; }
.rpv__scroll:has(.dash-page) { background: #f3f4f6; }
.rpv__scroll:has(.research-page) { background: #fff; }
</style>
