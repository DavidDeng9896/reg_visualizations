<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { IIcon, IPopover, toast } from '../../ui'
import { useAnalysisStore } from '../../stores/analysisStore'
import { useAiStore } from './aiStore'
import { CONTEXT_TOKEN_LIMIT, formatTokens } from './tokens'
import type { MentionTarget } from './context'
import { mentionIcon, mentionName, VIEW_ICON } from './mentionIcons'
import type { IconName } from '../../ui'
import type { ViewNode } from '../../shared/types'

/**
 * AI 输入条（对齐参考交互）：统一圆角盒子 + 自动增高输入区 +
 * 工具行（+ 上下文/指令菜单 · 模型选择器 · 发送/中止方块按钮）。
 * 支持输入时内联触发 @（引用表/视图）与 /（快捷指令），Enter 选中首项。
 */
const ai = useAiStore()
const { running, config } = storeToRefs(ai)
const analysisStore = useAnalysisStore()
const { current } = storeToRefs(analysisStore)

const text = ref('')
const mentions = ref<MentionTarget[]>([])
const inputEl = ref<HTMLTextAreaElement>()

type MenuMode = 'plus' | 'mention' | 'slash' | 'models' | 'permissions' | null
const menuMode = ref<MenuMode>(null)
const mentionFilter = ref('')
const slashFilter = ref('')

const PERMISSION_OPTIONS = [
  {
    mode: 'ask' as const,
    label: '请求权限',
    desc: '操作前先请求授权',
    icon: 'shield-check' as const,
  },
  {
    mode: 'allow' as const,
    label: '全部允许',
    desc: '无需授权直接执行',
    icon: 'circle-alert' as const,
  },
]

const canSend = computed(() => text.value.trim().length > 0 && !running.value)

const permissionOption = computed(
  () => PERMISSION_OPTIONS.find((o) => o.mode === ai.permissionMode) ?? PERMISSION_OPTIONS[0],
)

const SLASH_COMMANDS = [
  { key: '分析此表', text: '分析当前表的数据分布并给出洞察' },
  { key: '出散点图', text: '为当前表创建一个散点图视图并配置好映射' },
  { key: '出柱状图', text: '为当前表创建一个柱状图视图并配置好映射' },
  { key: '生成看板', text: '基于当前分析创建看板并加入关键图表' },
]

/* ------------------------------- 引用（@） ------------------------------- */

function appendViewMentions(
  views: ViewNode[],
  tableId: string,
  items: { key: string; label: string; icon: IconName; target: MentionTarget }[],
): void {
  for (const v of views) {
    items.push({
      key: `v-${v.id}`,
      label: `视图：${v.name}`,
      icon: VIEW_ICON[v.type],
      target: { kind: 'view', tableId, viewId: v.id },
    })
    appendViewMentions(v.children, tableId, items)
  }
}

const mentionables = computed(() => {
  const a = current.value
  if (!a) return []
  const items: { key: string; label: string; icon: IconName; target: MentionTarget }[] = [
    { key: 'analysis', label: `分析：${a.name}`, icon: 'database', target: { kind: 'analysis' } },
  ]
  for (const t of a.tables) {
    items.push({ key: `t-${t.id}`, label: `表：${t.name}`, icon: 'table', target: { kind: 'table', tableId: t.id } })
    appendViewMentions(t.views, t.id, items)
  }
  return items
})

const filteredMentionables = computed(() => {
  const f = mentionFilter.value.trim().toLowerCase()
  if (!f) return mentionables.value
  return mentionables.value.filter((it) => it.label.toLowerCase().includes(f))
})

const filteredCommands = computed(() => {
  const f = slashFilter.value.trim().toLowerCase()
  if (!f) return SLASH_COMMANDS
  return SLASH_COMMANDS.filter((c) => c.key.toLowerCase().includes(f))
})

function addMention(target: MentionTarget): void {
  if (!mentions.value.some((m) => JSON.stringify(m) === JSON.stringify(target))) mentions.value.push(target)
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

function iconForMention(m: MentionTarget): IconName {
  return mentionIcon(m, current.value)
}

/** 从 + 菜单选引用：不加文本，直接成 chip。 */
function pickMentionFromMenu(it: { label: string; target: MentionTarget }): void {
  addMention(it.target)
  menuMode.value = null
  void nextTick(() => inputEl.value?.focus())
}

/** 内联 @ 选引用：删掉正在输入的 @token 再成 chip。 */
function pickMentionInline(it: { label: string; target: MentionTarget }): void {
  const el = inputEl.value
  const caret = el?.selectionStart ?? text.value.length
  const before = text.value.slice(0, caret).replace(/@[^\s@]*$/, '')
  text.value = before + text.value.slice(caret)
  addMention(it.target)
  menuMode.value = null
  void nextTick(() => inputEl.value?.focus())
}

function applySlash(cmd: { key: string; text: string }): void {
  text.value = cmd.text
  menuMode.value = null
  void nextTick(() => inputEl.value?.focus())
}

/* ------------------------------- 模型选择 ------------------------------- */

const modelOptions = computed(() => {
  const c = config.value
  if (!c) return [] as string[]
  return [...new Set([c.model, ...(c.models ?? [])].filter(Boolean))]
})

function pickModel(m: string): void {
  ai.setModel(m === config.value?.model ? null : m)
}

async function pickPermission(mode: 'ask' | 'allow'): Promise<void> {
  menuMode.value = null
  if (mode === ai.permissionMode) return
  try {
    await ai.setPermissionMode(mode)
    toast.success(mode === 'ask' ? '已切换为：请求权限' : '已切换为：全部允许')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '权限切换失败')
  }
}

/** 手动压缩上下文（保留最近 2 个用户轮，更早历史折叠为摘要）。 */
async function onCompress(): Promise<void> {
  const done = await ai.compressContext()
  if (done) toast.success('上下文已压缩：更早历史已折叠为摘要')
}

/* ------------------------------- 输入行为 ------------------------------- */

function autosize(): void {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`
}

/** 输入时检测内联触发词（@引用 / /指令）。 */
function detectTrigger(): void {
  const el = inputEl.value
  const caret = el?.selectionStart ?? text.value.length
  const before = text.value.slice(0, caret)
  const at = before.match(/(?:^|\s)@([^\s@]*)$/)
  if (at) {
    menuMode.value = 'mention'
    mentionFilter.value = at[1]
    return
  }
  const slash = before.match(/^\/(\S*)$/)
  if (slash) {
    menuMode.value = 'slash'
    slashFilter.value = slash[1]
    return
  }
  if (menuMode.value === 'mention' || menuMode.value === 'slash') menuMode.value = null
}

function onInput(): void {
  autosize()
  detectTrigger()
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (menuMode.value === 'mention' && filteredMentionables.value.length) {
      pickMentionInline(filteredMentionables.value[0])
      return
    }
    if (menuMode.value === 'slash' && filteredCommands.value.length) {
      applySlash(filteredCommands.value[0])
      return
    }
    void submit()
    return
  }
  if (e.key === 'Escape') menuMode.value = null
}

async function submit(): Promise<void> {
  const input = text.value.trim()
  if (!input || running.value) return
  const ms = [...mentions.value]
  text.value = ''
  mentions.value = []
  menuMode.value = null
  void nextTick(autosize)
  await ai.send(input, ms)
}

async function onContinue(): Promise<void> {
  if (running.value || !ai.canContinueTask) return
  await ai.continueTask()
}

function onDismissContinue(): void {
  ai.dismissContinueTask()
}

watch(text, () => void nextTick(autosize))
watch(
  () => ai.drawerOpen,
  (open) => {
    if (open) void nextTick(() => inputEl.value?.focus())
  },
)
</script>

<template>
  <div class="bar" data-testid="ai-inputbar">
    <div v-if="ai.canContinueTask" class="bar__continue" data-testid="ai-continue-wrap">
      <button type="button" class="bar__continue-btn" data-testid="ai-continue" @click="onContinue">
        继续任务
      </button>
      <span class="bar__continue-hint">计划尚未全部完成，可从检查点续跑</span>
      <button
        type="button"
        class="bar__continue-dismiss"
        title="关闭，不再提示继续"
        aria-label="关闭继续任务"
        data-testid="ai-continue-dismiss"
        @click="onDismissContinue"
      >
        ×
      </button>
    </div>
    <!-- 抽屉是 --is-z-modal(1300)，菜单要提到 --is-z-dropdown(1350) 否则被抽屉盖住点不中 -->
    <IPopover :open="menuMode !== null" placement="top-start" :arrow="false" z-index="var(--is-z-dropdown)" @update:open="menuMode = $event ? menuMode : null">
      <template #anchor>
        <div class="bar__box" :class="{ 'bar__box--menu': menuMode !== null }">
          <div v-if="mentions.length" class="bar__mentions">
            <span v-for="(m, i) in mentions" :key="i" class="bar__chip">
              <IIcon :name="iconForMention(m)" :size="11" />
              {{ mentionLabel(m) }}
              <button type="button" aria-label="移除引用" @click="removeMention(i)">×</button>
            </span>
          </div>
          <textarea
            ref="inputEl"
            v-model="text"
            class="bar__input"
            rows="1"
            :placeholder="running ? '生成中，可继续输入或点击中止…' : config?.configured ? '问 AI 助手，@ 添加上下文，/ 使用命令' : '请先在右上角设置里配置 API Key'"
            data-testid="ai-input"
            @input="onInput"
            @keydown="onKeydown"
          />
          <div class="bar__toolbar">
            <button
              type="button"
              class="bar__tbtn"
              :class="{ 'bar__tbtn--on': menuMode === 'plus' }"
              title="添加上下文与指令"
              aria-label="添加上下文与指令"
              data-testid="ai-plus"
              @click="menuMode = menuMode === 'plus' ? null : 'plus'"
            >
              <IIcon name="plus" :size="15" />
            </button>
            <button
              type="button"
              class="bar__perm"
              :class="{ 'bar__perm--on': menuMode === 'permissions' }"
              title="操作权限"
              aria-label="操作权限"
              data-testid="ai-permission"
              @click="menuMode = menuMode === 'permissions' ? null : 'permissions'"
            >
              <IIcon :name="permissionOption.icon" :size="13" class="bar__perm-icon" />
              <span class="bar__perm-name is-ellipsis">{{ permissionOption.label }}</span>
              <IIcon name="chevron-down" :size="12" />
            </button>
            <span class="bar__spacer" />
            <button
              type="button"
              class="bar__model"
              :class="{ 'bar__model--on': menuMode === 'models' }"
              title="切换模型"
              aria-label="切换模型"
              data-testid="ai-model"
              @click="menuMode = menuMode === 'models' ? null : 'models'"
            >
              <span class="bar__dot" :class="config?.configured ? 'bar__dot--on' : ''" />
              <span class="bar__model-name is-ellipsis">{{ ai.effectiveModel || '未配置' }}</span>
              <IIcon name="chevron-down" :size="12" />
            </button>
            <span
              class="bar__ctx"
              data-testid="ai-ctx"
              :title="`模型可见上下文约 ${ai.contextTokens} tokens；达到上限 80% 时自动压缩，也可手动压缩`"
            >
              上下文 {{ formatTokens(ai.contextTokens) }}/{{ formatTokens(CONTEXT_TOKEN_LIMIT) }}
            </span>
            <button
              type="button"
              class="bar__compress"
              :disabled="!ai.compressible || running"
              title="压缩上下文：保留最近 2 轮对话，更早历史折叠为摘要"
              aria-label="压缩上下文"
              data-testid="ai-compress"
              @click="onCompress"
            >
              压缩
            </button>
            <button v-if="running" type="button" class="bar__send" title="中止" aria-label="中止" data-testid="ai-stop" @click="ai.stop()">
              <span class="bar__stop" />
            </button>
            <button v-else type="button" class="bar__send" title="发送" aria-label="发送" :disabled="!canSend" data-testid="ai-send" @click="submit">
              <IIcon name="arrow-up" :size="15" />
            </button>
          </div>
        </div>
      </template>

      <template #default>
        <!-- +：引用 + 指令两组 -->
        <div v-if="menuMode === 'plus'" class="bar__menu" role="menu">
          <div class="bar__menu-title">引用上下文</div>
          <button v-if="!mentionables.length" type="button" class="bar__menu-item" disabled>无可引用项（先打开一个分析）</button>
          <button v-for="it in mentionables" :key="it.key" type="button" class="bar__menu-item" role="menuitem" @click="pickMentionFromMenu(it)">
            <IIcon :name="it.icon" :size="12" class="bar__menu-icon" />{{ it.label }}
          </button>
          <div class="bar__menu-title">快捷指令</div>
          <button v-for="c in SLASH_COMMANDS" :key="c.key" type="button" class="bar__menu-item" role="menuitem" @click="applySlash(c)">
            <span class="bar__menu-slash">/</span>{{ c.key }}
          </button>
        </div>
        <!-- 内联 @：过滤后的引用 -->
        <div v-else-if="menuMode === 'mention'" class="bar__menu" role="menu">
          <button v-if="!filteredMentionables.length" type="button" class="bar__menu-item" disabled>无匹配项</button>
          <button v-for="it in filteredMentionables" :key="it.key" type="button" class="bar__menu-item" role="menuitem" @click="pickMentionInline(it)">
            <IIcon :name="it.icon" :size="12" class="bar__menu-icon" />{{ it.label }}
          </button>
        </div>
        <!-- 内联 /：过滤后的指令 -->
        <div v-else-if="menuMode === 'slash'" class="bar__menu" role="menu">
          <button v-if="!filteredCommands.length" type="button" class="bar__menu-item" disabled>无匹配指令</button>
          <button v-for="c in filteredCommands" :key="c.key" type="button" class="bar__menu-item" role="menuitem" @click="applySlash(c)">
            <span class="bar__menu-slash">/</span>{{ c.key }}
          </button>
        </div>
        <!-- 操作权限 -->
        <div v-else-if="menuMode === 'permissions'" class="bar__menu bar__menu--perm" role="menu" data-testid="ai-permission-menu">
          <button
            v-for="opt in PERMISSION_OPTIONS"
            :key="opt.mode"
            type="button"
            class="bar__menu-item bar__menu-item--perm"
            role="menuitem"
            :data-testid="`ai-permission-${opt.mode}`"
            @click="pickPermission(opt.mode)"
          >
            <IIcon :name="opt.icon" :size="16" class="bar__menu-perm-icon" />
            <span class="bar__menu-perm-text">
              <span class="bar__menu-perm-title">{{ opt.label }}</span>
              <span class="bar__menu-perm-desc">{{ opt.desc }}</span>
            </span>
            <IIcon v-if="opt.mode === ai.permissionMode" name="check" :size="14" class="bar__menu-check" />
          </button>
        </div>
        <!-- 模型列表 -->
        <div v-else-if="menuMode === 'models'" class="bar__menu" role="menu">
          <div class="bar__menu-title">选择模型</div>
          <button v-if="!modelOptions.length" type="button" class="bar__menu-item" disabled>未配置模型（去设置）</button>
          <button v-for="m in modelOptions" :key="m" type="button" class="bar__menu-item" role="menuitem" @click="pickModel(m); menuMode = null">
            <IIcon v-if="m === ai.effectiveModel" name="check" :size="12" class="bar__menu-check" />
            <span v-else class="bar__menu-check-space" />
            {{ m }}
            <span v-if="m === config?.model" class="bar__menu-tag">默认</span>
          </button>
        </div>
      </template>
    </IPopover>
  </div>
</template>

<style scoped>
.bar {
  border-top: 1px solid var(--is-border);
  padding: 10px 12px 12px;
  background: var(--is-bg);
}
.bar__continue {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.bar__continue-btn {
  padding: 5px 12px;
  border: 1px solid var(--is-accent);
  border-radius: var(--is-radius-sm);
  background: var(--is-accent-soft);
  color: var(--is-accent);
  font-size: var(--is-text-sm);
  cursor: pointer;
  flex-shrink: 0;
}
.bar__continue-btn:hover {
  background: var(--is-accent);
  color: var(--is-surface);
}
.bar__continue-hint {
  font-size: 11px;
  color: var(--is-text-tertiary);
  flex: 1;
  min-width: 0;
}
.bar__continue-dismiss {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text-tertiary);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}
.bar__continue-dismiss:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
/* IPopover 根节点默认 inline-block（按钮锚点用），输入条场景要撑满整行 */
.bar :deep(.is-popover),
.bar :deep(.is-popover__anchor) {
  display: block;
  width: 100%;
}

/* 统一盒子：输入区 + 工具行一体 */
.bar__box {
  border: 1px solid var(--is-border-strong);
  border-radius: 12px;
  background: var(--is-surface);
  padding: 8px 8px 6px;
  transition:
    border-color var(--is-dur) var(--is-ease),
    box-shadow var(--is-dur) var(--is-ease);
}
.bar__box:focus-within {
  border-color: var(--is-accent);
  box-shadow: var(--is-ring-sm);
}
.bar__box--menu {
  border-color: var(--is-accent);
}

.bar__mentions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 2px 6px;
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
  line-height: 1;
}

.bar__input {
  display: block;
  width: 100%;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  padding: 2px 6px;
  font-size: var(--is-text-sm);
  font-family: inherit;
  line-height: 1.6;
  max-height: 140px;
  overflow-y: auto;
}
.bar__input::placeholder {
  color: var(--is-text-tertiary);
}

/* 工具行 */
.bar__toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.bar__tbtn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text-secondary);
  cursor: pointer;
}
.bar__tbtn:hover,
.bar__tbtn--on {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.bar__perm {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 140px;
  padding: 3px 8px;
  border: none;
  border-radius: var(--is-radius-full);
  background: transparent;
  color: var(--is-text-secondary);
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
}
.bar__perm:hover,
.bar__perm--on {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.bar__perm-icon {
  color: var(--is-warning, #b45309);
  flex-shrink: 0;
}
.bar__perm-name {
  min-width: 0;
}
.bar__model {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 200px;
  padding: 3px 8px;
  border: none;
  border-radius: var(--is-radius-full);
  background: transparent;
  color: var(--is-text-secondary);
  font-size: 11px;
  cursor: pointer;
}
.bar__model:hover,
.bar__model--on {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.bar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--is-border-strong);
  flex-shrink: 0;
}
.bar__dot--on {
  background: var(--is-success);
}
.bar__model-name {
  min-width: 0;
}
.bar__spacer {
  flex: 1;
}
.bar__ctx {
  font-size: 11px;
  color: var(--is-text-tertiary);
  white-space: nowrap;
  cursor: default;
  flex-shrink: 0;
}
.bar__compress {
  padding: 3px 8px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-full);
  background: transparent;
  color: var(--is-text-secondary);
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
}
.bar__compress:hover:not(:disabled) {
  border-color: var(--is-accent);
  color: var(--is-accent);
}
.bar__compress:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 发送 / 中止：深色方块 */
.bar__send {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: var(--is-text);
  color: var(--is-surface);
  cursor: pointer;
  flex-shrink: 0;
}
.bar__send:hover:not(:disabled) {
  opacity: 0.85;
}
.bar__send:disabled {
  background: var(--is-border-strong);
  cursor: not-allowed;
}
.bar__stop {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: currentColor;
}

/* 弹出菜单 */
.bar__menu {
  display: flex;
  flex-direction: column;
  padding: 4px;
  max-height: 260px;
  overflow-y: auto;
  min-width: 220px;
}
.bar__menu-title {
  padding: 6px 10px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--is-text-tertiary);
  letter-spacing: 0.04em;
}
.bar__menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
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
.bar__menu-icon {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.bar__menu-slash {
  color: var(--is-accent);
  font-weight: 600;
}
.bar__menu-check {
  color: var(--is-accent);
  flex-shrink: 0;
}
.bar__menu-check-space {
  width: 12px;
  flex-shrink: 0;
}
.bar__menu-tag {
  margin-left: auto;
  font-size: 10px;
  color: var(--is-text-tertiary);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-full);
  padding: 0 6px;
}
.bar__menu--perm {
  min-width: 240px;
  padding: 6px;
}
.bar__menu-item--perm {
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
}
.bar__menu-perm-icon {
  margin-top: 1px;
  color: var(--is-text-secondary);
  flex-shrink: 0;
}
.bar__menu-perm-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
  text-align: left;
}
.bar__menu-perm-title {
  font-size: var(--is-text-sm);
  font-weight: 600;
  color: var(--is-text);
}
.bar__menu-perm-desc {
  font-size: 11px;
  color: var(--is-text-tertiary);
  line-height: 1.4;
}
</style>
