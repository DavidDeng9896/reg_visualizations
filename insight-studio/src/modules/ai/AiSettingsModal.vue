<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { IButton, IModal, ISlider, ITabs, ITextField, IToggle, toast, type TabItem } from '../../ui'
import { aiConfigApi } from './client'
import CapabilitiesPanel from './CapabilitiesPanel.vue'

/** AI 设置：模型 | Skills | MCP | 记忆。 */
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
const confirmDestructive = ref(true)
const saving = ref(false)

async function loadConfig(): Promise<void> {
  try {
    const cfg = await aiConfigApi.get()
    baseUrl.value = cfg.baseUrl
    keyMasked.value = cfg.apiKeyMasked
    model.value = cfg.model
    modelsText.value = (cfg.models ?? []).join(', ')
    maxIterations.value = cfg.maxIterations
    confirmDestructive.value = cfg.confirmDestructive
  } catch {
    /* 后端不可达时保持默认 */
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

async function save(): Promise<void> {
  saving.value = true
  try {
    const patch: {
      baseUrl: string
      model: string
      models: string[]
      maxIterations: number
      confirmDestructive: boolean
      apiKey?: string
    } = {
      baseUrl: baseUrl.value.trim(),
      model: model.value.trim(),
      models: modelsText.value
        .split(/[,，]/)
        .map((m) => m.trim())
        .filter(Boolean),
      maxIterations: Number(maxIterations.value) || 100,
      confirmDestructive: !!confirmDestructive.value,
    }
    const key = typeof apiKey.value === 'string' ? apiKey.value.trim() : ''
    if (key) patch.apiKey = key
    await aiConfigApi.put(patch)
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
          <ITextField v-model="model" placeholder="如 gpt-4o-mini / qwen-max" />
        </label>
        <label class="cfg__row">
          <span class="cfg__label">备选模型（逗号分隔，输入条可切换）</span>
          <ITextField v-model="modelsText" placeholder="如 qwen3.8-max, qwen-max-latest" />
        </label>
        <div class="cfg__row">
          <span class="cfg__label">最大工具调用轮数（{{ maxIterations }}）</span>
          <ISlider v-model="maxIterations" :min="1" :max="100" :step="1" aria-label="最大轮数" />
        </div>
        <div class="cfg__row cfg__row--switch">
          <span class="cfg__label">删除类操作需要用户确认</span>
          <IToggle v-model="confirmDestructive" aria-label="删除需确认" />
        </div>
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
.cfg__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cfg__row--switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.cfg__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
</style>
