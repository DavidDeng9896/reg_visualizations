
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

=== FILE: src/modules/workspace/WorkspaceMain.vue (from line 1) ===
```
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IEmptyState } from '../../ui'
import TableChartWorkspace from '../table/TableChartWorkspace.vue'

/** 工作区主区：选中表/视图 → 表+图一体化工作区（切片 S2 表格）。 */
const store = useAnalysisStore()
const { selected } = storeToRefs(store)
</script>

<template>
  <div class="workspace-main">
    <IEmptyState
      v-if="!selected"
      icon="database"
      title="从左侧选择一张表或视图"
      description="或通过右上角 Add data 导入数据、合并表。"
    />
    <TableChartWorkspace v-else :key="`${selected.tableId}:${selected.viewId ?? ''}`" />
  </div>
</template>

<style scoped>
.workspace-main {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
```

=== FILE: src/modules/table/TableChartWorkspace.vue (from line 224) ===
```
<template>
  <div ref="rootEl" class="tcw">
    <!-- 标题栏 -->
    <header v-if="view" class="tcw__head">
      <span class="tcw__head-title is-ellipsis">{{ view.name }}</span>
      <IButton
        v-if="hasChart"
        variant="ghost"
        size="sm"
        :icon="tableCollapsed ? 'table' : 'eye-off'"
        :title="tableCollapsed ? '显示源表' : '隐藏源表'"
        @click="toggleTableCollapsed"
      >
        {{ tableCollapsed ? '显示源表' : '隐藏源表' }}
      </IButton>
      <IPopover v-if="hasChart" :open="positionOpen" placement="bottom-end" :arrow="false" @update:open="positionOpen = $event">
        <template #anchor>
          <IButton variant="ghost" size="sm" icon="columns" title="图表位置" @click="positionOpen = !positionOpen">
            图表位置
          </IButton>
        </template>
        <template #default>
          <div class="tcw__menu" role="menu">
            <button
              v-for="p in POSITIONS"
              :key="p.value"
              type="button"
              class="tcw__menu-item"
              :class="{ 'tcw__menu-item--active': chartPosition === p.value }"
              role="menuitemradio"
              :aria-checked="chartPosition === p.value"
              @click="setPosition(p.value)"
            >
              <IIcon :name="p.icon" :size="13" /> {{ p.label }}
              <IIcon v-if="chartPosition === p.value" name="check" :size="12" class="tcw__menu-check" />
            </button>
          </div>
        </template>
      </IPopover>
      <IPopover :open="menuOpen" placement="bottom-end" :arrow="false" @update:open="menuOpen = $event">
        <template #anchor>
          <IButton variant="ghost" icon="more" size="sm" aria-label="视图菜单" @click="menuOpen = !menuOpen" />
        </template>
        <template #default="{ close }">
          <div class="tcw__menu" role="menu">
            <button type="button" class="tcw__menu-item" role="menuitem" @click="close(); openRename()">
              <IIcon name="edit" :size="13" /> 重命名
            </button>
            <button type="button" class="tcw__menu-item" role="menuitem" @click="close(); promote()">
              <IIcon name="level-up" :size="13" /> 提升为表
            </button>
            <button type="button" class="tcw__menu-item" role="menuitem" @click="close(); exportCsv()">
              <IIcon name="download" :size="13" /> 导出 CSV
            </button>
            <button type="button" class="tcw__menu-item tcw__menu-item--danger" role="menuitem" @click="close(); deleteView()">
              <IIcon name="trash" :size="13" /> 删除视图
            </button>
          </div>
        </template>
      </IPopover>
    </header>

    <div v-if="degraded" class="tcw__notice">
      <IIcon name="info" :size="13" /> 屏幕较窄，左右布局已自动调整为上下排列
    </div>

    <div v-if="pipelineError" class="tcw__error">
      <IIcon name="warning" :size="14" /> {{ pipelineError }}
    </div>

    <!-- 主体 -->
    <div v-if="result && selected" class="tcw__body" data-mount="table-chart">
      <!-- 图表视图且已收起源表：全幅图表 -->
      <div v-if="hasChart && tableCollapsed" class="tcw__chart tcw__chart--solo" data-mount="chart-panel">
        <ChartView />
      </div>

      <ISplitPane
        v-else-if="hasChart"
        :key="splitKey"
        :direction="splitDirection"
        :default-ratio="0.55"
        :min-first="200"
        :min-second="200"
        :storage-key="splitKey"
      >
        <template #first>
          <div v-if="chartFirst" class="tcw__chart" data-mount="chart-panel">
            <ChartView />
          </div>
          <DataGrid v-else :table-id="selected.tableId" :view-id="selected.viewId" :result="result" />
        </template>
        <template #second>
          <DataGrid v-if="chartFirst" :table-id="selected.tableId" :view-id="selected.viewId" :result="result" />
          <div v-else class="tcw__chart" data-mount="chart-panel">
            <ChartView />
          </div>
        </template>
      </ISplitPane>

      <div v-else class="tcw__grid-only" data-mount="table">
        <DataGrid :table-id="selected.tableId" :view-id="selected.viewId" :result="result" />
      </div>
    </div>
  </div>

  <!-- 重命名视图 -->
  <IModal :open="renameOpen" title="重命名视图" :width="400" @update:open="renameOpen = $event">
    <ITextField v-model="renameName" autofocus @enter="submitRename" />
    <template #footer>
      <IButton @click="renameOpen = false">取消</IButton>
      <IButton variant="primary" :disabled="!renameName.trim()" @click="submitRename">保存</IButton>
    </template>
  </IModal>
</template>

<style scoped>
.tcw {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px 16px;
  gap: 8px;
}
.tcw__head {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}
.tcw__head-title {
  margin-right: auto;
  font-size: var(--is-text-md);
  font-weight: 600;
}
.tcw__menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 170px;
}
.tcw__menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
  white-space: nowrap;
}
.tcw__menu-item:hover {
  background: var(--is-surface-hover);
}
.tcw__menu-item--active {
  color: var(--is-accent);
}
.tcw__menu-item--danger {
  color: var(--is-danger);
}
.tcw__menu-item--danger:hover {
  background: var(--is-danger-soft);
}
.tcw__menu-check {
  margin-left: auto;
}
.tcw__notice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--is-text-xs);
  color: var(--is-warning-text);
  background: var(--is-warning-bg);
  border-radius: var(--is-radius-sm);
  padding: 6px 10px;
}
.tcw__error {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--is-text-sm);
  color: var(--is-danger);
  background: var(--is-danger-soft);
  border-radius: var(--is-radius-sm);
  padding: 8px 12px;
}
.tcw__body {
  flex: 1;
  min-height: 0;
}
.tcw__grid-only {
  height: 100%;
}
.tcw__chart {
  height: 100%;
  min-height: 0;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  overflow: hidden;
  padding: 8px;
}
.tcw__chart--solo {
  width: 100%;
}
.tcw__chart-hint {
  font-size: var(--is-text-sm);
  color: var(--is-text-tertiary);
  padding: 16px;
  text-align: center;
}
</style>
```

=== FILE: src/modules/table/DataGrid.vue (from line 802) ===
```
<template>
  <div class="dg" @keydown="onWrapperKeydown" @copy="onCopy" @paste="onPaste">
    <!-- 工具栏 -->
    <header class="dg__toolbar">
      <div class="dg__title-group">
        <IIcon :name="view ? 'table' : 'database'" :size="15" class="dg__title-icon" />
        <h2 class="dg__title is-ellipsis" :title="title">{{ title }}</h2>
        <IBadge tone="gray">{{ kindLabel }}</IBadge>
        <span class="dg__stats" data-testid="grid-stats">{{ statsText }}</span>
      </div>
      <div class="dg__actions">
        <ITooltip content="撤销 (Ctrl/⌘+Z)">
          <IButton variant="ghost" icon="undo" size="sm" :disabled="!canUndo" aria-label="撤销" data-testid="undo-btn" @click="store.undo()" />
        </ITooltip>
        <ITooltip content="重做 (Ctrl/⌘+Shift+Z)">
          <IButton variant="ghost" icon="redo" size="sm" :disabled="!canRedo" aria-label="重做" @click="store.redo()" />
        </ITooltip>
        <span class="dg__sep" />
        <IPopover :open="colVisibilityOpen" placement="bottom-end" @update:open="colVisibilityOpen = $event">
          <template #anchor>
            <IButton variant="ghost" icon="columns" size="sm" title="列显隐" aria-label="列显隐" @click="colVisibilityOpen = !colVisibilityOpen" />
          </template>
          <template #default>
            <div class="dg__colvis">
              <ITextField v-model="colVisSearch" size="sm" placeholder="搜索列…" prefix-icon="search" clearable />
              <div class="dg__colvis-list">
                <label v-for="c in colVisList" :key="c.field" class="dg__colvis-item">
                  <input type="checkbox" :checked="!hiddenCols.has(c.field)" @change="toggleColumn(c.field)" />
                  <IIcon :name="c.dataType === 'number' ? 'type-number' : 'type-text'" :size="12" class="dg__typeicon" />
                  <span class="is-ellipsis">{{ c.title }}</span>
                </label>
                <div v-if="!colVisList.length" class="dg__colvis-empty">无匹配列</div>
              </div>
            </div>
          </template>
        </IPopover>
        <ITooltip content="导出 CSV">
          <IButton variant="ghost" icon="download" size="sm" aria-label="导出 CSV" @click="exportCsv" />
        </ITooltip>
        <ITooltip :content="showSelection ? '关闭行选择' : '开启行选择'">
          <IButton
            variant="ghost"
            icon="check"
            size="sm"
            :aria-pressed="showSelection"
            :class="{ 'dg__action--on': showSelection }"
            aria-label="行选择开关"
            @click="showSelection = !showSelection"
          />
        </ITooltip>
        <IButton variant="primary" size="sm" icon="bar" @click="createChart">创建图表</IButton>
      </div>
    </header>

    <!-- FILTERS & TRANSFORMS -->
    <div class="dg__ft">
      <span class="dg__ft-label">FILTERS & TRANSFORMS</span>
      <IBadge
        v-for="f in inheritedFilters"
        :key="f.id"
        tone="gray"
        icon="filter"
        :title="`表级过滤（在源表上编辑）：${filterSummary(f, result.columns)}`"
      >
        表级 · {{ filterSummary(f, result.columns) }}
      </IBadge>
      <IBadge
        v-for="f in targetFilters"
        :key="f.id"
        tone="blue"
        icon="filter"
        clickable
        removable
        @click="openFilterDialog(f)"
        @remove="removeFilterCommit(f.id)"
      >
        {{ filterSummary(f, result.columns) }}
      </IBadge>
      <IBadge
        v-for="t in targetTransforms"
        :key="t.id"
        tone="green"
        icon="gear"
        clickable
        removable
        @click="openTransformDialog(t)"
        @remove="removeTransformCommit(t.id)"
      >
        {{ transformSummary(t) }}
      </IBadge>
      <button type="button" class="dg__ft-add" @click="openFilterDialog(null)">
        <IIcon name="plus" :size="12" /> Add filter
      </button>
      <IPopover v-if="view" :open="transformPickerOpen" placement="bottom-start" :arrow="false" @update:open="transformPickerOpen = $event">
        <template #anchor>
          <button type="button" class="dg__ft-add" @click="transformPickerOpen = !transformPickerOpen">
            <IIcon name="plus" :size="12" /> Transform
          </button>
        </template>
        <template #default="{ close }">
          <div class="dg__menu" role="menu">
            <button
              v-for="tt in TRANSFORM_TYPES"
              :key="tt"
              type="button"
              class="dg__menu-item"
              role="menuitem"
              @click="close(); openTransformDialog(null, tt)"
            >
              {{ TRANSFORM_TYPE_LABELS[tt] }}
            </button>
          </div>
        </template>
      </IPopover>
      <span v-else class="dg__ft-hint">转换仅在视图上可用</span>
    </div>

    <!-- 只读 banner -->
    <div v-if="view && editMode === 'none'" class="dg__banner">
      <IIcon name="info" :size="14" />
      <span>该视图包含改变行集的转换，提升为表后可编辑</span>
      <IButton size="sm" variant="secondary" icon="level-up" @click="promote">提升为表</IButton>
