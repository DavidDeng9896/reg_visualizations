<script setup lang="ts">
/**
 * CodeMirror 6 Python 编辑器：语法高亮 + inputs/列名补全。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { searchKeymap } from '@codemirror/search'

export interface PythonCompletionSource {
  /** 如 inputs[0] 的列名 */
  columnsByInput?: Record<number, string[]>
  inputNames?: string[]
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    completion?: PythonCompletionSource
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    completion: () => ({}),
    placeholder: '编写 custom_code…',
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'run'): void
}>()

const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null
const editableConf = new Compartment()

function completions(ctx: CompletionContext): CompletionResult | null {
  const word = ctx.matchBefore(/[\w."[\]]+/)
  if (!word || (word.from === word.to && !ctx.explicit)) return null
  const options: { label: string; type?: string; detail?: string }[] = [
    { label: 'inputs', type: 'variable', detail: 'list[IOData]' },
    { label: 'IOData', type: 'class' },
    { label: 'custom_code', type: 'function' },
    { label: 'pd', type: 'namespace', detail: 'pandas' },
    { label: 'np', type: 'namespace', detail: 'numpy' },
    { label: 'go', type: 'namespace', detail: 'plotly.graph_objects' },
  ]
  const cols = props.completion?.columnsByInput ?? {}
  for (const [idx, names] of Object.entries(cols)) {
    for (const col of names) {
      options.push({
        label: `inputs[${idx}].data["${col}"]`,
        type: 'property',
        detail: 'column',
      })
    }
  }
  ;(props.completion?.inputNames ?? []).forEach((n, i) => {
    options.push({ label: `inputs[${i}]`, type: 'variable', detail: n })
  })
  return { from: word.from, options }
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
      python(),
      autocompletion({ override: [completions] }),
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

/** 在光标处插入文本。 */
function insertAtCursor(text: string) {
  if (!view) return
  const { from, to } = view.state.selection.main
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  })
  emit('update:modelValue', view.state.doc.toString())
}

defineExpose({ insertAtCursor })

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
  () => props.disabled,
  (d) => {
    view?.dispatch({ effects: editableConf.reconfigure(EditorView.editable.of(!d)) })
  },
)
</script>

<template>
  <div ref="host" class="py-editor" />
</template>

<style scoped>
.py-editor {
  height: 100%;
  min-height: 280px;
}
.py-editor :deep(.cm-editor) {
  height: 100%;
}
</style>
