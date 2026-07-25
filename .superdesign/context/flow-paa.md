
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
