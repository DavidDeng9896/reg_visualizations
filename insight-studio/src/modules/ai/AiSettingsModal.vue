<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { IButton, IModal, ISlider, ITextField, IToggle, toast } from '../../ui'
import { aiConfigApi } from './client'

/** AI 设置：Base URL / API Key / Model / 最大轮数 / 删除需确认。 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()

const baseUrl = ref('')
const apiKey = ref('')
const keyMasked = ref('')
const model = ref('')
const maxIterations = ref(8)
const confirmDestructive = ref(true)
const saving = ref(false)

onMounted(async () => {
  try {
    const cfg = await aiConfigApi.get()
    baseUrl.value = cfg.baseUrl
    keyMasked.value = cfg.apiKeyMasked
    model.value = cfg.model
    maxIterations.value = cfg.maxIterations
    confirmDestructive.value = cfg.confirmDestructive
  } catch {
    /* 后端不可达时保持默认 */
  }
})

async function save(): Promise<void> {
  saving.value = true
  try {
    const patch: {
      baseUrl: string
      model: string
      maxIterations: number
      confirmDestructive: boolean
      apiKey?: string
    } = {
      baseUrl: baseUrl.value.trim(),
      model: model.value.trim(),
      maxIterations: Number(maxIterations.value) || 8,
      confirmDestructive: !!confirmDestructive.value,
    }
    // 仅在用户输入了新 Key 时才提交；缺省 / 空串均不带该字段（后端保留原值）
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
  <IModal :open="props.open" title="AI 设置" :width="460" @update:open="emit('update:open', $event)">
    <div class="cfg">
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
      <div class="cfg__row">
        <span class="cfg__label">最大工具调用轮数（{{ maxIterations }}）</span>
        <ISlider v-model="maxIterations" :min="1" :max="20" :step="1" aria-label="最大轮数" />
      </div>
      <div class="cfg__row cfg__row--switch">
        <span class="cfg__label">删除类操作需要用户确认</span>
        <IToggle v-model="confirmDestructive" aria-label="删除需确认" />
      </div>
    </div>
    <template #footer>
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
