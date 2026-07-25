
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

=== FILE: src/modules/workspace/SidebarTree.vue (from line 229) ===
```
<template>
  <aside class="sidebar">
    <div class="sidebar__search">
      <ITextField v-model="search" placeholder="Search" prefix-icon="search" clearable size="md" />
    </div>

    <div class="sidebar__section">
      <div class="sidebar__section-head">
        <span class="sidebar__section-title">Analysis data</span>
        <button type="button" class="sidebar__add" aria-label="添加数据" title="Add data" @click="emit('add-data')">
          <IIcon name="plus" :size="13" />
        </button>
      </div>

      <div class="sidebar__tree" role="tree">
        <div v-if="!visibleTables.length" class="sidebar__empty">
          {{ search ? '无匹配结果' : '还没有数据，点击 Add data 开始' }}
        </div>

        <div v-for="t in visibleTables" :key="t.id" class="tnode">
          <div
            class="tnode__row"
            :class="{ 'tnode__row--selected': selected?.kind === 'table' && selected.tableId === t.id }"
            role="treeitem"
            data-testid="sidebar-table"
            :data-name="t.name"
            :aria-expanded="isTableExpanded(t)"
            :aria-selected="selected?.kind === 'table' && selected.tableId === t.id"
            tabindex="0"
            @click="selectTable(t.id)"
            @keydown.enter="selectTable(t.id)"
          >
            <button
              type="button"
              class="tnode__chevron"
              :aria-label="isTableExpanded(t) ? '收起' : '展开'"
              @click.stop="toggleTable(t.id)"
            >
              <IIcon :name="isTableExpanded(t) ? 'chevron-down' : 'chevron-right'" :size="12" />
            </button>
            <IIcon :name="t.source === 'combine' ? 'combine' : 'database'" :size="14" class="tnode__icon" />
            <span class="tnode__name is-ellipsis" :title="t.name">{{ t.name }}</span>
            <span class="tnode__actions">
              <button
                type="button"
                class="tnode__action"
                aria-label="在流程图中定位"
                title="在流程图中定位"
                @click.stop="showInFlowchart(t.id)"
              >
                <IIcon name="flowchart" :size="12" />
              </button>
              <button
                type="button"
                class="tnode__action"
                aria-label="新建视图"
                title="新建视图"
                @click.stop="openPicker(t.id, null)"
              >
                <IIcon name="plus" :size="12" />
              </button>
              <IPopover :open="menuFor === t.id" placement="bottom-end" :arrow="false" @update:open="setMenu($event ? t.id : null)">
                <template #anchor>
                  <button
                    type="button"
                    class="tnode__action"
                    aria-label="更多操作"
                    @click.stop="setMenu(menuFor === t.id ? null : t.id)"
                  >
                    <IIcon name="more" :size="13" />
                  </button>
                </template>
                <template #default="{ close }">
                  <div class="menu" role="menu">
                    <button type="button" class="menu__item" role="menuitem" @click.stop="close(); showInFlowchart(t.id)">
                      <IIcon name="flowchart" :size="13" /> 在流程图中显示
                    </button>
                    <button type="button" class="menu__item" role="menuitem" @click.stop="close(); openTableRename(t)">
                      <IIcon name="edit" :size="13" /> 重命名
                    </button>
                    <button type="button" class="menu__item" role="menuitem" @click.stop="close(); openPicker(t.id, null)">
                      <IIcon name="plus" :size="13" /> 新建视图
                    </button>
                    <button type="button" class="menu__item menu__item--danger" role="menuitem" @click.stop="close(); askDeleteTable(t)">
                      <IIcon name="trash" :size="13" /> 删除
                    </button>
                  </div>
                </template>
              </IPopover>
            </span>
          </div>

          <div v-if="isTableExpanded(t)" role="group">
            <SidebarTreeNode
              v-for="v in filterViews(t.views, search.trim().toLowerCase())"
              :key="v.id"
              :node="v"
              :table-id="t.id"
              :depth="1"
              :expanded="expanded"
              :selected-view-id="selected?.kind === 'view' ? selected.viewId : undefined"
              :editing-id="editingId"
              :menu-for="menuFor"
              @toggle="toggle"
              @select="selectView"
              @menu="setMenu"
              @rename="commitRename"
              @rename-start="startRename"
              @rename-cancel="cancelRename"
              @delete="(id: string, name: string) => askDeleteView(t.id, id, name)"
              @new-view="openPicker"
              @show-in-flowchart="showInFlowchart"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar__footer">
      <IButton variant="ghost" icon="link" size="sm" @click="connectExternal">
        Connect with external tool
      </IButton>
    </div>

    <!-- 节点类型选择（tiles） -->
    <IPopover
      :open="!!pickerFor"
      placement="right-start"
      :arrow="true"
      @update:open="!$event && (pickerFor = null)"
    >
      <template #anchor><span class="sidebar__picker-anchor" /></template>
      <div class="picker">
        <div v-for="group in TILE_GROUPS" :key="group.title" class="picker__group">
          <div class="picker__group-title">{{ group.title }}</div>
          <div class="picker__tiles">
            <button
              v-for="item in group.items"
              :key="item.type"
              type="button"
              class="picker__tile"
              :data-testid="`picker-${item.type}`"
              @click="pickViewType(item.type)"
            >
              <IIcon :name="item.icon" :size="18" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </IPopover>

    <!-- 表重命名 -->
    <IModal :open="tableRenameOpen" title="重命名表" :width="400" @update:open="tableRenameOpen = $event">
      <ITextField v-model="tableRenameName" autofocus @enter="submitTableRename" />
      <template #footer>
        <IButton @click="tableRenameOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!tableRenameName.trim()" @click="submitTableRename">保存</IButton>
      </template>
    </IModal>

    <!-- 删除确认 -->
    <IModal :open="deleteOpen" title="删除确认" :width="420" @update:open="deleteOpen = $event">
      <p class="confirm-text">
        确定删除「{{ pendingDelete?.name }}」吗？{{ pendingDelete?.kind === 'table' ? '其下所有视图' : '其所有子视图' }}将一并删除，此操作不可撤销。
      </p>
      <template #footer>
        <IButton @click="deleteOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmDelete">删除</IButton>
      </template>
    </IModal>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 260px;
  min-width: 260px;
  height: 100%;
  background: var(--is-surface);
  border-right: 1px solid var(--is-border);
  position: relative;
}
.sidebar__search {
  padding: 12px 12px 8px;
}
.sidebar__section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.sidebar__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
}
.sidebar__section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
}
.sidebar__add {
  display: inline-flex;
  padding: 4px;
  border-radius: 4px;
  color: var(--is-text-secondary);
}
.sidebar__add:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.sidebar__tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 16px;
}
.sidebar__empty {
  padding: 24px 12px;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  text-align: center;
}
.sidebar__footer {
  border-top: 1px solid var(--is-border);
  padding: 10px 12px;
}
.sidebar__picker-anchor {
  position: absolute;
  left: 0;
  top: 120px;
}

.tnode__row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 4px 0 8px;
  border-radius: var(--is-radius-sm);
  cursor: pointer;
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.tnode__row:hover {
  background: var(--is-surface-hover);
}
.tnode__row--selected,
.tnode__row--selected:hover {
  background: var(--is-accent-soft);
}
.tnode__row--selected .tnode__name {
  color: var(--is-accent);
  font-weight: 500;
}
.tnode__chevron {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  color: var(--is-text-tertiary);
  border-radius: 3px;
  flex-shrink: 0;
}
.tnode__icon {
  color: var(--is-text-secondary);
  flex-shrink: 0;
}
.tnode__name {
  flex: 1;
  min-width: 0;
  font-size: var(--is-text-sm);
  font-weight: 500;
}
.tnode__actions {
  display: none;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.tnode__row:hover .tnode__actions,
.tnode__row:focus-within .tnode__actions {
  display: inline-flex;
}
.tnode__action {
  display: inline-flex;
  padding: 3px;
  border-radius: 4px;
  color: var(--is-text-tertiary);
}
.tnode__action:hover {
  background: rgba(16, 24, 40, 0.08);
  color: var(--is-text);
}

.menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 140px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
}
.menu__item:hover {
  background: var(--is-surface-hover);
}
.menu__item--danger {
  color: var(--is-danger);
}
.menu__item--danger:hover {
  background: var(--is-danger-soft);
}

.picker {
  padding: 12px;
  width: 300px;
}
.picker__group + .picker__group {
  margin-top: 12px;
}
.picker__group-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
  margin-bottom: 6px;
}
.picker__tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.picker__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  background: var(--is-surface);
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.picker__tile:hover {
  border-color: var(--is-accent);
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.confirm-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.6;
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
