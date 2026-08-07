<script setup lang="ts">
/**
 * 报告 HTML 预览：科研主题；支持打印/另存为 PDF。
 */
import { computed, ref, watch } from 'vue'
import type { Analysis, AnalysisReport } from '../../../shared/types'
import { renderReportHtml } from '../report/reportModel'
import { IButton, IIcon } from '../../../ui'

const props = defineProps<{
  report: AnalysisReport
  analysis: Analysis | null
}>()

const frame = ref<HTMLIFrameElement>()

const srcdoc = computed(() => renderReportHtml(props.report, props.analysis))

watch(srcdoc, () => {
  /* iframe 通过 :srcdoc 刷新 */
})

function printPdf() {
  const win = frame.value?.contentWindow
  if (!win) return
  win.focus()
  win.print()
}
</script>

<template>
  <div class="rpv">
    <div class="rpv__bar">
      <span class="rpv__hint">科研主题预览 · 导出请用系统打印对话框另存为 PDF</span>
      <IButton size="sm" variant="secondary" @click="printPdf">
        <IIcon name="file-text" :size="14" />
        导出 PDF
      </IButton>
    </div>
    <iframe
      ref="frame"
      class="rpv__frame"
      title="报告预览"
      sandbox="allow-same-origin allow-modals allow-popups"
      :srcdoc="srcdoc"
    />
  </div>
</template>

<style scoped>
.rpv {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 360px;
  flex: 1;
}
.rpv__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.rpv__hint {
  font-size: 12px;
  color: var(--is-text-secondary, #667085);
}
.rpv__frame {
  width: 100%;
  flex: 1;
  min-height: 420px;
  border: 1px solid var(--is-border, #d0d5dd);
  border-radius: 4px;
  background: #fbfbf9;
}
</style>
