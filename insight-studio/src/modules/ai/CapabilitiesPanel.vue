<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IButton, IModal, ITabs, ITextField, IToggle, toast, type TabItem } from '../../ui'
import {
  aiMcpApi,
  aiSkillsApi,
  type McpHeaderKV,
  type McpServerView,
  type SkillDetail,
  type SkillInfo,
} from './client'

/** 侧栏「能力」面板：Skills | MCP 管理（全局本机）。 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const tabs: TabItem[] = [
  { key: 'skills', label: 'Skills' },
  { key: 'mcp', label: 'MCP' },
]
const tab = ref('skills')

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
const savingMcp = ref(false)
const refreshingId = ref<string | null>(null)

const title = computed(() => '能力')

async function loadSkills(): Promise<void> {
  loadingSkills.value = true
  try {
    skills.value = await aiSkillsApi.list()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '加载 Skills 失败')
    skills.value = []
  } finally {
    loadingSkills.value = false
  }
}

async function loadMcp(): Promise<void> {
  loadingMcp.value = true
  try {
    servers.value = await aiMcpApi.listServers()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '加载 MCP 失败')
    servers.value = []
  } finally {
    loadingMcp.value = false
  }
}

watch(
  () => props.open,
  (v) => {
    if (!v) return
    void loadSkills()
    void loadMcp()
    preview.value = null
  },
)

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
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '预览失败')
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
    const info = await aiSkillsApi.importZip(file)
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

async function addServer(): Promise<void> {
  const name = formName.value.trim()
  const url = formUrl.value.trim()
  if (!name || !url) {
    toast.error('请填写名称与 URL')
    return
  }
  const headers = formHeaders.value.filter((h) => h.key.trim())
  savingMcp.value = true
  try {
    await aiMcpApi.create({ name, url, headers })
    formName.value = ''
    formUrl.value = ''
    formHeaders.value = [{ key: '', value: '' }]
    toast.success('已添加 MCP')
    await loadMcp()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '添加失败')
  } finally {
    savingMcp.value = false
  }
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
</script>

<template>
  <IModal :open="props.open" :title="title" :width="440" @update:open="emit('update:open', $event)">
    <div class="cap">
      <ITabs v-model="tab" :tabs="tabs" />

      <div v-if="tab === 'skills'" class="cap__pane">
        <div class="cap__toolbar">
          <IButton size="sm" :loading="importing" @click="pickZip">导入 zip</IButton>
          <input
            ref="fileInput"
            type="file"
            accept=".zip,application/zip"
            class="cap__file"
            @change="onZipPicked"
          />
          <span class="cap__hint">仅 skill.json + SKILL.md</span>
        </div>
        <p v-if="loadingSkills" class="cap__empty">加载中…</p>
        <p v-else-if="!skills.length" class="cap__empty">暂无 Skill。可导入 zip 或等待官方示例 seed。</p>
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
              :label="`启用 ${s.name}`"
              @update:model-value="toggleSkill(s, $event)"
            />
          </li>
        </ul>

        <div v-if="preview" class="cap__preview">
          <div class="cap__preview-head">
            <strong>{{ preview.name }}</strong>
            <button type="button" class="cap__link" @click="preview = null">关闭</button>
          </div>
          <pre class="cap__preview-body">{{ preview.body }}</pre>
        </div>
      </div>

      <div v-else class="cap__pane">
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
            <div v-for="(h, i) in formHeaders" :key="i" class="cap__hdr">
              <ITextField v-model="h.key" placeholder="Key" />
              <ITextField v-model="h.value" placeholder="Value" type="password" />
              <button type="button" class="cap__link" @click="removeHeaderRow(i)">−</button>
            </div>
            <button type="button" class="cap__link" @click="addHeaderRow">+ 添加 Header</button>
          </div>
          <IButton variant="primary" size="sm" :loading="savingMcp" @click="addServer">添加连接</IButton>
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
              :label="`启用 ${s.name}`"
              @update:model-value="toggleServer(s, $event)"
            />
          </li>
        </ul>
      </div>
    </div>
  </IModal>
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
