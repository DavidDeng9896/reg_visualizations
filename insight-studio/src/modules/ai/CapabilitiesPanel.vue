<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IButton, IModal, ITabs, ITextField, IToggle, toast, type TabItem } from '../../ui'
import {
  aiMcpApi,
  aiMemoriesApi,
  aiSkillsApi,
  type AiMemory,
  type McpHeaderKV,
  type McpServerView,
  type SkillDetail,
  type SkillInfo,
} from './client'
import { useCurrentUser } from '../shell/currentUser'

/** 侧栏「能力」面板 / AI 设置嵌入：Skills | MCP | 记忆（按当前模拟用户隔离）。 */
const props = withDefaults(
  defineProps<{
    open?: boolean
    /** 嵌入设置 Modal 时不包 IModal */
    embedded?: boolean
    /** 嵌入时是否处于可见（用于加载） */
    active?: boolean
    /** 嵌入时由外层 Tab 控制：skills | mcp | memory */
    initialTab?: string
  }>(),
  { open: false, embedded: false, active: false, initialTab: 'skills' },
)
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const { currentId: currentUserId } = useCurrentUser()

const tabs: TabItem[] = [
  { key: 'skills', label: 'Skills' },
  { key: 'mcp', label: 'MCP' },
  { key: 'memory', label: '记忆' },
]
const tab = ref('skills')

watch(
  () => props.initialTab,
  (v) => {
    if (props.embedded && (v === 'skills' || v === 'mcp' || v === 'memory')) tab.value = v
  },
  { immediate: true },
)

const skills = ref<SkillInfo[]>([])
const loadingSkills = ref(false)
const preview = ref<SkillDetail | null>(null)
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const servers = ref<McpServerView[]>([])
const loadingMcp = ref(false)
const formName = ref('')
const formUrl = ref('')
const formHeaders = ref<McpHeaderKV[]>([{ key: '', value: '' }])
const editingMcpId = ref<string | null>(null)
const savingMcp = ref(false)
const refreshingId = ref<string | null>(null)
const skillDraft = ref('')
const savingSkill = ref(false)

const memories = ref<AiMemory[]>([])
const loadingMemories = ref(false)
const memoryDraft = ref('')
const savingMemory = ref(false)

const title = computed(() => '能力')

async function loadSkills(): Promise<string | null> {
  loadingSkills.value = true
  try {
    skills.value = await aiSkillsApi.list()
    return null
  } catch (e) {
    skills.value = []
    return e instanceof Error ? e.message : '加载 Skills 失败'
  } finally {
    loadingSkills.value = false
  }
}

async function loadMcp(): Promise<string | null> {
  loadingMcp.value = true
  try {
    servers.value = await aiMcpApi.listServers()
    return null
  } catch (e) {
    servers.value = []
    return e instanceof Error ? e.message : '加载 MCP 失败'
  } finally {
    loadingMcp.value = false
  }
}

async function loadMemories(): Promise<string | null> {
  loadingMemories.value = true
  try {
    memories.value = await aiMemoriesApi.list()
    return null
  } catch (e) {
    memories.value = []
    return e instanceof Error ? e.message : '加载记忆失败'
  } finally {
    loadingMemories.value = false
  }
}

async function reloadAll(): Promise<void> {
  preview.value = null
  const errs = (await Promise.all([loadSkills(), loadMcp(), loadMemories()])).filter(Boolean) as string[]
  if (!errs.length) return
  // 三个接口同时 404（常见于误启 Node legacy API）时只弹一条，避免刷屏
  const uniq = [...new Set(errs)]
  if (uniq.length === 1 && errs.length > 1) {
    toast.error(`${uniq[0]}（Skills/MCP/记忆均失败；请确认已启动 insight-api-go :8787）`)
  } else {
    for (const msg of uniq) toast.error(msg)
  }
}

watch(
  () => props.open,
  (v) => {
    if (props.embedded || !v) return
    reloadAll()
  },
)

watch(
  () => [props.embedded, props.active] as const,
  ([embedded, active]) => {
    if (embedded && active) reloadAll()
  },
  { immediate: true },
)

watch(currentUserId, () => {
  if (props.embedded) {
    if (!props.active) return
  } else if (!props.open) {
    return
  }
  reloadAll()
})

async function toggleSkill(s: SkillInfo, enabled: boolean): Promise<void> {
  try {
    const updated = await aiSkillsApi.setEnabled(s.id, enabled)
    const i = skills.value.findIndex((x) => x.id === s.id)
    if (i >= 0) skills.value[i] = { ...skills.value[i], ...updated }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '更新失败')
  }
}

async function removeSkill(s: SkillInfo): Promise<void> {
  if (s.source === 'official') {
    toast.error('官方 Skill 不可删除')
    return
  }
  try {
    await aiSkillsApi.remove(s.id)
    skills.value = skills.value.filter((x) => x.id !== s.id)
    if (preview.value?.id === s.id) preview.value = null
    toast.success('已删除')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}

async function openPreview(s: SkillInfo): Promise<void> {
  try {
    preview.value = await aiSkillsApi.get(s.id)
    skillDraft.value = preview.value.body
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '加载失败')
  }
}

async function saveSkillBody(): Promise<void> {
  if (!preview.value || preview.value.source === 'official') return
  savingSkill.value = true
  try {
    const d = await aiSkillsApi.updateBody(preview.value.id, skillDraft.value)
    preview.value = d
    skillDraft.value = d.body
    toast.success('已保存 Skill')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    savingSkill.value = false
  }
}

function startEditMcp(s: McpServerView): void {
  editingMcpId.value = s.id
  formName.value = s.name
  formUrl.value = s.url
  formHeaders.value = s.headerKeys.length
    ? s.headerKeys.map((key) => ({ key, value: '' }))
    : [{ key: '', value: '' }]
}

function cancelEditMcp(): void {
  editingMcpId.value = null
  formName.value = ''
  formUrl.value = ''
  formHeaders.value = [{ key: '', value: '' }]
}

async function saveMcp(): Promise<void> {
  const name = formName.value.trim()
  const url = formUrl.value.trim()
  if (!name || !url) {
    toast.error('请填写名称与 URL')
    return
  }
  const headers = formHeaders.value.filter((h) => h.key.trim())
  savingMcp.value = true
  try {
    if (editingMcpId.value) {
      const id = editingMcpId.value
      const patch: { name: string; url: string; headers?: McpHeaderKV[] } = { name, url }
      if (headers.some((h) => h.value.trim())) patch.headers = headers
      await aiMcpApi.patch(id, patch)
      toast.success('已更新 MCP')
      cancelEditMcp()
      await loadMcp()
      try {
        await aiMcpApi.refresh(id)
        await loadMcp()
      } catch {
        /* refresh optional */
      }
    } else {
      await aiMcpApi.create({ name, url, headers })
      formName.value = ''
      formUrl.value = ''
      formHeaders.value = [{ key: '', value: '' }]
      toast.success('已添加 MCP')
      await loadMcp()
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    savingMcp.value = false
  }
}

function pickZip(): void {
  fileInput.value?.click()
}

async function onZipPicked(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importing.value = true
  try {
    const info = await aiSkillsApi.importFile(file)
    toast.success(`已导入 ${info.name}`)
    await loadSkills()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '导入失败')
  } finally {
    importing.value = false
  }
}

function addHeaderRow(): void {
  formHeaders.value.push({ key: '', value: '' })
}

function removeHeaderRow(i: number): void {
  formHeaders.value.splice(i, 1)
  if (!formHeaders.value.length) formHeaders.value.push({ key: '', value: '' })
}

async function toggleServer(s: McpServerView, enabled: boolean): Promise<void> {
  try {
    const updated = await aiMcpApi.patch(s.id, { enabled })
    const i = servers.value.findIndex((x) => x.id === s.id)
    if (i >= 0) servers.value[i] = updated
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '更新失败')
  }
}

async function refreshServer(s: McpServerView): Promise<void> {
  refreshingId.value = s.id
  try {
    const updated = await aiMcpApi.refresh(s.id)
    const i = servers.value.findIndex((x) => x.id === s.id)
    if (i >= 0) servers.value[i] = updated
    toast.success(`已刷新 · ${updated.toolCount} 个工具`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '刷新失败')
    await loadMcp()
  } finally {
    refreshingId.value = null
  }
}

async function removeServer(s: McpServerView): Promise<void> {
  try {
    await aiMcpApi.remove(s.id)
    servers.value = servers.value.filter((x) => x.id !== s.id)
    toast.success('已删除')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}

async function addMemory(): Promise<void> {
  const content = memoryDraft.value.trim()
  if (!content) {
    toast.error('请填写记忆内容')
    return
  }
  savingMemory.value = true
  try {
    const rec = await aiMemoriesApi.create(content)
    memories.value = [rec, ...memories.value]
    memoryDraft.value = ''
    toast.success('已添加记忆')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '添加失败')
  } finally {
    savingMemory.value = false
  }
}

async function removeMemory(m: AiMemory): Promise<void> {
  try {
    await aiMemoriesApi.remove(m.id)
    memories.value = memories.value.filter((x) => x.id !== m.id)
    toast.success('已删除')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<template>
  <IModal
    v-if="!embedded"
    :open="!!props.open"
    :title="title"
    :width="440"
    @update:open="emit('update:open', $event)"
  >
    <div class="cap">
      <ITabs v-model="tab" :tabs="tabs" />

      <div v-if="tab === 'skills'" class="cap__pane">
        <div class="cap__toolbar">
          <IButton size="sm" :loading="importing" @click="pickZip">导入</IButton>
          <input
            ref="fileInput"
            type="file"
            accept=".zip,.md,.markdown,application/zip,text/markdown"
            class="cap__file"
            @change="onZipPicked"
          />
          <span class="cap__hint">支持 .zip（skill.json + SKILL.md）或单个 .md</span>
        </div>
        <p v-if="loadingSkills" class="cap__empty">加载中…</p>
        <p v-else-if="!skills.length" class="cap__empty">暂无 Skill。可导入 .zip / .md，或等待官方示例 seed。</p>
        <ul v-else class="cap__list">
          <li v-for="s in skills" :key="s.id" class="cap__item">
            <div class="cap__item-main">
              <div class="cap__item-title">
                <strong>{{ s.name }}</strong>
                <span class="cap__meta">{{ s.version }} · {{ s.source }}</span>
              </div>
              <p class="cap__desc">{{ s.description || '—' }}</p>
              <div class="cap__actions">
                <button type="button" class="cap__link" @click="openPreview(s)">预览</button>
                <button
                  v-if="s.source !== 'official'"
                  type="button"
                  class="cap__link cap__link--danger"
                  @click="removeSkill(s)"
                >
                  删除
                </button>
              </div>
            </div>
            <IToggle
              :model-value="s.enabled"
              label="启用"
              @update:model-value="toggleSkill(s, $event)"
            />
          </li>
        </ul>
        <div v-if="preview" class="cap__preview">
          <div class="cap__preview-head">
            <strong>{{ preview.name }}</strong>
            <button type="button" class="cap__link" @click="preview = null">关闭</button>
          </div>
          <textarea
            v-if="preview.source !== 'official'"
            v-model="skillDraft"
            class="cap__preview-edit"
            rows="12"
            aria-label="编辑 SKILL.md"
          />
          <pre v-else class="cap__preview-body">{{ preview.body }}</pre>
          <div v-if="preview.source !== 'official'" class="cap__preview-actions">
            <IButton size="sm" variant="primary" :loading="savingSkill" @click="saveSkillBody">保存</IButton>
          </div>
        </div>
      </div>

      <div v-else-if="tab === 'mcp'" class="cap__pane">
        <div class="cap__form">
          <label class="cap__field">
            <span>名称</span>
            <ITextField v-model="formName" placeholder="如 Internal Docs MCP" />
          </label>
          <label class="cap__field">
            <span>URL（SSE / HTTP）</span>
            <ITextField v-model="formUrl" placeholder="https://…" />
          </label>
          <div class="cap__field">
            <span>Headers</span>
            <p v-if="editingMcpId" class="cap__hint">编辑时留空 Value 表示保留原 Header；填写 Value 则整体覆盖。</p>
            <div v-for="(h, i) in formHeaders" :key="i" class="cap__hdr">
              <ITextField v-model="h.key" placeholder="Key" />
              <ITextField v-model="h.value" :placeholder="editingMcpId ? '留空则保留' : 'Value'" type="password" />
              <button type="button" class="cap__link" @click="removeHeaderRow(i)">−</button>
            </div>
            <button type="button" class="cap__link" @click="addHeaderRow">+ 添加 Header</button>
          </div>
          <div class="cap__form-actions">
            <IButton v-if="editingMcpId" size="sm" @click="cancelEditMcp">取消</IButton>
            <IButton variant="primary" size="sm" :loading="savingMcp" @click="saveMcp">
              {{ editingMcpId ? '保存修改' : '添加连接' }}
            </IButton>
          </div>
        </div>
        <p v-if="loadingMcp" class="cap__empty">加载中…</p>
        <p v-else-if="!servers.length" class="cap__empty">暂无 MCP 连接。</p>
        <ul v-else class="cap__list">
          <li v-for="s in servers" :key="s.id" class="cap__item">
            <div class="cap__item-main">
              <div class="cap__item-title">
                <strong>{{ s.name }}</strong>
                <span class="cap__meta">{{ s.toolCount }} tools</span>
              </div>
              <p class="cap__desc cap__desc--mono">{{ s.url }}</p>
              <p v-if="s.lastError" class="cap__err">{{ s.lastError }}</p>
              <div class="cap__actions">
                <button type="button" class="cap__link" @click="startEditMcp(s)">编辑</button>
                <button
                  type="button"
                  class="cap__link"
                  :disabled="refreshingId === s.id"
                  @click="refreshServer(s)"
                >
                  {{ refreshingId === s.id ? '刷新中…' : '刷新 tools' }}
                </button>
                <button type="button" class="cap__link cap__link--danger" @click="removeServer(s)">
                  删除
                </button>
              </div>
            </div>
            <IToggle
              :model-value="s.enabled"
              label="启用"
              @update:model-value="toggleServer(s, $event)"
            />
          </li>
        </ul>
      </div>

      <div v-else class="cap__pane" data-testid="ai-memories">
        <p class="cap__hint">记录纠正过的分析思路；下次对话会自动注入，避免重复旧做法。</p>
        <div class="cap__form">
          <label class="cap__field">
            <span>新记忆</span>
            <ITextField v-model="memoryDraft" placeholder="例如：类别对比先聚合再柱状图，勿直接散点" />
          </label>
          <IButton
            variant="primary"
            size="sm"
            :loading="savingMemory"
            data-testid="ai-memory-add"
            @click="addMemory"
          >
            添加
          </IButton>
        </div>
        <p v-if="loadingMemories" class="cap__empty">加载中…</p>
        <p v-else-if="!memories.length" class="cap__empty">暂无记忆。也可在对话中让 AI 调用 save_memory。</p>
        <ul v-else class="cap__list">
          <li v-for="m in memories" :key="m.id" class="cap__item">
            <div class="cap__item-main">
              <p class="cap__desc">{{ m.content }}</p>
              <div class="cap__actions">
                <button type="button" class="cap__link cap__link--danger" @click="removeMemory(m)">
                  删除
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>

    </div>
  </IModal>
  <div v-else class="cap">

      <div v-if="tab === 'skills'" class="cap__pane">
        <div class="cap__toolbar">
          <IButton size="sm" :loading="importing" @click="pickZip">导入</IButton>
          <input
            ref="fileInput"
            type="file"
            accept=".zip,.md,.markdown,application/zip,text/markdown"
            class="cap__file"
            @change="onZipPicked"
          />
          <span class="cap__hint">支持 .zip（skill.json + SKILL.md）或单个 .md</span>
        </div>
        <p v-if="loadingSkills" class="cap__empty">加载中…</p>
        <p v-else-if="!skills.length" class="cap__empty">暂无 Skill。可导入 .zip / .md，或等待官方示例 seed。</p>
        <ul v-else class="cap__list">
          <li v-for="s in skills" :key="s.id" class="cap__item">
            <div class="cap__item-main">
              <div class="cap__item-title">
                <strong>{{ s.name }}</strong>
                <span class="cap__meta">{{ s.version }} · {{ s.source }}</span>
              </div>
              <p class="cap__desc">{{ s.description || '—' }}</p>
              <div class="cap__actions">
                <button type="button" class="cap__link" @click="openPreview(s)">预览</button>
                <button
                  v-if="s.source !== 'official'"
                  type="button"
                  class="cap__link cap__link--danger"
                  @click="removeSkill(s)"
                >
                  删除
                </button>
              </div>
            </div>
            <IToggle
              :model-value="s.enabled"
              label="启用"
              @update:model-value="toggleSkill(s, $event)"
            />
          </li>
        </ul>
        <div v-if="preview" class="cap__preview">
          <div class="cap__preview-head">
            <strong>{{ preview.name }}</strong>
            <button type="button" class="cap__link" @click="preview = null">关闭</button>
          </div>
          <textarea
            v-if="preview.source !== 'official'"
            v-model="skillDraft"
            class="cap__preview-edit"
            rows="12"
            aria-label="编辑 SKILL.md"
          />
          <pre v-else class="cap__preview-body">{{ preview.body }}</pre>
          <div v-if="preview.source !== 'official'" class="cap__preview-actions">
            <IButton size="sm" variant="primary" :loading="savingSkill" @click="saveSkillBody">保存</IButton>
          </div>
        </div>
      </div>

      <div v-else-if="tab === 'mcp'" class="cap__pane">
        <div class="cap__form">
          <label class="cap__field">
            <span>名称</span>
            <ITextField v-model="formName" placeholder="如 Internal Docs MCP" />
          </label>
          <label class="cap__field">
            <span>URL（SSE / HTTP）</span>
            <ITextField v-model="formUrl" placeholder="https://…" />
          </label>
          <div class="cap__field">
            <span>Headers</span>
            <p v-if="editingMcpId" class="cap__hint">编辑时留空 Value 表示保留原 Header；填写 Value 则整体覆盖。</p>
            <div v-for="(h, i) in formHeaders" :key="i" class="cap__hdr">
              <ITextField v-model="h.key" placeholder="Key" />
              <ITextField v-model="h.value" :placeholder="editingMcpId ? '留空则保留' : 'Value'" type="password" />
              <button type="button" class="cap__link" @click="removeHeaderRow(i)">−</button>
            </div>
            <button type="button" class="cap__link" @click="addHeaderRow">+ 添加 Header</button>
          </div>
          <div class="cap__form-actions">
            <IButton v-if="editingMcpId" size="sm" @click="cancelEditMcp">取消</IButton>
            <IButton variant="primary" size="sm" :loading="savingMcp" @click="saveMcp">
              {{ editingMcpId ? '保存修改' : '添加连接' }}
            </IButton>
          </div>
        </div>
        <p v-if="loadingMcp" class="cap__empty">加载中…</p>
        <p v-else-if="!servers.length" class="cap__empty">暂无 MCP 连接。</p>
        <ul v-else class="cap__list">
          <li v-for="s in servers" :key="s.id" class="cap__item">
            <div class="cap__item-main">
              <div class="cap__item-title">
                <strong>{{ s.name }}</strong>
                <span class="cap__meta">{{ s.toolCount }} tools</span>
              </div>
              <p class="cap__desc cap__desc--mono">{{ s.url }}</p>
              <p v-if="s.lastError" class="cap__err">{{ s.lastError }}</p>
              <div class="cap__actions">
                <button type="button" class="cap__link" @click="startEditMcp(s)">编辑</button>
                <button
                  type="button"
                  class="cap__link"
                  :disabled="refreshingId === s.id"
                  @click="refreshServer(s)"
                >
                  {{ refreshingId === s.id ? '刷新中…' : '刷新 tools' }}
                </button>
                <button type="button" class="cap__link cap__link--danger" @click="removeServer(s)">
                  删除
                </button>
              </div>
            </div>
            <IToggle
              :model-value="s.enabled"
              label="启用"
              @update:model-value="toggleServer(s, $event)"
            />
          </li>
        </ul>
      </div>

      <div v-else class="cap__pane" data-testid="ai-memories">
        <p class="cap__hint">记录纠正过的分析思路；下次对话会自动注入，避免重复旧做法。</p>
        <div class="cap__form">
          <label class="cap__field">
            <span>新记忆</span>
            <ITextField v-model="memoryDraft" placeholder="例如：类别对比先聚合再柱状图，勿直接散点" />
          </label>
          <IButton
            variant="primary"
            size="sm"
            :loading="savingMemory"
            data-testid="ai-memory-add"
            @click="addMemory"
          >
            添加
          </IButton>
        </div>
        <p v-if="loadingMemories" class="cap__empty">加载中…</p>
        <p v-else-if="!memories.length" class="cap__empty">暂无记忆。也可在对话中让 AI 调用 save_memory。</p>
        <ul v-else class="cap__list">
          <li v-for="m in memories" :key="m.id" class="cap__item">
            <div class="cap__item-main">
              <p class="cap__desc">{{ m.content }}</p>
              <div class="cap__actions">
                <button type="button" class="cap__link cap__link--danger" @click="removeMemory(m)">
                  删除
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>

  </div>
</template>

<style scoped>
.cap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 280px;
}
.cap__pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cap__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cap__file {
  display: none;
}
.cap__hint,
.cap__empty,
.cap__meta,
.cap__desc {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.cap__desc {
  margin: 4px 0 0;
  color: var(--is-text-secondary);
  line-height: 1.4;
}
.cap__desc--mono {
  font-family: var(--is-font-mono, ui-monospace, monospace);
  word-break: break-all;
}
.cap__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow: auto;
}
.cap__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  background: var(--is-bg-elevated, var(--is-bg));
}
.cap__item-main {
  flex: 1;
  min-width: 0;
}
.cap__item-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}
.cap__actions {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}
.cap__link {
  border: none;
  background: none;
  padding: 0;
  font-size: var(--is-text-xs);
  color: var(--is-accent, #2563eb);
  cursor: pointer;
}
.cap__link:disabled {
  opacity: 0.5;
  cursor: default;
}
.cap__link--danger {
  color: var(--is-danger, #dc2626);
}
.cap__err {
  margin: 4px 0 0;
  font-size: var(--is-text-xs);
  color: var(--is-danger, #dc2626);
}
.cap__preview {
  border-top: 1px solid var(--is-border);
  padding-top: 10px;
}
.cap__preview-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cap__preview-edit {
  width: 100%;
  min-height: 220px;
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  background: var(--is-bg);
  color: var(--is-text);
  font-family: var(--is-font-mono, ui-monospace, monospace);
  font-size: var(--is-text-xs);
  line-height: 1.5;
  resize: vertical;
}
.cap__preview-actions,
.cap__form-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}
.cap__preview-body {
  margin: 0;
  max-height: 200px;
  overflow: auto;
  padding: 10px;
  border-radius: var(--is-radius-sm);
  background: var(--is-search-bg, #f4f4f5);
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.cap__form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--is-border);
}
.cap__form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cap__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.cap__hdr {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 6px;
  align-items: center;
  margin-bottom: 4px;
}
</style>
