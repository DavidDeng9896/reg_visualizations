<script setup lang="ts">
import { computed, ref } from 'vue'
import { IIcon } from '../../ui'
import { useAiStore, type TraceItem } from './aiStore'

/**
 * ask_user 交互卡片（对齐参考交互）：
 * 待答态：「需要你的回答」+ 选项单选 + 其他回答 + 取消/提交；
 * 已答态：「已提交回答」+ 问答对（取消则显示「已取消提问」）。
 */
const props = defineProps<{ item: TraceItem }>()
const ai = useAiStore()

const selected = ref('')
const other = ref('')

const pending = computed(() => ai.pendingAsk?.id === props.item.id)
const answer = computed(() => {
  const s = props.item.summary ?? ''
  return s.startsWith('用户的回答：') ? s.slice('用户的回答：'.length) : ''
})
const cancelled = computed(() => answer.value.includes('取消了本次提问') || answer.value.includes('中止'))
const canSubmit = computed(() => !!selected.value || !!other.value.trim())

function choose(opt: string): void {
  selected.value = selected.value === opt ? '' : opt
  other.value = ''
}

function submit(): void {
  const v = other.value.trim() || selected.value
  if (!v) return
  ai.answerAsk(props.item.id, v)
}

function cancel(): void {
  ai.answerAsk(props.item.id, null)
}
</script>

<template>
  <div class="ask" data-testid="ai-ask">
    <!-- 待答态 -->
    <template v-if="pending">
      <div class="ask__head">
        <IIcon name="sparkle" :size="12" class="ask__icon" />
        <span>需要你的回答</span>
        <IIcon name="spinner" :size="12" class="ask__spin" />
      </div>
      <div class="ask__question">{{ item.ask?.question }}</div>
      <template v-if="item.ask?.options.length">
        <div class="ask__sub">选择答案 · 单选</div>
        <button
          v-for="opt in item.ask.options"
          :key="opt"
          type="button"
          class="ask__opt"
          :class="{ 'ask__opt--on': selected === opt }"
          :aria-pressed="selected === opt"
          @click="choose(opt)"
        >
          <span class="ask__opt-text">{{ opt }}</span>
          <span class="ask__radio" :class="{ 'ask__radio--on': selected === opt }" />
        </button>
      </template>
      <template v-if="item.ask?.allowOther !== false">
        <div class="ask__sub">其他回答</div>
        <input
          v-model="other"
          class="ask__other"
          type="text"
          placeholder="输入其他回答"
          data-testid="ai-ask-other"
          @input="selected = ''"
          @keydown.enter="submit"
        />
      </template>
      <div class="ask__actions">
        <button type="button" class="ask__cancel" data-testid="ai-ask-cancel" @click="cancel">取消</button>
        <button type="button" class="ask__submit" :disabled="!canSubmit" data-testid="ai-ask-submit" @click="submit">提交</button>
      </div>
    </template>
    <!-- 已答态 -->
    <template v-else-if="answer">
      <div class="ask__head">
        <IIcon :name="cancelled ? 'close' : 'check'" :size="12" :class="cancelled ? 'ask__muted' : 'ask__ok'" />
        <span :class="cancelled ? 'ask__muted' : ''">{{ cancelled ? '已取消提问' : '已提交回答' }}</span>
      </div>
      <div class="ask__q">{{ item.ask?.question }}</div>
      <div v-if="!cancelled" class="ask__a">{{ answer }}</div>
    </template>
  </div>
</template>

<style scoped>
.ask {
  margin: 8px 0 4px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  background: var(--is-surface);
  box-shadow: var(--is-shadow-sm, 0 1px 2px rgb(0 0 0 / 0.05));
  padding: 10px 12px;
}
.ask__head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text);
}
.ask__icon {
  color: var(--is-accent);
}
.ask__ok {
  color: var(--is-success);
}
.ask__muted {
  color: var(--is-text-tertiary);
}
.ask__spin {
  margin-left: auto;
  animation: ask-spin 1s linear infinite;
  color: var(--is-accent);
}
@keyframes ask-spin {
  to {
    transform: rotate(360deg);
  }
}
.ask__question {
  margin-top: 8px;
  font-size: var(--is-text-sm);
  font-weight: 600;
  line-height: 1.6;
  color: var(--is-text);
}
.ask__sub {
  margin-top: 10px;
  font-size: 11px;
  color: var(--is-text-tertiary);
}
.ask__opt {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 6px;
  padding: 8px 10px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  background: var(--is-surface-hover);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
  cursor: pointer;
}
.ask__opt:hover {
  border-color: var(--is-border-strong);
}
.ask__opt--on {
  border-color: var(--is-accent);
  background: var(--is-accent-soft);
}
.ask__opt-text {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
}
.ask__radio {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid var(--is-border-strong);
  flex-shrink: 0;
}
.ask__radio--on {
  border-color: var(--is-accent);
  background: radial-gradient(circle, var(--is-accent) 0 4px, transparent 4.5px);
}
.ask__other {
  width: 100%;
  margin-top: 6px;
  padding: 8px 10px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  background: var(--is-surface-hover);
  font-size: var(--is-text-sm);
  font-family: inherit;
  color: var(--is-text);
  outline: none;
  box-sizing: border-box;
}
.ask__other:focus {
  border-color: var(--is-accent);
  background: var(--is-surface);
}
.ask__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
.ask__cancel {
  padding: 4px 12px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text-secondary);
  font-size: var(--is-text-xs);
  cursor: pointer;
}
.ask__cancel:hover {
  color: var(--is-text);
  background: var(--is-surface-hover);
}
.ask__submit {
  padding: 4px 14px;
  border: 1px solid var(--is-accent);
  border-radius: var(--is-radius-sm);
  background: var(--is-accent);
  color: #fff;
  font-size: var(--is-text-xs);
  cursor: pointer;
}
.ask__submit:hover:not(:disabled) {
  background: var(--is-accent-hover);
}
.ask__submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
/* 已答态 */
.ask__q {
  margin-top: 8px;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  line-height: 1.6;
}
.ask__a {
  margin-top: 3px;
  font-size: var(--is-text-sm);
  font-weight: 600;
  color: var(--is-text);
  line-height: 1.6;
}
</style>
