<template>
  <!-- Teleport to body so dialog is outside list page chrome (Round 37). -->
  <Teleport to="body">
  <div
    class="dialog-root"
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-analysis-title"
    data-ia-create="1"
    @keydown.esc="onEsc"
    @keydown="onTrapKeydown"
  >
    <button type="button" class="dialog-backdrop" tabindex="-1" aria-label="关闭对话框" @click="close" />
    <div class="dialog-panel" ref="panelRef">
      <header class="dialog-header">
        <h2 id="create-analysis-title">Create Analysis</h2>
        <button type="button" class="icon-close" aria-label="关闭" @click="close">×</button>
      </header>
      <form class="dialog-body" @submit.prevent="submit">
        <label class="field">
          <span class="field-label">名称 <abbr title="必填">*</abbr></span>
          <input
            ref="nameRef"
            v-model="name"
            type="text"
            required
            placeholder="例如 Dose Response"
            aria-required="true"
            autocomplete="off"
          />
        </label>
        <label class="field">
          <span class="field-label">项目 <abbr title="必填">*</abbr></span>
          <select v-model="projectId" required aria-required="true" aria-label="项目">
            <option v-for="p in MOCK_PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
        <footer class="dialog-footer">
          <button type="button" class="btn" @click="close">取消</button>
          <button type="submit" class="btn btn-primary" :disabled="!canSubmit">Create</button>
        </footer>
      </form>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { MOCK_PROJECTS } from '@/shared/mock/projects'
import { workspaceOverlayEscAllowed } from '@/modules/analysis/overlayEsc'
import { resolveCreateRestoreFocus } from '@/modules/analysis/createAnalysisHandoff'
import { restoreFocusEl } from '@/shared/ui/focusRestore'

const props = defineProps<{
  modelValue: boolean
  /** Prefer empty-list Create CTA (or header Create) when canceling after Teleport. */
  restoreTarget?: HTMLElement | null
}>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  create: [{ name: string; projectId: string }]
}>()

const name = ref('')
const projectId = ref(MOCK_PROJECTS[0].id)
const nameRef = ref<HTMLInputElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
let restoreFocus: HTMLElement | null = null

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

const canSubmit = computed(() => !!name.value.trim() && !!projectId.value)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      name.value = ''
      projectId.value = MOCK_PROJECTS[0].id
    }
  },
)

onMounted(() => {
  // Round 38: prefer explicit opener (empty CTA) so Teleport cancel returns focus.
  restoreFocus = resolveCreateRestoreFocus(props.restoreTarget ?? null)
  document.body.style.overflow = 'hidden'
  void nextTick(() => nameRef.value?.focus())
})

onUnmounted(() => {
  document.body.style.overflow = ''
  restoreFocusEl(restoreFocus, () => resolveCreateRestoreFocus(null))
})

function focusables(): HTMLElement[] {
  const root = panelRef.value
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  )
}

function onTrapKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const list = focusables()
  if (list.length < 2) return
  const first = list[0]
  const last = list[list.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey) {
    if (active === first || !list.includes(active as HTMLElement)) {
      e.preventDefault()
      last.focus()
    }
  } else if (active === last || !list.includes(active as HTMLElement)) {
    e.preventDefault()
    first.focus()
  }
}

function onEsc() {
  if (!workspaceOverlayEscAllowed()) return
  close()
}

function close() {
  emit('update:modelValue', false)
}

function submit() {
  const n = name.value.trim()
  if (!n || !projectId.value) return
  emit('create', { name: n, projectId: projectId.value })
}
</script>

<style scoped>
.dialog-root {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dialog-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(15, 23, 42, 0.45);
  cursor: pointer;
}
.dialog-panel {
  position: relative;
  z-index: 1;
  width: min(420px, 100%);
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--ia-border);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 8px;
}
.dialog-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.icon-close {
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: #8f959e;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.icon-close:hover {
  color: #1f2329;
  background: #f2f3f5;
}
.icon-close:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: 2px;
}
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 18px 18px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 13px;
  color: #646a73;
}
.field-label abbr {
  text-decoration: none;
  color: #c45656;
}
.field input,
.field select {
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: inherit;
  font: inherit;
}
.field input:focus-visible,
.field select:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: 1px;
  border-color: var(--ia-accent);
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
.btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  cursor: pointer;
}
.btn:hover {
  border-color: var(--ia-accent);
  color: var(--ia-accent);
}
.btn:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: 2px;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: var(--ia-accent);
  border-color: var(--ia-accent);
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
  color: #fff;
}
</style>
