<script setup lang="ts">
/**
 * 分析报告可视化编辑器：章节增删改排序 + 实时预览。
 */
import { computed, ref } from 'vue'
import type { Analysis, AnalysisReport, ReportSection, ReportSectionKind } from '../../../shared/types'
import { uuid } from '../../../shared/id'
import { IButton, IIcon, ISelect, ITextField } from '../../../ui'
import ReportPreview from './ReportPreview.vue'

const props = withDefaults(
  defineProps<{
    report: AnalysisReport
    analysis: Analysis | null
    readonly?: boolean
  }>(),
  { readonly: false },
)

const emit = defineEmits<{ (e: 'update:report', value: AnalysisReport): void }>()

const showPreview = ref(true)

/** readonly 时强制隐藏内嵌预览（外层面板有独立预览标签页）。 */
const previewOn = computed(() => showPreview.value && !props.readonly)

const sectionKindOptions = [
  { value: 'heading', label: '标题' },
  { value: 'paragraph', label: '段落' },
  { value: 'bullets', label: '要点列表' },
  { value: 'chart', label: '图表' },
  { value: 'table', label: '表格' },
  { value: 'divider', label: '分割线' },
]

const tableOptions = computed(() => {
  if (!props.analysis) return []
  return props.analysis.tables.map((t) => ({ value: t.id, label: t.name }))
})

function viewOptions(tableId: string | undefined) {
  if (!tableId || !props.analysis) return []
  const table = props.analysis.tables.find((t) => t.id === tableId)
  return (table?.views ?? []).map((v) => ({ value: v.id, label: v.name }))
}

function update(patch: Partial<AnalysisReport>) {
  emit('update:report', { ...props.report, ...patch })
}

function updateSection(id: string, patch: Partial<ReportSection>) {
  const sections = props.report.sections.map((s) => (s.id === id ? { ...s, ...patch } : s))
  update({ sections })
}

function addSection(kind: ReportSectionKind) {
  const sec: ReportSection = {
    id: uuid(),
    kind,
    title: kind === 'divider' ? '' : '新章节',
    body: kind === 'paragraph' ? '' : undefined,
    items: kind === 'bullets' ? [''] : undefined,
    tableId: kind === 'chart' || kind === 'table' ? tableOptions.value[0]?.value : undefined,
    viewId: kind === 'chart' ? undefined : undefined,
    caption: '',
  }
  update({ sections: [...props.report.sections, sec] })
}

function removeSection(id: string) {
  update({ sections: props.report.sections.filter((s) => s.id !== id) })
}

function moveSection(id: string, dir: -1 | 1) {
  const idx = props.report.sections.findIndex((s) => s.id === id)
  if (idx < 0) return
  const next = idx + dir
  if (next < 0 || next >= props.report.sections.length) return
  const sections = [...props.report.sections]
  ;[sections[idx], sections[next]] = [sections[next], sections[idx]]
  update({ sections })
}

function setSectionItems(id: string, text: string) {
  const items = text.split('\n').map((s) => s.trim()).filter(Boolean)
  updateSection(id, { items })
}

function sectionItemsText(sec: ReportSection): string {
  return (sec.items ?? []).join('\n')
}
</script>

<template>
  <div class="red">
    <div class="red__bar">
      <h4 class="red__title">报告内容</h4>
      <IButton v-if="!readonly" size="sm" variant="ghost" @click="showPreview = !showPreview">
        <IIcon :name="showPreview ? 'chevron-up' : 'chevron-down'" :size="14" />
        {{ showPreview ? '隐藏预览' : '显示预览' }}
      </IButton>
    </div>

    <div class="red__grid" :class="{ 'red__grid--preview': previewOn }">
      <!-- 编辑区（readonly 时整体只读） -->
      <div class="red__editor">
        <div class="red__field">
          <label class="red__label">报告标题</label>
          <ITextField
            :model-value="report.title"
            size="sm"
            :disabled="readonly"
            @update:model-value="update({ title: String($event ?? '') })"
          />
        </div>
        <div class="red__field">
          <label class="red__label">副标题</label>
          <ITextField
            :model-value="report.subtitle ?? ''"
            size="sm"
            placeholder="可选"
            :disabled="readonly"
            @update:model-value="update({ subtitle: String($event ?? '') })"
          />
        </div>

        <div class="red__sections">
          <div v-for="(sec, i) in report.sections" :key="sec.id" class="red__sec">
            <div class="red__sec-head">
              <ISelect
                :model-value="sec.kind"
                size="sm"
                :options="sectionKindOptions"
                :disabled="readonly"
                @update:model-value="updateSection(sec.id, { kind: String($event) as ReportSectionKind })"
              />
              <div v-if="!readonly" class="red__sec-actions">
                <button type="button" class="red__icon-btn" :disabled="i === 0" title="上移" @click="moveSection(sec.id, -1)">
                  <IIcon name="chevron-up" :size="12" />
                </button>
                <button type="button" class="red__icon-btn" :disabled="i === report.sections.length - 1" title="下移" @click="moveSection(sec.id, 1)">
                  <IIcon name="chevron-down" :size="12" />
                </button>
                <button type="button" class="red__icon-btn red__icon-btn--danger" title="删除" @click="removeSection(sec.id)">
                  <IIcon name="trash" :size="12" />
                </button>
              </div>
            </div>

            <div v-if="sec.kind !== 'divider'" class="red__sec-body">
              <div class="red__field">
                <label class="red__label">标题</label>
                <ITextField
                  :model-value="sec.title ?? ''"
                  size="sm"
                  placeholder="章节标题"
                  :disabled="readonly"
                  @update:model-value="updateSection(sec.id, { title: String($event ?? '') })"
                />
              </div>

              <div v-if="sec.kind === 'paragraph'" class="red__field">
                <label class="red__label">正文</label>
                <textarea
                  class="red__textarea"
                  :value="sec.body ?? ''"
                  rows="4"
                  placeholder="段落内容…"
                  :disabled="readonly"
                  @input="updateSection(sec.id, { body: ($event.target as HTMLTextAreaElement).value })"
                />
              </div>

              <div v-else-if="sec.kind === 'bullets'" class="red__field">
                <label class="red__label">列表项（每行一条）</label>
                <textarea
                  class="red__textarea"
                  :value="sectionItemsText(sec)"
                  rows="4"
                  placeholder="要点 1&#10;要点 2&#10;要点 3"
                  :disabled="readonly"
                  @input="setSectionItems(sec.id, ($event.target as HTMLTextAreaElement).value)"
                />
              </div>

              <template v-else-if="sec.kind === 'chart' || sec.kind === 'table'">
                <div class="red__field">
                  <label class="red__label">选择表</label>
                  <ISelect
                    :model-value="sec.tableId ?? null"
                    size="sm"
                    :options="tableOptions"
                    placeholder="选择数据表"
                    :disabled="readonly"
                    @update:model-value="updateSection(sec.id, { tableId: String($event ?? ''), viewId: undefined })"
                  />
                </div>
                <div v-if="sec.kind === 'chart'" class="red__field">
                  <label class="red__label">选择视图</label>
                  <ISelect
                    :model-value="sec.viewId ?? null"
                    size="sm"
                    :options="viewOptions(sec.tableId)"
                    placeholder="选择图表视图"
                    :disabled="readonly || !sec.tableId"
                    @update:model-value="updateSection(sec.id, { viewId: String($event ?? '') })"
                  />
                </div>
                <div class="red__field">
                  <label class="red__label">说明文字</label>
                  <ITextField
                    :model-value="sec.caption ?? ''"
                    size="sm"
                    placeholder="图/表说明（可选）"
                    :disabled="readonly"
                    @update:model-value="updateSection(sec.id, { caption: String($event ?? '') })"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>

        <div v-if="!readonly" class="red__add">
          <IButton
            v-for="opt in sectionKindOptions"
            :key="opt.value"
            size="sm"
            variant="secondary"
            @click="addSection(opt.value as ReportSectionKind)"
          >
            + {{ opt.label }}
          </IButton>
        </div>

        <div class="red__field">
          <label class="red__label">结论</label>
          <textarea
            class="red__textarea"
            :value="report.conclusion ?? ''"
            rows="4"
            placeholder="研究结论…"
            :disabled="readonly"
            @input="update({ conclusion: ($event.target as HTMLTextAreaElement).value })"
          />
        </div>
      </div>

      <!-- 预览区 -->
      <div v-if="previewOn" class="red__preview">
        <ReportPreview :report="report" :analysis="analysis" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.red {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.red__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.red__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--is-text);
}
.red__grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.red__grid--preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
}
@media (max-width: 960px) {
  .red__grid--preview {
    grid-template-columns: 1fr;
  }
}
.red__editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.red__preview {
  min-width: 0;
  position: sticky;
  top: 0;
}
.red__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.red__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--is-text-secondary);
}
.red__sections {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.red__sec {
  border: 1px solid var(--is-border);
  border-radius: 8px;
  background: var(--is-surface);
  overflow: hidden;
}
.red__sec-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--is-surface-hover);
  border-bottom: 1px solid var(--is-border);
}
.red__sec-head :deep(.i-select) {
  flex: 1;
  min-width: 120px;
}
.red__sec-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.red__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--is-text-tertiary);
  cursor: pointer;
}
.red__icon-btn:hover:not(:disabled) {
  background: var(--is-surface);
  color: var(--is-text);
}
.red__icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.red__icon-btn--danger:hover:not(:disabled) {
  color: var(--is-danger);
  background: var(--is-danger-soft);
}
.red__sec-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.red__textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--is-border);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  background: var(--is-surface);
  color: var(--is-text);
}
.red__textarea:focus {
  outline: none;
  border-color: var(--is-accent);
  box-shadow: var(--is-ring-sm);
}
.red__add {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
