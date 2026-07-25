  height: 18px;
  background: #fff;
  border: 1px solid var(--is-border-strong);
  border-radius: 5px;
  color: var(--is-text-tertiary);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08);
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.flow-canvas .vue-flow__edge.flow-edge--active .flow-edge-icon__box {
  border-color: var(--is-success);
  color: var(--is-success);
}
.flow-canvas--perf .vue-flow__edge-path {
  shape-rendering: optimizeSpeed;
}

/* 拖线过程中让右侧面板不拦截鼠标，便于连到被面板遮挡的端口 */
.flow-canvas.is-connecting .step-panel,
.flow-canvas.is-connecting .add-step {
  pointer-events: none;
}
</style>
```

=== FILE: src/modules/flowchart/FlowNode.vue (from line 82) ===
```
<template>
  <div
    class="flow-node"
    :class="[
      `flow-node--${data.kind}`,
      {
        'flow-node--pending': data.status === 'pending' || (!data.valid && data.status !== 'failed'),
        'flow-node--failed': data.status === 'failed',
      },
    ]"
    :data-node-kind="data.kind"
  >
    <!-- 输入端口（步骤节点） -->
    <div v-if="isStep" class="flow-node__ports flow-node__ports--input">
      <div v-for="p in data.inputs" :key="p.name" class="flow-node__port-wrap">
        <Handle type="target" :position="Position.Left" :id="p.name" class="flow-node__handle" />
        <IIcon :name="(portTypeIcon(p.type) as IconName)" :size="10" class="flow-node__port-icon" />
        <span class="flow-node__port-label">{{ p.name }}</span>
      </div>
    </div>

    <div class="flow-node__body">
      <div class="flow-node__head">
        <span class="flow-node__icon" aria-hidden="true">
          <IIcon :name="icon" :size="isView ? 13 : 15" />
        </span>
        <span class="flow-node__label is-ellipsis" :title="data.label">{{ data.label }}</span>
        <span class="flow-node__status" :class="statusClass" :title="statusTitle">
          <IIcon v-if="data.status === 'running'" name="spinner" :size="10" />
          <IIcon v-else-if="data.status === 'pending'" name="warning" :size="10" />
          <IIcon v-else-if="data.status === 'failed'" name="close" :size="10" />
          <IIcon v-else name="check" :size="10" />
        </span>
      </div>
      <span v-if="subLabel" class="flow-node__sub is-ellipsis">{{ subLabel }}</span>
      <span v-if="pendingHint" class="flow-node__pending-hint">Waiting on step input or configuration.</span>
      <span v-if="data.status === 'failed' && data.error" class="flow-node__error-hint is-ellipsis" :title="data.error">{{ data.error }}</span>
    </div>

    <!-- 输出端口（步骤节点） -->
    <div v-if="isStep" class="flow-node__ports flow-node__ports--output">
      <div v-for="p in data.outputs" :key="p.name" class="flow-node__port-wrap">
        <span class="flow-node__port-label">{{ p.name }}</span>
        <IIcon :name="(portTypeIcon(p.type) as IconName)" :size="10" class="flow-node__port-icon" />
        <Handle type="source" :position="Position.Right" :id="p.name" class="flow-node__handle" />
      </div>
    </div>

    <button
      type="button"
      class="flow-node__open"
      title="在工作区打开"
      aria-label="在工作区打开"
      @click.stop="emit('open', id)"
      @dblclick.stop
    >
      <IIcon name="external" :size="11" />
    </button>
  </div>
</template>

<style scoped>
.flow-node {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 6px;
  min-width: 210px;
  max-width: 320px;
  padding: 8px 10px;
  background: var(--is-node-bg);
  border: 1px solid #cdebdc;
  border-radius: var(--is-radius);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  cursor: grab;
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease),
    transform var(--is-dur-fast) var(--is-ease);
}
.flow-node:active {
  cursor: grabbing;
}
.flow-node:hover {
  transform: translateY(-1px);
  box-shadow: var(--is-shadow-md);
}
:global(.vue-flow__node.is-active) .flow-node {
  border-color: var(--is-success);
  box-shadow:
    0 0 0 2px rgba(31, 157, 102, 0.25),
    var(--is-shadow-md);
}
:global(.vue-flow__node.is-linked) .flow-node {
  border-color: #7ccba4;
}

.flow-node--pending {
  background: #fffbeb;
  border-color: #f3e3b3;
}
.flow-node--failed {
  background: #fef3f2;
  border-color: #fecdca;
}
.flow-node--view {
  min-width: 140px;
  padding: 6px 10px;
  background: #f7f9fb;
  border-color: var(--is-border);
}

.flow-node__ports {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  min-width: 12px;
}
.flow-node__ports--input {
  margin-left: -16px;
  padding-right: 4px;
}
.flow-node__ports--output {
  margin-right: -16px;
  padding-left: 4px;
  align-items: flex-end;
}
.flow-node__port-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 20px;
}
.flow-node__port-label {
  font-size: 10px;
  color: var(--is-text-tertiary);
  white-space: nowrap;
}

.flow-node__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 4px;
}
.flow-node__head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.flow-node__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(31, 157, 102, 0.12);
  color: var(--is-success);
  flex-shrink: 0;
}
.flow-node--view .flow-node__icon {
  width: 20px;
  height: 20px;
  background: rgba(102, 112, 133, 0.12);
  color: var(--is-text-secondary);
}
.flow-node--pending .flow-node__icon {
  background: rgba(138, 109, 26, 0.12);
  color: var(--is-warning-text);
}
.flow-node--failed .flow-node__icon {
  background: rgba(180, 35, 24, 0.12);
  color: var(--is-danger);
}
.flow-node__pending-hint {
  font-size: 10px;
  color: var(--is-warning-text);
  line-height: 1.3;
}
.flow-node__error-hint {
  font-size: 10px;
  color: var(--is-danger);
  line-height: 1.3;
}
.flow-node__port-icon {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.flow-node__label {
  font-size: var(--is-text-sm);
  font-weight: 500;
  color: var(--is-text);
  line-height: 1.3;
  flex: 1;
  min-width: 0;
}
.flow-node__sub {
  font-size: 11px;
  color: var(--is-text-secondary);
  line-height: 1.2;
}

.flow-node__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--is-success);
  color: #fff;
  flex-shrink: 0;
}
.flow-node__status--pending {
  background: #e3a008;
}
.flow-node__status--running {
  background: var(--is-accent);
  animation: spin 1s linear infinite;
}
.flow-node__status--failed {
  background: var(--is-danger);
}
.flow-node__status--stale {
  background: var(--is-text-tertiary);
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.flow-node__open {
  position: absolute;
  top: -8px;
  right: -8px;
  display: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  color: var(--is-text-secondary);
  box-shadow: var(--is-shadow-sm);
  z-index: 2;
}
.flow-node:hover .flow-node__open {
  display: inline-flex;
}
.flow-node__open:hover {
  color: var(--is-accent);
  border-color: var(--is-accent);
}

.flow-node__handle {
  width: 10px;
  height: 10px;
  background: #fff;
  border: 1.5px solid #b6c2cf;
  position: relative;
}
/* 扩大端口点击热区，提升拖线命中率（对齐 Benchling 端口可点性） */
.flow-node__handle::after {
  content: '';
  position: absolute;
  inset: -6px;
}
.flow-node__handle:hover {
  border-color: var(--is-success);
  transform: scale(1.25);
}
</style>
```

=== FILE: src/modules/flowchart/FlowEdge.vue (from line 33) ===
```
<template>
  <path :id="String(id)" class="vue-flow__edge-path" :d="bezier[0]" />
  <foreignObject
    :x="bezier[1] - 9"
    :y="bezier[2] - 9"
    :width="18"
    :height="18"
    class="flow-edge-icon"
    style="overflow: visible; pointer-events: none"
  >
    <div class="flow-edge-icon__box" :title="`数据类型：${(props.data as { portType?: string } | undefined)?.portType ?? 'table'}`">
      <IIcon :name="typeIcon" :size="10" />
    </div>
  </foreignObject>
</template>
```

=== FILE: src/modules/flowchart/AddStepPanel.vue (from line 60) ===
```
<template>
  <Transition name="add-step">
    <aside v-if="open" class="add-step" @keydown.esc.stop="close">
      <header class="add-step__header">
        <h3 class="add-step__title">Add step</h3>
        <button type="button" class="add-step__close" aria-label="关闭" @click="close">
          <IIcon name="close" :size="14" />
        </button>
      </header>

      <div class="add-step__search">
        <ITextField v-model="query" placeholder="Search steps…" prefix-icon="search" clearable size="sm" />
      </div>

      <div class="add-step__body">
        <div v-for="group in groups" :key="group.key" class="add-step__group">
          <h4 class="add-step__group-title">{{ group.title }}</h4>
          <button
            v-for="def in group.defs"
            :key="def.type"
            type="button"
            class="add-step__item"
            @click="select(def.type)"
          >
            <span class="add-step__icon">
              <IIcon :name="(portTypeIcon(def.outputs[0]?.type ?? 'table') as IconName)" :size="14" />
            </span>
            <span class="add-step__item-body">
              <span class="add-step__item-name">{{ def.label }}</span>
              <span v-if="showDescriptions" class="add-step__item-desc">{{ def.description }}</span>
            </span>
          </button>
        </div>
        <div v-if="!groups.length" class="add-step__empty">无匹配步骤</div>
      </div>

      <label class="add-step__desc-toggle">
        <input v-model="showDescriptions" type="checkbox" />
        <span>Step descriptions</span>
      </label>
    </aside>
  </Transition>
</template>

<style scoped>
.add-step {
  position: absolute;
  top: 0;
  right: 0;
  width: 340px;
  height: 100%;
  background: var(--is-surface);
  border-left: 1px solid var(--is-border);
  box-shadow: var(--is-shadow-lg);
  z-index: 8;
  display: flex;
  flex-direction: column;
}
.add-step__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--is-border);
}
.add-step__title {
  font-size: var(--is-text-md);
  font-weight: 600;
}
.add-step__close {
  display: inline-flex;
  padding: 5px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-secondary);
}
.add-step__close:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.add-step__search {
  padding: 12px 16px;
}
.add-step__desc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--is-border);
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  cursor: pointer;
}
.add-step__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px 16px;
}
.add-step__group + .add-step__group {
  margin-top: 14px;
}
.add-step__group-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
  padding: 8px 4px 4px;
}
.add-step__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 8px;
  border-radius: var(--is-radius);
  text-align: left;
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.add-step__item:hover {
  background: var(--is-surface-hover);
}
.add-step__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: rgba(102, 112, 133, 0.1);
  color: var(--is-text-secondary);
  flex-shrink: 0;
}
.add-step__item-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.add-step__item-name {
  font-size: var(--is-text-sm);
  font-weight: 500;
  color: var(--is-text);
}
.add-step__item-desc {
  font-size: 11px;
  color: var(--is-text-tertiary);
  line-height: 1.35;
}
.add-step__empty {
  padding: 24px;
  text-align: center;
  font-size: var(--is-text-sm);
  color: var(--is-text-tertiary);
}

.add-step-enter-active,
.add-step-leave-active {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.add-step-enter-from,
.add-step-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
```

=== FILE: src/modules/flowchart/NodeDetailCard.vue (from line 92) ===
```
<template>
  <aside
    class="flow-detail"
    :class="{ 'flow-detail--chart': isChartNode }"
    role="complementary"
    :aria-label="isChartNode ? '图表预览' : '节点详情'"
  >
    <header class="flow-detail__head">
      <span class="flow-detail__icon" :class="{ 'flow-detail__icon--chart': isChartNode }">
        <IIcon :name="nodeIcon" :size="16" />
      </span>
      <div class="flow-detail__title">
        <span class="flow-detail__kind">{{ kindTitle }}</span>
        <span class="flow-detail__name is-ellipsis" :title="node.label">{{ node.label }}</span>
      </div>
      <button type="button" class="flow-detail__close" aria-label="关闭详情" @click="emit('close')">
        <IIcon name="close" :size="14" />
      </button>
    </header>

    <div class="flow-detail__body">
      <section v-if="isChartNode && node.viewId" class="flow-detail__preview">
        <h4 class="flow-detail__section-title">Output chart</h4>
        <FlowChartPreview :table-id="node.tableId ?? ''" :view-id="node.viewId" @open="emit('open')" />
      </section>

      <dl class="flow-detail__meta" :class="{ 'flow-detail__meta--compact': isChartNode }">
        <template v-for="row in metaRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd class="is-ellipsis" :title="row.value">{{ row.value }}</dd>
        </template>
      </dl>

      <section class="flow-detail__section">
        <h4 class="flow-detail__section-title">Inputs</h4>
        <p v-if="!inputs.length" class="flow-detail__none">无上游节点</p>
        <button
          v-for="n in inputs"
          :key="n.id"
          type="button"
          class="flow-detail__ref"
          :title="`定位到 ${n.label}`"
          @click="emit('focus', n.id)"
        >
          <IIcon :name="refIcon(n)" :size="13" />
          <span class="is-ellipsis">{{ n.label }}</span>
        </button>
      </section>

      <section class="flow-detail__section">
        <h4 class="flow-detail__section-title">Outputs</h4>
        <p v-if="!outputs.length" class="flow-detail__none">无下游节点</p>
        <button
          v-for="n in outputs"
          :key="n.id"
          type="button"
          class="flow-detail__ref"
          :title="`定位到 ${n.label}`"
          @click="emit('focus', n.id)"
        >
          <IIcon :name="refIcon(n)" :size="13" />
          <span class="is-ellipsis">{{ n.label }}</span>
        </button>
      </section>
    </div>

    <footer class="flow-detail__foot">
      <template v-if="node.kind === 'step'">
        <IButton variant="ghost" icon="edit" @click="emit('edit')">Edit</IButton>
        <IButton variant="ghost" icon="trash" @click="onDelete">Delete</IButton>
      </template>
      <IButton variant="primary" icon="external" @click="emit('open')">在工作区打开</IButton>
    </footer>
  </aside>
</template>

<style scoped>
.flow-detail {
  display: flex;
  flex-direction: column;
  width: 300px;
  max-height: calc(100% - 32px);
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-lg);
  overflow: hidden;
}
.flow-detail--chart {
  width: min(520px, calc(100vw - 48px));
}
.flow-detail__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid var(--is-border);
}
.flow-detail__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--is-success-soft);
  color: var(--is-success);
  flex-shrink: 0;
}
.flow-detail__icon--chart {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.flow-detail__title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.flow-detail__kind {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
}
.flow-detail__name {
  font-size: var(--is-text-md);
  font-weight: 600;
}
.flow-detail__close {
  display: inline-flex;
  padding: 5px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-tertiary);
}
.flow-detail__close:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}

.flow-detail__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.flow-detail__preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.flow-detail__meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 14px;
  margin: 0;
}
.flow-detail__meta--compact {
  padding-top: 2px;
  border-top: 1px solid var(--is-border);
}
.flow-detail__meta dt {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.flow-detail__meta dd {
  margin: 0;
  font-size: var(--is-text-xs);
  color: var(--is-text);
  font-weight: 500;
}

.flow-detail__section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
  margin-bottom: 6px;
}
.flow-detail__none {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.flow-detail__ref {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  color: var(--is-text);
  text-align: left;
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.flow-detail__ref:hover {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}

.flow-detail__foot {
  padding: 12px;
  border-top: 1px solid var(--is-border);
  display: flex;
  gap: 8px;
}
.flow-detail__foot :deep(.is-btn) {
  flex: 1;
}
</style>
```

=== FILE: src/modules/steps/panel/StepConfigPanel.vue (from line 75) ===
```
<template>
  <Transition name="step-panel">
    <aside class="step-panel" :class="{ 'step-panel--fullscreen': isFullscreen }" @keydown.esc.stop="cancel">
      <header class="step-panel__header">
        <div class="step-panel__head-left">
          <ITextField v-model="nameInput" size="sm" class="step-panel__name" aria-label="步骤名称" />
          <span class="step-panel__type">{{ def.label }}</span>
        </div>
        <div class="step-panel__head-actions">
          <button type="button" class="step-panel__action" :title="isFullscreen ? '退出全屏' : '全屏'" @click="isFullscreen = !isFullscreen">
            <IIcon :name="isFullscreen ? 'close' : 'expand'" :size="14" />
          </button>
          <button type="button" class="step-panel__action" title="关闭" @click="cancel">
            <IIcon name="close" :size="14" />
          </button>
        </div>
      </header>

      <div class="step-panel__body">
        <div class="step-panel__form">
          <StepConfigForm :step="step" @change="onConfigChange" />
        </div>

        <div class="step-panel__preview">
          <div class="step-panel__preview-head">
            <span class="step-panel__preview-title">Preview</span>
            <span v-if="preview && !preview.error" class="step-panel__preview-count">{{ preview.totalRows }} rows</span>
          </div>
          <div v-if="preview?.stats?.length" class="step-panel__preview-stats">
            <span v-for="s in preview.stats" :key="s.label" class="step-panel__preview-stat">
              {{ s.label }} <b>{{ s.value }}</b>
            </span>
          </div>
          <div v-if="previewLoading" class="step-panel__preview-loading">Loading preview…</div>
          <div v-else-if="preview?.error" class="step-panel__preview-error">{{ preview.error }}</div>
          <div v-else-if="preview && preview.rows.length" class="step-panel__preview-table-wrap">
            <table class="step-panel__preview-table">
              <thead>
                <tr>
                  <th v-for="c in preview.columns" :key="c.field">{{ c.title }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in preview.rows" :key="i">
                  <td v-for="c in preview.columns" :key="c.field">{{ row[c.field] ?? '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="step-panel__preview-empty">无预览数据</div>
        </div>
      </div>

      <footer class="step-panel__footer">
        <IButton variant="ghost" icon="trash" @click="emit('delete')">Delete</IButton>
        <div class="step-panel__footer-right">
          <IButton @click="cancel">Cancel</IButton>
          <IButton variant="primary" :class="{ 'step-panel__save--dirty': dirty }" @click="save">Save</IButton>
        </div>
      </footer>
    </aside>
  </Transition>
</template>

<style scoped>
.step-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 340px;
  height: 100%;
  background: var(--is-surface);
  border-left: 1px solid var(--is-border);
  box-shadow: var(--is-shadow-lg);
  z-index: 9;
  display: flex;
  flex-direction: column;
