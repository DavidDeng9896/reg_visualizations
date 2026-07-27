<script setup lang="ts">
/**
 * CodeMirror 6 SQL 编辑器：语法高亮 + 关键字/表/列补全。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { sql, StandardSQL } from '@codemirror/lang-sql'
import { autocompletion } from '@codemirror/autocomplete'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { searchKeymap } from '@codemirror/search'

const props = withDefaults(
  defineProps<{
    modelValue: string
    schema?: Record<string, string[]>
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    schema: () => ({}),
    placeholder: '输入 SELECT 语句…',
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'run'): void
}>()

const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null
const langConf = new Compartment()
const editableConf = new Compartment()

function buildLang() {
  return sql({
    dialect: StandardSQL,
    schema: props.schema,
    upperCaseKeywords: true,
  })
}

function createState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      foldGutter(),
      history(),
      indentOnInput(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      autocompletion(),
      langConf.of(buildLang()),
      editableConf.of(EditorView.editable.of(!props.disabled)),
      cmPlaceholder(props.placeholder),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...searchKeymap,
        indentWithTab,
        {
          key: 'Mod-Enter',
          run: () => {
            emit('run')
            return true
          },
        },
      ]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) emit('update:modelValue', u.state.doc.toString())
      }),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '13px',
          border: '1px solid var(--is-border)',
          borderRadius: 'var(--is-radius-sm, 6px)',
          background: 'var(--is-surface, #fff)',
        },
        '.cm-scroller': {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          lineHeight: '1.5',
        },
        '.cm-content': { padding: '8px 0' },
        '.cm-gutters': {
          background: 'var(--is-surface-muted, #f2f4f7)',
          borderRight: '1px solid var(--is-border)',
          color: 'var(--is-text-tertiary)',
        },
        '&.cm-focused': { outline: '2px solid color-mix(in srgb, var(--is-accent, #3b82f6) 45%, transparent)' },
      }),
    ],
  })
}

onMounted(() => {
  if (!host.value) return
  view = new EditorView({
    state: createState(props.modelValue),
    parent: host.value,
  })
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

watch(
  () => props.modelValue,
  (v) => {
    if (!view) return
    if (view.state.doc.toString() === v) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: v },
    })
  },
)

watch(
  () => props.schema,
  () => {
    if (!view) return
    view.dispatch({ effects: langConf.reconfigure(buildLang()) })
  },
  { deep: true },
)

watch(
  () => props.disabled,
  (d) => {
    if (!view) return
    view.dispatch({ effects: editableConf.reconfigure(EditorView.editable.of(!d)) })
  },
)

function focus() {
  view?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div ref="host" class="sql-editor" />
</template>

<style scoped>
.sql-editor {
  height: 220px;
  min-height: 160px;
  overflow: hidden;
}
.sql-editor :deep(.cm-editor) {
  height: 100%;
}
</style>
