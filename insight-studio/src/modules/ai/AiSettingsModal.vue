<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { IButton, IModal, ISelect, ISlider, ITabs, ITextField, toast, type TabItem } from '../../ui'
import { aiConfigApi } from './client'
import CapabilitiesPanel from './CapabilitiesPanel.vue'

/** AI 设置：模型 | Skills | MCP | 记忆。操作权限在对话输入条切换。 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()

const settingsTabs: TabItem[] = [
  { key: 'model', label: '模型' },
  { key: 'skills', label: 'Skills' },
  { key: 'mcp', label: 'MCP' },
  { key: 'memory', label: '记忆' },
]
const tab = ref('model')

const baseUrl = ref('')
const apiKey = ref('')
const keyMasked = ref('')
const model = ref('')
const modelsText = ref('')
const maxIterations = ref(100)
const saving = ref(false)
const probing = ref(false)
const capNote = ref('')

const modelOptions = computed(() => {
  const ids = modelsText.value
    .split(/[,，]/)
    .map((m) => m.trim())
    .filter(Boolean)
  const cur = model.value.trim()
  if (cur && !ids.includes(cur)) ids.unshift(cur)
  return ids.map((id) => ({ value: id, label: id }))
})

async function loadConfig(): Promise<void> {
  try {
    const cfg = await aiConfigApi.get()
    baseUrl.value = cfg.baseUrl
    keyMasked.value = cfg.apiKeyMasked
    model.value = cfg.model
    modelsText.value = (cfg.models ?? []).join(', ')
    maxIterations.value = cfg.maxIterations
  } catch {
    /* 后端不可达时保持默认 */
  }
  try {
    const cap = await aiConfigApi.capabilities()
    const bits = [
      cap.skills ? 'Skills 在线' : 'Skills 未启用',
      cap.memories ? '记忆 在线' : '记忆 未启用',
      cap.files ? '附件 在线' : '附件 未启用',
      cap.pythonWorker ? 'Python worker 在线' : 'Python worker 未启动',
      cap.sql ? 'SQL 代理 在线' : 'SQL 代理 未启动',
    ]
    capNote.value = `${bits.join(' · ')}${cap.note ? `。${cap.note}` : ''}`
  } catch {
    capNote.value = '无法读取后端能力（Skills / 记忆 / Python worker）。'
  }
}

onMounted(() => {
  void loadConfig()
})

watch(
  () => props.open,
  (v) => {
    if (v) {
      tab.value = 'model'
      void loadConfig()
    }
  },
)

async function probeModels(): Promise<void> {
  probing.value = true
  try {
    const patch: { baseUrl: string; model: string; apiKey?: string } = {
      baseUrl: baseUrl.value.trim(),
      model: model.value.trim(),
    }
    const key = typeof apiKey.value === 'string' ? apiKey.value.trim() : ''
    if (key) patch.apiKey = key
    const res = await aiConfigApi.probeModels(patch)
    if (res.error && !res.models.length) {
      toast.error(res.error)
      return
    }
    if (res.models.length) {
      modelsText.value = res.models.join(', ')
      if (!res.currentAvailable && res.recommended) {
        model.value = res.recommended
        toast.success(`已填入网关目录；当前 id 不在列表，已改为推荐 ${res.recommended}`)
      } else {
        toast.success(`探测到 ${res.models.length} 个模型`)
      }
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '探测失败')
  } finally {
    probing.value = false
  }
}

async function save(): Promise<void> {
  saving.value = true
  try {
    const patch: {
      baseUrl: string
      model: string
      models: string[]
      maxIterations: number
      apiKey?: string
    } = {
      baseUrl: baseUrl.value.trim(),
      model: model.value.trim(),
      models: modelsText.value
        .split(/[,，]/)
        .map((m) => m.trim())
        .filter(Boolean),
      maxIterations: Number(maxIterations.value) || 100,
    }
    const key = typeof apiKey.value === 'string' ? apiKey.value.trim() : ''
    if (key) patch.apiKey = key
    const saved = await aiConfigApi.put(patch)
    if (saved.models?.length) modelsText.value = saved.models.join(', ')
    if (saved.model) model.value = saved.model
    toast.success('AI 配置已保存')
    emit('saved')
    emit('update:open', false)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <IModal :open="props.open" title="AI 设置" :width="520" @update:open="emit('update:open', $event)">
    <div class="cfg">
      <ITabs v-model="tab" :tabs="settingsTabs" />

      <div v-if="tab === 'model'" class="cfg__model">
        <label class="cfg__row">
          <span class="cfg__label">Base URL</span>
          <ITextField v-model="baseUrl" placeholder="https://api.openai.com/v1 或兼容端点" />
        </label>
        <label class="cfg__row">
          <span class="cfg__label">API Key{{ keyMasked ? `（当前 ${keyMasked}）` : '' }}</span>
          <ITextField v-model="apiKey" type="password" :placeholder="keyMasked ? '留空保持不变' : 'sk-…'" />
        </label>
        <label class="cfg__row">
          <span class="cfg__label">Model</span>
          <ISelect
            v-if="modelOptions.length > 1"
            :model-value="model"
            :options="modelOptions"
            searchable
            placeholder="从网关目录选择"
            @update:model-value="model = String($event)"
          />
          <ITextField v-model="model" placeholder="如 gpt-4o-mini / qwen3.6-flash" />
        </label>
        <label class="cfg__row">
          <span class="cfg__label">备选模型（逗号分隔，输入条可切换）</span>
          <ITextField v-model="modelsText" placeholder="点击探测，或手动填写" />
        </label>
        <div class="cfg__actions">
          <IButton :loading="probing" @click="probeModels">探测网关模型</IButton>
        </div>
        <div class="cfg__row">
          <span class="cfg__label">最大工具调用轮数（{{ maxIterations }}）</span>
          <ISlider v-model="maxIterations" :min="1" :max="100" :step="1" aria-label="最大轮数" />
        </div>
        <p v-if="capNote" class="cfg__hint">{{ capNote }}</p>
        <p class="cfg__hint">兼容网关会自动关闭思考并限制 max_tokens。操作权限请在对话输入条左侧切换。</p>
      </div>

      <CapabilitiesPanel
        v-else
        embedded
        :active="props.open"
        :initial-tab="tab"
      />
    </div>
    <template v-if="tab === 'model'" #footer>
      <IButton @click="emit('update:open', false)">取消</IButton>
      <IButton variant="primary" :loading="saving" @click="save">保存</IButton>
    </template>
  </IModal>
</template>

<style scoped>
.cfg {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cfg__model {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cfg__hint {
  margin: 0;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  line-height: 1.5;
}
.cfg__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cfg__actions {
  display: flex;
  justify-content: flex-start;
}
.cfg__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
</style>
