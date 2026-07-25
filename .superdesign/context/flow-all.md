
=== FILE: src/styles/tokens.css (from line 1) ===
```
/* Insight Studio — 设计令牌（DESIGN.md §2 视觉语言） */
:root {
  /* 颜色 */
  --is-primary: #1e2a78;
  --is-primary-hover: #27359a;
  --is-primary-active: #182160;
  --is-accent: #2e5bff;
  --is-accent-hover: #1f49e0;
  --is-accent-soft: #eef2ff;
  --is-success: #1f9d66;
  --is-success-soft: #eefaf3;
  --is-danger: #d92d20;
  --is-danger-hover: #b42318;
  --is-danger-soft: #fef3f2;
  --is-warning-bg: #fdf3d7;
  --is-warning-text: #8a6d1a;
  --is-info: #2e5bff;

  --is-bg: #f7f8fa;
  --is-surface: #ffffff;
  --is-surface-hover: #f2f4f7;
  --is-border: #e4e7ec;
  --is-border-strong: #d0d5dd;

  --is-text: #1d2939;
  --is-text-secondary: #667085;
  --is-text-tertiary: #98a2b3;
  --is-text-inverse: #ffffff;

  --is-node-bg: #eefaf3;

  /* 间距 */
  --is-space-1: 4px;
  --is-space-2: 8px;
  --is-space-3: 12px;
  --is-space-4: 16px;
  --is-space-5: 20px;
  --is-space-6: 24px;
  --is-space-8: 32px;
  --is-space-10: 40px;

  /* 圆角 */
  --is-radius-sm: 6px;
  --is-radius: 8px;
  --is-radius-lg: 12px;
  --is-radius-full: 999px;

  /* 阴影 */
  --is-shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.05);
  --is-shadow-md: 0 4px 12px rgba(16, 24, 40, 0.1);
  --is-shadow-lg: 0 12px 32px rgba(16, 24, 40, 0.16);
  --is-ring: 0 0 0 3px rgba(46, 91, 255, 0.22);

  /* 字号 */
  --is-text-xs: 12px;
  --is-text-sm: 13px;
  --is-text-md: 14px;
  --is-text-lg: 16px;

  /* 动效 */
  --is-ease: cubic-bezier(0.33, 1, 0.68, 1);
  --is-dur-fast: 150ms;
  --is-dur: 200ms;
  --is-dur-slow: 250ms;

  /* 层级（teleport 到 body 后仍保持相对顺序；dropdown 高于 popover/modal 以便嵌套） */
  --is-z-popover: 1200;
  --is-z-modal: 1300;
  --is-z-dropdown: 1350;
  --is-z-toast: 1400;

  /* 字体 */
  --is-font:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --is-font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}
```

=== FILE: src/styles/base.css (from line 1) ===
```
/* reset + 基础排版 + 滚动条美化 */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
}

body {
  margin: 0;
  font-family: var(--is-font);
  font-size: var(--is-text-sm);
  line-height: 1.5;
  color: var(--is-text);
  background: var(--is-bg);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1,
h2,
h3,
h4,
p,
figure {
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}

a {
  color: var(--is-accent);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

/* 键盘焦点环（全局兜底，组件内部可覆盖） */
:focus-visible {
  outline: none;
  box-shadow: var(--is-ring);
  border-radius: var(--is-radius-sm);
}

/* 滚动条美化 */
*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
*::-webkit-scrollbar-track {
  background: transparent;
}
*::-webkit-scrollbar-thumb {
  background: rgba(16, 24, 40, 0.18);
  border-radius: var(--is-radius-full);
  border: 2px solid transparent;
  background-clip: padding-box;
}
*::-webkit-scrollbar-thumb:hover {
  background: rgba(16, 24, 40, 0.3);
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* 通用文本截断 */
.is-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

=== FILE: src/modules/workspace/WorkspacePage.vue (from line 90) ===
```
<template>
  <div class="ws">
    <header class="ws__header">
      <nav class="ws__breadcrumb" aria-label="面包屑">
        <RouterLink to="/" class="ws__crumb-link">Projects</RouterLink>
        <IIcon name="chevron-right" :size="12" class="ws__crumb-sep" />
        <span class="ws__crumb-current is-ellipsis">{{ current?.name ?? '…' }}</span>
        <span v-if="dirty" class="ws__dirty" title="有未保存更改">
          <IIcon name="dot" :size="8" />
        </span>
        <span v-if="saving" class="ws__saving">保存中…</span>
      </nav>

      <div class="ws__header-actions">
        <IPopover :open="headerMenuOpen" placement="bottom-end" :arrow="false" @update:open="headerMenuOpen = $event">
          <template #anchor>
            <IButton variant="ghost" icon="more" title="更多操作" aria-label="更多操作" @click="headerMenuOpen = !headerMenuOpen" />
          </template>
          <template #default="{ close }">
            <div class="menu" role="menu">
              <button type="button" class="menu__item" role="menuitem" @click="close(); openRename()">
                <IIcon name="edit" :size="13" /> 重命名
              </button>
              <button type="button" class="menu__item menu__item--danger" role="menuitem" @click="close(); deleteOpen = true">
                <IIcon name="trash" :size="13" /> 删除 Analysis
              </button>
            </div>
          </template>
        </IPopover>

        <ITooltip :content="mode === 'flowchart' ? '返回工作区' : '查看流程图'">
          <IButton
            :variant="mode === 'flowchart' ? 'secondary' : 'ghost'"
            icon="flowchart"
            :aria-pressed="mode === 'flowchart'"
            @click="toggleFlowchart"
          >
            Flowchart
          </IButton>
        </ITooltip>

        <IPopover :open="addDataOpen" placement="bottom-end" :arrow="true" @update:open="addDataOpen = $event">
          <template #anchor>
            <IButton variant="primary" icon="plus" @click="addDataOpen = !addDataOpen">Add data</IButton>
          </template>
          <template #default>
            <div class="menu menu--adddata" role="menu">
              <button type="button" class="menu__item" role="menuitem" @click="openCsvImport">
                <IIcon name="upload" :size="14" />
                <span>
                  <span class="menu__item-title">Import CSV</span>
                  <span class="menu__item-desc">上传 .csv 文件创建新表</span>
                </span>
              </button>
              <button type="button" class="menu__item" role="menuitem" @click="openCombine">
                <IIcon name="combine" :size="14" />
                <span>
                  <span class="menu__item-title">Combine tables</span>
                  <span class="menu__item-desc">Join / Append 现有表</span>
                </span>
              </button>
              <div class="menu__sep" role="separator" />
              <button type="button" class="menu__item" role="menuitem" disabled aria-disabled="true">
                <IIcon name="database" :size="14" />
                <span>
                  <span class="menu__item-title">From Registry</span>
                  <span class="menu__item-desc">后续版本</span>
                </span>
              </button>
              <button type="button" class="menu__item" role="menuitem" disabled aria-disabled="true">
                <IIcon name="plate" :size="14" />
                <span>
                  <span class="menu__item-title">From Plate</span>
                  <span class="menu__item-desc">后续版本</span>
                </span>
              </button>
            </div>
          </template>
        </IPopover>
      </div>
    </header>

    <div class="ws__body">
      <SidebarTree @add-data="addDataOpen = true" />
      <main class="ws__main">
        <KeepAlive>
          <component :is="modeComponent" :key="mode" @add-data="addDataOpen = true" />
        </KeepAlive>
      </main>
    </div>

    <!-- 重命名 -->
    <IModal :open="renameOpen" title="重命名 Analysis" :width="420" @update:open="renameOpen = $event">
      <ITextField v-model="renameName" autofocus @enter="submitRename" />
      <template #footer>
        <IButton @click="renameOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!renameName.trim()" @click="submitRename">保存</IButton>
      </template>
    </IModal>

    <!-- 删除确认 -->
    <IModal :open="deleteOpen" title="删除 Analysis" :width="420" @update:open="deleteOpen = $event">
      <p class="confirm-text">确定删除「{{ current?.name }}」吗？所有表、视图与图表配置都会被删除，此操作不可撤销。</p>
      <template #footer>
        <IButton @click="deleteOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmDelete">删除</IButton>
      </template>
    </IModal>

    <!-- CSV 导入 / 表合并 -->
    <CsvImportDialog :open="csvImportOpen" @update:open="csvImportOpen = $event" />
    <CombineTablesDialog :open="combineOpen" @update:open="combineOpen = $event" />

    <div v-if="loading" class="ws__loading">加载中…</div>
  </div>
</template>

<style scoped>
.ws {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.ws__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 52px;
  padding: 0 16px;
  background: var(--is-surface);
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.ws__breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: var(--is-text-sm);
}
.ws__crumb-link {
  color: var(--is-text-secondary);
}
.ws__crumb-link:hover {
  color: var(--is-accent);
}
.ws__crumb-sep {
  color: var(--is-text-tertiary);
}
.ws__crumb-current {
  font-weight: 600;
  max-width: 320px;
}
.ws__dirty {
  color: var(--is-warning-text);
  display: inline-flex;
}
.ws__saving {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.ws__header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ws__body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.ws__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
.ws__loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--is-bg);
  color: var(--is-text-secondary);
  z-index: 10;
}

.menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 180px;
}
.menu--adddata {
  width: 260px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.menu__item:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.menu__item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.menu__item > span {
  display: flex;
  flex-direction: column;
}
.menu__item-title {
  font-size: var(--is-text-sm);
  font-weight: 500;
}
.menu__item-desc {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.menu__item--danger {
  color: var(--is-danger);
}
.menu__item--danger:hover {
  background: var(--is-danger-soft);
}
.menu__sep {
  height: 1px;
  background: var(--is-border);
  margin: 4px 6px;
}
.confirm-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.6;
}
</style>
```

=== FILE: src/modules/workspace/FlowchartMain.vue (from line 1) ===
```
<script setup lang="ts">
import FlowchartCanvas from '../flowchart/FlowchartCanvas.vue'

/**
 * 流程图模式主区：挂载 @vue-flow/core 画布（src/modules/flowchart）。
 * KeepAlive 下组件实例保留，缩放/平移状态不丢。
 */
const emit = defineEmits<{ (e: 'add-data'): void }>()
</script>

<template>
  <div class="flowchart-main" data-mount="flowchart">
    <FlowchartCanvas @add-data="emit('add-data')" />
  </div>
</template>

<style scoped>
.flowchart-main {
  height: 100%;
  min-height: 0;
}
</style>
```

=== FILE: src/modules/flowchart/FlowchartCanvas.vue (from line 563) ===
```
<template>
  <div class="flow-canvas" :class="{ 'flow-canvas--perf': perfMode, 'is-connecting': isConnecting }">
    <Transition name="flow-banner">
      <div v-if="bannerVisible" class="flow-banner" role="status">
        <IIcon name="warning" :size="14" class="flow-banner__icon" />
        <span class="flow-banner__text">流程图即编辑器：拖出端口连线添加步骤；视图节点双击打开工作区</span>
        <button type="button" class="flow-banner__close" aria-label="关闭提示" @click="dismissBanner">
          <IIcon name="close" :size="13" />
        </button>
      </div>
    </Transition>

    <VueFlow
      :id="FLOW_ID"
      v-model:nodes="vfNodes"
      v-model:edges="vfEdges"
      class="flow-canvas__vf"
      :nodes-connectable="true"
      :nodes-draggable="true"
      :edges-focusable="false"
      :elements-selectable="false"
      :edges-updatable="false"
      :delete-key-code="null"
      :min-zoom="0.25"
      :max-zoom="2"
      :only-render-visible-elements="perfMode"
      fit-view-on-init
      @node-click="onNodeClick"
      @node-double-click="(e: NodeMouseEvent) => openInWorkspace(e.node.id)"
      @node-drag-stop="onNodeDragStop"
      @node-mouse-enter="onNodeMouseEnter"
      @node-mouse-leave="onNodeMouseLeave"
      @pane-click="onPaneClick"
      @connect-start="onConnectStart"
      @connect="onConnect"
      @connect-end="onConnectEnd"
    >
      <Background v-if="alive" variant="dots" :gap="20" :size="1" pattern-color="#d0d5dd" bg-color="#fbfcfd" />

      <MiniMap
        v-if="alive && minimapOpen && !isEmpty"
        position="bottom-right"
        :pannable="true"
        :zoomable="true"
        :width="168"
        :height="112"
        :node-color="minimapNodeColor"
        mask-color="rgba(247, 248, 250, 0.7)"
        class="flow-minimap"
      />

      <Panel position="bottom-left" class="flow-controls">
        <ITooltip content="缩小">
          <button type="button" class="flow-controls__btn" aria-label="缩小" @click="zoomOut()">
            <IIcon name="minus" :size="14" />
          </button>
        </ITooltip>
        <button
          type="button"
          class="flow-controls__zoom"
          title="重置为 100%"
          aria-label="重置缩放"
          @click="zoomTo(1, { duration: 200 })"
        >
          {{ zoomPercent }}%
        </button>
        <ITooltip content="放大">
          <button type="button" class="flow-controls__btn" aria-label="放大" @click="zoomIn()">
            <IIcon name="plus" :size="14" />
          </button>
        </ITooltip>
        <span class="flow-controls__sep" />
        <ITooltip content="适应视图">
          <button type="button" class="flow-controls__btn" aria-label="适应视图" @click="fitAll()">
            <IIcon name="expand" :size="14" />
          </button>
        </ITooltip>
        <ITooltip v-if="hasStale" content="重新运行所有待更新步骤">
          <button type="button" class="flow-controls__btn flow-controls__btn--run" aria-label="重新运行" @click="runAll()">
            <IIcon name="play" :size="14" />
            <span v-if="staleCount" class="flow-controls__run-badge">{{ staleCount }}</span>
          </button>
        </ITooltip>
        <ITooltip :content="minimapOpen ? '隐藏小地图' : '显示小地图'">
          <button
            type="button"
            class="flow-controls__btn"
            :class="{ 'flow-controls__btn--on': minimapOpen }"
            aria-label="切换小地图"
            :aria-pressed="minimapOpen"
            @click="minimapOpen = !minimapOpen"
          >
            <IIcon name="flowchart" :size="14" />
          </button>
        </ITooltip>
      </Panel>

      <template #node-flow="slotProps">
        <FlowNode
          :id="slotProps.id"
          :data="slotProps.data"
          :selected="slotProps.selected"
          @open="openInWorkspace"
        />
      </template>

      <template #edge-flow="slotProps">
        <FlowEdge v-bind="slotProps" />
      </template>
    </VueFlow>

    <div v-if="isEmpty" class="flow-empty">
      <IEmptyState
        icon="flowchart"
        title="还没有数据"
        description="导入 CSV 或合并表后，这里会展示数据加工流程"
      >
        <IButton variant="primary" icon="plus" @click="emit('add-data')">Add data</IButton>
      </IEmptyState>
    </div>

    <Transition name="flow-detail">
      <NodeDetailCard
        v-if="activeNode && !editingStep"
        :key="activeNode.id"
        class="flow-canvas__detail"
        :node="activeNode"
        :inputs="activeInputs"
        :outputs="activeOutputs"
        @close="setActive(null)"
        @focus="focusNode"
        @open="openInWorkspace(activeNode.id)"
        @edit="activeNode.stepId && openStepEditor(activeNode.stepId, false)"
        @delete="onStepDeleted"
      />
    </Transition>

    <AddStepPanel
      :open="addStepOpen"
      :source="addStepSource"
      :source-port-type="addStepSourcePortType"
      @update:open="addStepOpen = $event"
      @select="onStepSelected"
    />

    <StepConfigPanel
      v-if="editingStepData"
      :step="editingStepData"
      @close="closeStepEditor(true)"
      @save="onStepSaved"
      @delete="onStepDeleted(editingStep!)"
    />
  </div>
</template>

<style scoped>
.flow-canvas {
  position: relative;
  height: 100%;
  min-height: 0;
}
.flow-canvas__vf {
  height: 100%;
}

.flow-banner {
  position: absolute;
  top: 12px;
  left: 16px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(560px, calc(100% - 32px));
  padding: 8px 10px;
  background: var(--is-warning-bg);
  border: 1px solid #f3e3b3;
  border-left: 3px solid #e3a008;
  border-radius: var(--is-radius-sm);
  box-shadow: var(--is-shadow-sm);
  font-size: var(--is-text-sm);
  color: var(--is-warning-text);
  pointer-events: none;
}
.flow-banner__icon,
.flow-banner__text {
  pointer-events: none;
}
.flow-banner__close {
  pointer-events: auto;
}
.flow-banner__icon {
  flex-shrink: 0;
}
.flow-banner__text {
  flex: 1;
  min-width: 0;
}
.flow-banner__close {
  display: inline-flex;
  padding: 3px;
  border-radius: 4px;
  color: var(--is-warning-text);
  flex-shrink: 0;
}
.flow-banner__close:hover {
  background: rgba(138, 109, 26, 0.12);
}
.flow-banner-enter-active,
.flow-banner-leave-active {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.flow-banner-enter-from,
.flow-banner-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.flow-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
}
.flow-controls__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-secondary);
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.flow-controls__btn:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.flow-controls__btn--on {
  color: var(--is-accent);
  background: var(--is-accent-soft);
}
.flow-controls__btn--run {
  position: relative;
  color: var(--is-warning-text);
  background: var(--is-warning-bg);
}
.flow-controls__btn--run:hover {
  background: #f3e3b3;
  color: var(--is-warning-text);
}
.flow-controls__run-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: #e3a008;
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  line-height: 14px;
  text-align: center;
}
.flow-controls__zoom {
  min-width: 44px;
  height: 26px;
  padding: 0 6px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-xs);
  font-weight: 500;
  color: var(--is-text-secondary);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.flow-controls__zoom:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.flow-controls__sep {
  width: 1px;
  height: 16px;
  background: var(--is-border);
  margin: 0 3px;
}

.flow-minimap {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
  overflow: hidden;
}

.flow-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(251, 252, 253, 0.85);
  z-index: 4;
}

.flow-canvas__detail {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 6;
}
.flow-detail-enter-active,
.flow-detail-leave-active {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.flow-detail-enter-from,
.flow-detail-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>

<style>
.flow-canvas .vue-flow__edge-path {
  stroke: #98a2b3;
  stroke-width: 1.5;
}
.flow-canvas .vue-flow__edge.flow-edge--active .vue-flow__edge-path {
  stroke: var(--is-success);
  stroke-width: 2;
}
.flow-canvas .vue-flow__edge {
  pointer-events: none;
}
.flow-canvas .flow-edge-icon__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
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
}
.step-panel--fullscreen {
  width: 100%;
}
.step-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--is-border);
}
.step-panel__head-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.step-panel__name {
  font-weight: 600;
}
.step-panel__type {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.step-panel__head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.step-panel__action {
  display: inline-flex;
  padding: 6px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-secondary);
}
.step-panel__action:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.step-panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.step-panel__preview {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 120px;
}
.step-panel__preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--is-surface-hover);
  border-bottom: 1px solid var(--is-border);
}
.step-panel__preview-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
}
.step-panel__preview-count {
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
}
.step-panel__preview-stats {
  display: flex;
  gap: 12px;
  padding: 6px 10px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  border-bottom: 1px solid var(--is-border);
}
.step-panel__preview-stat b {
  color: var(--is-text);
  font-weight: 600;
}
.step-panel__preview-table-wrap {
  overflow: auto;
  max-height: 260px;
}
.step-panel__preview-table {
  border-collapse: collapse;
  width: 100%;
  font-size: var(--is-text-xs);
}
.step-panel__preview-table th {
  position: sticky;
  top: 0;
  background: var(--is-surface-hover);
  padding: 5px 8px;
  text-align: left;
  border-bottom: 1px solid var(--is-border);
}
.step-panel__preview-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--is-border);
  color: var(--is-text-secondary);
}
.step-panel__preview-loading,
.step-panel__preview-empty {
  padding: 16px;
  text-align: center;
  font-size: var(--is-text-sm);
  color: var(--is-text-tertiary);
}
.step-panel__preview-error {
  padding: 12px;
  font-size: var(--is-text-xs);
  color: var(--is-danger);
  background: var(--is-danger-soft);
}
.step-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--is-border);
}
.step-panel__footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.step-panel__save--dirty {
  box-shadow: 0 0 0 3px rgba(30, 42, 120, 0.18);
}

.step-panel-enter-active,
.step-panel-leave-active {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.step-panel-enter-from,
.step-panel-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
```

=== FILE: src/modules/steps/panel/StepConfigForm.vue (from line 176) ===
```
<template>
  <div class="scf">
    <p v-if="!inputTable && def.inputs.length > 0" class="scf__warn">无法解析输入表，请先连接输入端口。</p>

    <!-- Filter -->
    <template v-if="step.type === 'filter'">
      <div v-for="(filter, fidx) in step.config.filters as Filter[]" :key="filter.id" class="scf__filter">
        <div class="scf__filter-head">
          <ISelect
            :model-value="filter.combinator"
            size="sm"
            :options="[{ value: 'and', label: 'And' }, { value: 'or', label: 'Or' }]"
            @update:model-value="filter.combinator = $event as 'and' | 'or'; emit('change')"
          />
          <IButton variant="ghost" icon="trash" size="sm" @click="removeFilter(fidx)">Remove</IButton>
        </div>
        <div v-for="(cond, cidx) in filter.conditions" :key="cond.id" class="scf__cond">
          <ISelect :model-value="cond.column" size="sm" aria-label="Filter column" :options="columnOptions" @update:model-value="onCondColumnChange(cond, $event)" />
          <ISelect :model-value="cond.operator" size="sm" aria-label="Filter operator" :options="operatorOptions(cond)" @update:model-value="onCondOperatorChange(cond, $event)" />
          <template v-if="operatorArity(cond.operator) === 'one'">
            <ITextField
              :model-value="condValueText(cond)"
              size="sm"
              placeholder="value"
              aria-label="Filter value"
              @update:model-value="onCondValueInput(cond, $event)"
            />
          </template>
          <template v-else-if="operatorArity(cond.operator) === 'two'">
            <ITextField
              :model-value="condValueText(cond)"
              size="sm"
              placeholder="min"
              aria-label="Filter min value"
              @update:model-value="onCondValueInput(cond, $event)"
            />
            <ITextField
              :model-value="cond.value2 === null || cond.value2 === undefined ? '' : String(cond.value2)"
              size="sm"
              placeholder="max"
              aria-label="Filter max value"
              @update:model-value="onCondValue2Input(cond, $event)"
            />
          </template>
          <template v-else-if="operatorArity(cond.operator) === 'list'">
            <ITextField
              :model-value="condValueText(cond)"
              size="sm"
              placeholder="a, b, c"
              aria-label="Filter values"
              @update:model-value="onCondValueInput(cond, $event)"
            />
          </template>
          <IButton variant="ghost" icon="trash" size="sm" :disabled="filter.conditions.length <= 1" @click="removeCondition(filter, cidx)" />
        </div>
        <IButton variant="ghost" icon="plus" size="sm" @click="addCondition(filter)">Add condition</IButton>
      </div>
      <IButton variant="ghost" icon="plus" @click="addFilter">Add filter group</IButton>
    </template>

    <!-- Hide columns -->
    <template v-else-if="step.type === 'hide-columns'">
      <div class="scf__mode">
        <ISelect
          :model-value="step.config.mode as 'keep' | 'drop'"
          size="sm"
          :options="[{ value: 'keep', label: 'Keep selected' }, { value: 'drop', label: 'Drop selected' }]"
          @update:model-value="step.config.mode = $event; emit('change')"
        />
      </div>
      <div class="scf__collist">
        <label v-for="c in inputTable?.columns ?? []" :key="c.field" class="scf__colitem">
          <input
            type="checkbox"
            :checked="(step.config.columns as string[]).includes(c.field)"
            @change="toggleColumn(c.field)"
          />
          <IIcon :name="c.dataType === 'number' ? 'type-number' : 'type-text'" :size="13" />
          <span>{{ c.title }}</span>
        </label>
      </div>
    </template>

    <!-- Computed column -->
    <template v-else-if="step.type === 'computed-column'">
      <label class="scf__label">New column name</label>
      <ITextField v-model="computedCfg.name" size="sm" @input="emit('change')" />
      <label class="scf__label">Expression</label>
      <ITextField v-model="computedCfg.expression" size="sm" placeholder="e.g. round(value * 2, 1)" @input="emit('change')" />
      <p class="scf__hint">
        Supports + - * / parentheses numbers 'strings' and functions:
        if(cond,a,b) round(x,n) abs sqrt log ln min max year month day concat(...).
        Use [column name] for names with spaces.
      </p>
    </template>

    <!-- Join -->
    <template v-else-if="step.type === 'join'">
      <label class="scf__label">Join type</label>
      <div class="scf__join-types">
        <button
          v-for="jt in ['left', 'inner', 'right', 'full']"
          :key="jt"
          type="button"
          class="scf__join-type"
          :class="{ 'scf__join-type--active': joinCfg.joinType === jt }"
          @click="joinCfg.joinType = jt as 'left' | 'inner' | 'right' | 'full'; emit('change')"
        >
          {{ jt[0].toUpperCase() + jt.slice(1) }}
        </button>
      </div>

      <label class="scf__label">Join keys</label>
      <div v-for="(k, i) in joinCfg.keys" :key="i" class="scf__keyrow">
        <ISelect :model-value="k.left" size="sm" :options="columnOptions" placeholder="Left column" @update:model-value="k.left = String($event); emit('change')" />
        <span>=</span>
        <ISelect :model-value="k.right" size="sm" :options="rightColumnOptions" placeholder="Right column" @update:model-value="k.right = String($event); emit('change')" />
        <IButton variant="ghost" icon="trash" size="sm" :disabled="joinCfg.keys.length <= 1" @click="removeJoinKey(i)" />
      </div>
      <IButton variant="ghost" icon="plus" size="sm" @click="addJoinKey">Add key</IButton>

      <label class="scf__label">Suffixes</label>
      <div class="scf__suffixes">
        <ITextField v-model="joinCfg.suffixes[0]" size="sm" placeholder="left suffix" @input="emit('change')" />
        <ITextField v-model="joinCfg.suffixes[1]" size="sm" placeholder="right suffix" @input="emit('change')" />
      </div>
    </template>

    <!-- Union -->
    <template v-else-if="step.type === 'union'">
      <label class="scf__label">Align columns by</label>
      <ISelect
        :model-value="unionCfg.alignBy"
        size="sm"
        :options="[{ value: 'name', label: 'Column name' }, { value: 'position', label: 'Column position' }]"
        @update:model-value="unionCfg.alignBy = $event as 'name' | 'position'; emit('change')"
      />
      <label class="scf__colitem">
        <input v-model="unionCfg.fillNull" type="checkbox" @change="emit('change')" />
        <span>Fill missing values with null（关闭 = 严格模式，列必须一致）</span>
      </label>
      <label class="scf__colitem">
        <input v-model="unionCfg.addSourceColumn" type="checkbox" @change="emit('change')" />
        <span>Add source column</span>
      </label>
    </template>

    <template v-else>
      <p class="scf__placeholder">Configuration form for "{{ def.label }}" is not yet implemented in P0.</p>
    </template>
  </div>
</template>

<style scoped>
.scf {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.scf__warn {
  font-size: var(--is-text-xs);
  color: var(--is-warning-text);
  background: var(--is-warning-bg);
  padding: 8px 10px;
  border-radius: var(--is-radius-sm);
}
.scf__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.scf__hint {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  line-height: 1.5;
}
.scf__placeholder {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
}
.scf__filter {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.scf__filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.scf__cond {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.scf__mode {
  max-width: 200px;
}
.scf__collist {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}
.scf__colitem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  cursor: pointer;
}
.scf__colitem:hover {
  background: var(--is-surface-hover);
}
.scf__join-types {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.scf__join-type {
  padding: 6px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-xs);
  text-transform: capitalize;
}
.scf__join-type--active {
  border-color: var(--is-accent);
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.scf__keyrow {
  display: flex;
  align-items: center;
  gap: 6px;
}
.scf__suffixes {
  display: flex;
  gap: 8px;
}
</style>
```

=== FILE: src/ui/IButton.vue (from line 1) ===
```
<script setup lang="ts">
import { computed } from 'vue'
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: IconName
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
    title?: string
  }>(),
  { variant: 'secondary', size: 'md', type: 'button' },
)

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const isDisabled = computed(() => props.disabled || props.loading)

function onClick(ev: MouseEvent) {
  if (isDisabled.value) return
  emit('click', ev)
}
</script>

<template>
  <button
    class="is-btn"
    :class="[`is-btn--${variant}`, `is-btn--${size}`, { 'is-btn--loading': loading, 'is-btn--icon-only': icon && !$slots.default }]"
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
    :title="title"
    @click="onClick"
  >
    <span v-if="loading" class="is-btn__spinner" aria-hidden="true" />
    <IIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 13 : 15" />
    <span v-if="$slots.default" class="is-btn__label"><slot /></span>
  </button>
</template>

<style scoped>
.is-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: var(--is-radius-sm);
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease),
    opacity var(--is-dur-fast) var(--is-ease);
}
.is-btn--md {
  height: 32px;
  padding: 0 14px;
  font-size: var(--is-text-sm);
}
.is-btn--sm {
  height: 28px;
  padding: 0 10px;
  font-size: var(--is-text-xs);
}
.is-btn--icon-only.is-btn--md {
  width: 32px;
  padding: 0;
}
.is-btn--icon-only.is-btn--sm {
  width: 28px;
  padding: 0;
}

.is-btn--primary {
  background: var(--is-primary);
  color: var(--is-text-inverse);
}
.is-btn--primary:hover:not(:disabled) {
  background: var(--is-primary-hover);
}
.is-btn--primary:active:not(:disabled) {
  background: var(--is-primary-active);
}

.is-btn--secondary {
  background: var(--is-surface);
  border-color: var(--is-border-strong);
  color: var(--is-text);
  box-shadow: var(--is-shadow-sm);
}
.is-btn--secondary:hover:not(:disabled) {
  background: var(--is-surface-hover);
  border-color: var(--is-text-tertiary);
}

.is-btn--ghost {
  background: transparent;
  color: var(--is-text-secondary);
}
.is-btn--ghost:hover:not(:disabled) {
  background: var(--is-surface-hover);
  color: var(--is-text);
}

.is-btn--danger {
  background: var(--is-danger);
  color: var(--is-text-inverse);
}
.is-btn--danger:hover:not(:disabled) {
  background: var(--is-danger-hover);
}

.is-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.is-btn:focus-visible {
  box-shadow: var(--is-ring);
}

.is-btn__spinner {
  width: 13px;
  height: 13px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: is-btn-spin 0.7s linear infinite;
}
@keyframes is-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
```

=== FILE: src/ui/ITextField.vue (from line 1) ===
```
<script setup lang="ts">
import { ref, useId } from 'vue'
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    disabled?: boolean
    error?: boolean | string
    size?: 'sm' | 'md'
    prefixIcon?: IconName
    clearable?: boolean
    type?: string
    autofocus?: boolean
    ariaLabel?: string
  }>(),
  { modelValue: '', size: 'md', type: 'text' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'enter'): void
  (e: 'escape'): void
  (e: 'focus', ev: FocusEvent): void
  (e: 'blur', ev: FocusEvent): void
}>()

const id = useId()
const inputEl = ref<HTMLInputElement>()

function onInput(ev: Event) {
  emit('update:modelValue', (ev.target as HTMLInputElement).value)
}
function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Enter') emit('enter')
  if (ev.key === 'Escape') emit('escape')
}
function clear() {
  emit('update:modelValue', '')
  inputEl.value?.focus()
}
defineExpose({ focus: () => inputEl.value?.focus(), select: () => inputEl.value?.select() })
</script>

<template>
  <div
    class="is-field"
    :class="[`is-field--${size}`, { 'is-field--error': !!error, 'is-field--disabled': disabled }]"
  >
    <IIcon v-if="prefixIcon" :name="prefixIcon" :size="14" class="is-field__prefix" />
    <input
      :id="id"
      ref="inputEl"
      class="is-field__input"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="ariaLabel ?? placeholder"
      :aria-invalid="!!error || undefined"
      :autofocus="autofocus || undefined"
      @input="onInput"
      @keydown="onKeydown"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
    <button
      v-if="clearable && modelValue && !disabled"
      type="button"
      class="is-field__clear"
      aria-label="清除"
      @click="clear"
    >
      <IIcon name="close" :size="11" />
    </button>
  </div>
</template>

<style scoped>
.is-field {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  padding: 0 10px;
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease);
}
.is-field--md {
  height: 32px;
}
.is-field--sm {
  height: 28px;
  padding: 0 8px;
}
.is-field:focus-within {
  border-color: var(--is-accent);
  box-shadow: 0 0 0 2px rgba(46, 91, 255, 0.14);
}
.is-field--error,
.is-field--error:focus-within {
  border-color: var(--is-danger);
}
.is-field--error:focus-within {
  box-shadow: 0 0 0 3px rgba(217, 45, 32, 0.18);
}
.is-field--disabled {
  background: var(--is-surface-hover);
  opacity: 0.6;
}
.is-field__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--is-text-sm);
  height: 100%;
}
.is-field--sm .is-field__input {
  font-size: var(--is-text-xs);
}
.is-field__prefix {
  color: var(--is-text-tertiary);
}
.is-field__clear {
  display: inline-flex;
  color: var(--is-text-tertiary);
  border-radius: 50%;
  padding: 2px;
}
.is-field__clear:hover {
  color: var(--is-text);
  background: var(--is-surface-hover);
}
</style>
```

=== FILE: src/ui/ISelect.vue (from line 159) ===
```
<template>
  <div ref="rootEl" class="is-select" :class="[`is-select--${size}`, `is-select--${variant}`, { 'is-select--open': open }]">
    <button
      type="button"
      class="is-select__trigger"
      :disabled="disabled"
      role="combobox"
      :aria-expanded="open"
      :aria-label="ariaLabel ?? placeholder"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <IIcon v-if="selected?.icon" :name="selected.icon" :size="14" class="is-select__trigger-icon" />
      <span class="is-select__value is-ellipsis" :class="{ 'is-select__value--placeholder': !selected }">
        {{ selected?.label ?? placeholder ?? '请选择' }}
      </span>
      <IIcon name="chevron-down" :size="13" class="is-select__chevron" />
    </button>

    <Teleport to="body">
      <Transition name="is-select-panel">
        <div
          v-if="open"
          ref="panelEl"
          class="is-select__panel"
          :style="panelStyle"
          data-is-floating="1"
          role="presentation"
          @click.stop
        >
          <div v-if="searchable" class="is-select__search">
            <input
              ref="searchEl"
              v-model="query"
              class="is-select__search-input"
              type="text"
              placeholder="搜索…"
              aria-label="搜索选项"
              @keydown="onListKeydown"
            />
          </div>
          <div ref="listEl" class="is-select__list" role="listbox" :aria-activedescendant="undefined">
            <template v-for="(opt, i) in filtered" :key="String(opt.value)">
              <div v-if="showGroupHeader(i)" class="is-select__group">{{ opt.group }}</div>
              <button
                type="button"
                class="is-select__option"
                :class="{ 'is-select__option--active': i === activeIndex, 'is-select__option--selected': opt.value === modelValue }"
                role="option"
                :aria-selected="opt.value === modelValue"
                :disabled="opt.disabled"
                @click="selectAt(i)"
                @mousemove="activeIndex = i"
              >
                <IIcon v-if="opt.icon" :name="opt.icon" :size="14" />
                <span class="is-ellipsis">{{ opt.label }}</span>
                <IIcon v-if="opt.value === modelValue" name="check" :size="13" class="is-select__check" />
              </button>
            </template>
            <div v-if="!filtered.length" class="is-select__empty">无匹配选项</div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.is-select {
  position: relative;
  display: inline-block;
  min-width: 0;
}
.is-select__trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  padding: 0 10px;
  font-size: var(--is-text-sm);
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.is-select--md .is-select__trigger {
  height: 32px;
}
.is-select--sm .is-select__trigger {
  height: 28px;
  font-size: var(--is-text-xs);
}
/* ghost：无框文字下拉，仅 hover 浅灰底 */
.is-select--ghost .is-select__trigger {
  border-color: transparent;
  background: transparent;
  padding: 0 6px;
  font-weight: 500;
  width: auto;
}
.is-select--ghost .is-select__trigger:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.is-select--ghost.is-select--open .is-select__trigger,
.is-select--ghost .is-select__trigger:focus-visible {
  border-color: transparent;
  box-shadow: none;
  background: var(--is-surface-hover);
}
.is-select__trigger:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.is-select--open .is-select__trigger,
.is-select__trigger:focus-visible {
  border-color: var(--is-accent);
  box-shadow: 0 0 0 2px rgba(46, 91, 255, 0.14);
}
.is-select__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.is-select__trigger-icon {
  color: var(--is-text-secondary);
}
.is-select__value {
  flex: 1;
  text-align: left;
}
.is-select__value--placeholder {
  color: var(--is-text-tertiary);
}
.is-select__chevron {
  color: var(--is-text-tertiary);
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.is-select--open .is-select__chevron {
  transform: rotate(180deg);
}

.is-select__panel {
  /* position/top/left from teleported fixed style */
  width: max-content;
  max-width: min(320px, calc(100vw - 16px));
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
  overflow: hidden;
}
.is-select__search {
  padding: 6px;
  border-bottom: 1px solid var(--is-border);
}
.is-select__search-input {
  width: 100%;
  height: 26px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  padding: 0 8px;
  font-size: var(--is-text-xs);
  outline: none;
}
.is-select__search-input:focus {
  border-color: var(--is-accent);
}
.is-select__list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}
.is-select__group {
  padding: 6px 8px 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.is-select__option {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
}
.is-select__option--active {
  background: var(--is-accent-soft);
}
.is-select__option--selected {
  color: var(--is-accent);
  font-weight: 500;
}
.is-select__option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.is-select__check {
  margin-left: auto;
}
.is-select__empty {
  padding: 12px;
  text-align: center;
  color: var(--is-text-tertiary);
  font-size: var(--is-text-xs);
}

.is-select-panel-enter-active,
.is-select-panel-leave-active {
  transition:
    opacity var(--is-dur-fast) var(--is-ease),
    transform var(--is-dur-fast) var(--is-ease);
  transform-origin: top left;
}
.is-select-panel-enter-from,
.is-select-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
```

=== FILE: src/ui/IToggle.vue (from line 1) ===
```
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label?: string
    disabled?: boolean
  }>(),
  {},
)

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <label class="is-toggle" :class="{ 'is-toggle--disabled': disabled }">
    <button
      type="button"
      class="is-toggle__track"
      :class="{ 'is-toggle__track--on': modelValue }"
      role="switch"
      :aria-checked="modelValue"
      :aria-label="label"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="is-toggle__thumb" />
    </button>
    <span v-if="label || $slots.default" class="is-toggle__label"><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.is-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.is-toggle--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.is-toggle__track {
  position: relative;
  width: 34px;
  height: 20px;
  border-radius: var(--is-radius-full);
  background: var(--is-border-strong);
  transition: background-color var(--is-dur-fast) var(--is-ease);
  flex-shrink: 0;
}
.is-toggle__track--on {
  background: var(--is-accent);
}
.is-toggle__track:focus-visible {
  box-shadow: var(--is-ring);
}
.is-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--is-shadow-sm);
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.is-toggle__track--on .is-toggle__thumb {
  transform: translateX(14px);
}
.is-toggle__label {
  font-size: var(--is-text-sm);
}
</style>
```

=== FILE: src/ui/IBadge.vue (from line 1) ===
```
<script setup lang="ts">
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

export type BadgeTone = 'gray' | 'blue' | 'green' | 'yellow' | 'red'

/** 过滤/转换 chip 与小徽标。 */
withDefaults(
  defineProps<{
    tone?: BadgeTone
    icon?: IconName
    removable?: boolean
    clickable?: boolean
  }>(),
  { tone: 'gray' },
)

const emit = defineEmits<{ (e: 'remove'): void; (e: 'click'): void }>()
</script>

<template>
  <span
    class="is-badge"
    :class="[`is-badge--${tone}`, { 'is-badge--clickable': clickable }]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="clickable && emit('click')"
    @keydown.enter="clickable && emit('click')"
  >
    <IIcon v-if="icon" :name="icon" :size="12" />
    <span class="is-ellipsis"><slot /></span>
    <button
      v-if="removable"
      type="button"
      class="is-badge__remove"
      aria-label="移除"
      @click.stop="emit('remove')"
    >
      <IIcon name="close" :size="10" />
    </button>
  </span>
</template>

<style scoped>
.is-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: var(--is-radius-full);
  font-size: var(--is-text-xs);
  font-weight: 500;
  border: 1px solid transparent;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.is-badge--gray {
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
  border-color: var(--is-border);
}
.is-badge--blue {
  background: var(--is-accent-soft);
  color: var(--is-accent);
  border-color: #d3dfff;
}
.is-badge--green {
  background: var(--is-success-soft);
  color: var(--is-success);
  border-color: #cdeede;
}
.is-badge--yellow {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
  border-color: #f3e3b3;
}
.is-badge--red {
  background: var(--is-danger-soft);
  color: var(--is-danger);
  border-color: #f6d2ce;
}
.is-badge--clickable {
  cursor: pointer;
}
.is-badge--clickable:hover {
  filter: brightness(0.96);
}
.is-badge__remove {
  display: inline-flex;
  padding: 1px;
  border-radius: 50%;
  color: inherit;
  opacity: 0.7;
}
.is-badge__remove:hover {
  opacity: 1;
  background: rgba(16, 24, 40, 0.1);
}
</style>
```

=== FILE: src/ui/IFieldCapsule.vue (from line 1) ===
```
<script setup lang="ts">
import IIcon from './IIcon.vue'
import type { DataType } from '../shared/types'

/** 字段胶囊：Aa/# 类型图标 + 名称 + 可选齿轮 + ×（图表映射槽位用）。 */
const props = withDefaults(
  defineProps<{
    name: string
    dataType?: DataType
    /** 聚合显示（如 'Average of Concentration'）。 */
    aggregation?: string
    removable?: boolean
    configurable?: boolean
    active?: boolean
  }>(),
  { dataType: 'string' },
)

const emit = defineEmits<{ (e: 'remove'): void; (e: 'configure'): void; (e: 'click'): void }>()
</script>

<template>
  <span
    class="is-capsule"
    :class="{ 'is-capsule--active': active }"
    :title="`${name}（${dataType}）`"
    role="button"
    tabindex="0"
    @click="emit('click')"
    @keydown.enter="emit('click')"
  >
    <IIcon
      :name="dataType === 'number' ? 'type-number' : 'type-text'"
      :size="13"
      class="is-capsule__type"
    />
    <span class="is-capsule__name is-ellipsis">
      <template v-if="aggregation">{{ aggregation }} of </template>{{ name }}
    </span>
    <button
      v-if="configurable"
      type="button"
      class="is-capsule__action"
      aria-label="字段设置"
      @click.stop="emit('configure')"
    >
      <IIcon name="sliders" :size="12" />
    </button>
    <button
      v-if="removable"
      type="button"
      class="is-capsule__action"
      aria-label="移除字段"
      @click.stop="emit('remove')"
    >
      <IIcon name="close" :size="11" />
    </button>
  </span>
</template>

<style scoped>
.is-capsule {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 3px 8px;
  background: var(--is-surface-hover);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-xs);
  color: var(--is-text);
  cursor: default;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.is-capsule:hover {
  background: #e9edf3;
  border-color: var(--is-border-strong);
}
.is-capsule--active {
  border-color: var(--is-accent);
  background: var(--is-accent-soft);
}
.is-capsule__type {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.is-capsule__name {
  min-width: 0;
}
.is-capsule__action {
  display: inline-flex;
  padding: 2px;
  border-radius: 3px;
  color: var(--is-text-tertiary);
  flex-shrink: 0;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.is-capsule__action:hover {
  background: rgba(16, 24, 40, 0.08);
  color: var(--is-text);
}
</style>
```

=== FILE: src/ui/IIcon.vue (from line 1) ===
```
<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number
  }>(),
  { size: 14 },
)

const def = computed(() => ICONS[props.name])
</script>

<template>
  <svg
    class="is-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <text
      v-if="def.kind === 'text'"
      x="12"
      y="16.5"
      text-anchor="middle"
      fill="currentColor"
      :font-size="name === 'type-number' ? 15 : 12"
      font-weight="600"
      font-family="var(--is-font)"
      >{{ def.text }}</text
    >
    <g
      v-else-if="def.kind === 'stroke'"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      v-html="def.content"
    />
    <g v-else fill="currentColor" v-html="def.content" />
  </svg>
</template>

<style scoped>
.is-icon {
  display: inline-block;
  vertical-align: -2px;
  flex-shrink: 0;
}
</style>
```
