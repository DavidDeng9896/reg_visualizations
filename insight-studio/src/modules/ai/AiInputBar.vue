<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { IButton, IIcon, IPopover } from '../../ui'
import { useAnalysisStore } from '../../stores/analysisStore'
import { useAiStore } from './aiStore'
import type { MentionTarget } from './context'

/** AI 输入条：@ 引用 / / 指令 / 模型显示 / 发送·中止。 */
const ai = useAiStore()
const { running, config } = storeToRefs(ai)
const analysisStore = useAnalysisStore()
const { current } = storeToRefs(analysisStore)

const text = ref('')
const mentions = ref<MentionTarget[]>([])
const atOpen = ref(false)
const slashOpen = ref(false)
const inputEl = ref<HTMLTextAreaElement>()

const SLASH_COMMANDS = [
  { key: '分析此表', text: '分析当前表的数据分布并给出洞察' },
  { key: '出散点图', text: '为当前表创建一个散点图视图并配置好映射' },
  { key: '出柱状图', text: '为当前表创建一个柱状图视图并配置好映射' },
  { key: '生成看板', text: '基于当前分析创建看板并加入关键图表' },
]

const canSend = computed(() => text.value.trim().length > 0 && !running.value)

const mentionables = computed(() => {
  const a = current.value
  if (!a) return []
  const items: { key: string; label: string; target: MentionTarget }[] = [{ key: 'analysis', label: `分析：${a.name}`, target: { kind: 'analysis' } }]
  for (const t of a.tables) {
    items.push({ key: `t-${t.id}`, label: `表：${t.name}`, target: { kind: 'table', tableId: t.id } })
    for (const v of t.views) {
      items.push({ key: `v-${v.id}`, label: `视图：${v.name}`, target: { kind: 'view', tableId: t.id, viewId: v.id } })
    }
  }
  return items
})

function addMention(target: MentionTarget, label: string): void {
  if (!mentions.value.some((m) => JSON.stringify(m) === JSON.stringify(target))) mentions.value.push(target)
  atOpen.value = false
  void label
  void nextTick(() => inputEl.value?.focus())
}
function removeMention(i: number): void {
  mentions.value.splice(i, 1)
}
function mentionLabel(m: MentionTarget): string {
  const a = current.value
  if (m.kind === 'analysis') return a?.name ?? '分析'
  if (m.kind === 'table') return a?.tables.find((t) => t.id === m.tableId)?.name ?? '表'
  const t = a?.tables.find((x) => x.id === m.tableId)
  return t?.views.find((v) => v.id === m.viewId)?.name ?? '视图'
}

function applySlash(cmd: { key: string; text: string }): void {
  text.value = cmd.text
  slashOpen.value = false
  void nextTick(() => inputEl.value?.focus())
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void submit()
  }
  if (e.key === 'Escape') {
    atOpen.value = false
    slashOpen.value = false
  }
}

async function submit(): Promise<void> {
  const input = text.value.trim()
  if (!input || running.value) return
  const ms = [...mentions.value]
  text.value = ''
  mentions.value = []
  await ai.send(input, ms)
}

watch(
  () => ai.drawerOpen,
  (open) => {
    if (open) void nextTick(() => inputEl.value?.focus())
  },
)
</script>

<template>
  <div class="bar" data-testid="ai-inputbar">
    <div v-if="mentions.length" class="bar__mentions">
      <span v-for="(m, i) in mentions" :key="i" class="bar__chip">
        {{ mentionLabel(m) }}
        <button type="button" aria-label="移除引用" @click="removeMention(i)">×</button>
      </span>
    </div>
    <div class="bar__row">
      <IPopover :open="atOpen" placement="top-start" :arrow="false" @update:open="atOpen = $event">
        <template #anchor>
          <button type="button" class="bar__tool" title="引用上下文（表/视图）" aria-label="引用上下文" @click="atOpen = !atOpen">@</button>
        </template>
        <template #default>
          <div class="bar__menu" role="menu">
            <button v-if="!mentionables.length" type="button" class="bar__menu-item" disabled>无可引用项（先打开一个分析）</button>
            <button v-for="it in mentionables" :key="it.key" type="button" class="bar__menu-item" role="menuitem" @click="addMention(it.target, it.label)">
              {{ it.label }}
            </button>
          </div>
        </template>
      </IPopover>

      <IPopover :open="slashOpen" placement="top-start" :arrow="false" @update:open="slashOpen = $event">
        <template #anchor>
          <button type="button" class="bar__tool" title="快捷指令" aria-label="快捷指令" @click="slashOpen = !slashOpen">/</button>
        </template>
        <template #default>
          <div class="bar__menu" role="menu">
            <button v-for="c in SLASH_COMMANDS" :key="c.key" type="button" class="bar__menu-item" role="menuitem" @click="applySlash(c)">
              /{{ c.key }}
            </button>
          </div>
        </template>
      </IPopover>

      <textarea
        ref="inputEl"
        v-model="text"
        class="bar__input"
        rows="2"
        :placeholder="running ? '生成中，可点击中止…' : config?.configured ? '问点什么，比如：把当前表画成散点图并拟合' : '先在右上角设置里配置 API Key'"
        :disabled="running"
        data-testid="ai-input"
        @keydown="onKeydown"
      />

      <span class="bar__model" :title="config?.baseUrl">{{ config?.model ?? '未配置' }}</span>

      <IButton v-if="running" variant="danger" size="sm" icon="close" aria-label="中止" data-testid="ai-stop" @click="ai.stop()" />
      <IButton v-else variant="primary" size="sm" icon="send" aria-label="发送" :disabled="!canSend" data-testid="ai-send" @click="submit" />
    </div>
  </div>
</template>

<style scoped>
.bar {
  border-top: 1px solid var(--is-border);
  padding: 8px 10px;
  background: var(--is-surface);
}
.bar__mentions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.bar__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--is-radius-full);
  background: var(--is-accent-soft);
  color: var(--is-accent);
  font-size: 11px;
}
.bar__chip button {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}
.bar__row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}
.bar__tool {
  width: 28px;
  height: 28px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  background: var(--is-surface);
  color: var(--is-text-secondary);
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
}
.bar__tool:hover {
  border-color: var(--is-accent);
  color: var(--is-accent);
}
.bar__input {
  flex: 1;
  min-width: 0;
  resize: none;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  padding: 6px 10px;
  font-size: var(--is-text-sm);
  font-family: inherit;
  outline: none;
}
.bar__input:focus {
  border-color: var(--is-accent);
  box-shadow: var(--is-ring-sm);
}
.bar__model {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--is-text-tertiary);
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bar__menu {
  display: flex;
  flex-direction: column;
  padding: 4px;
  max-height: 240px;
  overflow-y: auto;
  min-width: 200px;
}
.bar__menu-item {
  padding: 7px 10px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
  cursor: pointer;
}
.bar__menu-item:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.bar__menu-item:disabled {
  color: var(--is-text-tertiary);
}
</style>
