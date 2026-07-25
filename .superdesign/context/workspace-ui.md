
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
    </div>

    <!-- 采样警告 -->
    <div v-if="result.sampled" class="dg__banner dg__banner--warn">
      <IIcon name="warning" :size="14" />
      <span>Showing a random sample of {{ result.rows.length.toLocaleString() }} rows out of {{ result.totalRows.toLocaleString() }}</span>
      <button type="button" class="dg__banner-link" @click="exportCsv">Download</button>
    </div>

    <!-- 网格 -->
    <div class="dg__gridwrap">
      <IEmptyState
        v-if="result.columns.length === 0"
        icon="table"
        title="暂无列"
        description="该表没有任何列。导入 CSV 或合并表以获取数据。"
      />
      <VxeTable
        v-else
        ref="gridRef"
        class="dg__grid"
        :data="displayedRows"
        height="100%"
        :auto-resize="true"
        border="none"
        :show-header="true"
        :row-config="{ keyField: ROW_ID_FIELD, isHover: true }"
        :column-config="{ resizable: true }"
        :scroll-y="{ enabled: true, gt: 500 }"
        :edit-config="editConfig"
        :keyboard-config="editable ? keyboardConfig : undefined"
        :mouse-config="editable ? mouseConfig : undefined"
        :cell-class-name="cellClassName"
        @cell-click="onCellClick"
        @cell-context-menu="onCellContextMenu"
        @edit-activated="onEditActived"
        @edit-closed="onEditClosed"
      >
        <VxeColumn v-if="showSelection" type="checkbox" width="40" fixed="left" />
        <VxeColumn type="seq" width="52" fixed="left" title="#" />
        <VxeColumn
          v-for="col in visibleColumns"
          :key="col.field"
          :field="col.field"
          :title="col.title"
          :min-width="120"
          :edit-render="editable ? {} : undefined"
        >
          <template #header>
            <div class="dg__th" @contextmenu.prevent="openColumnMenu(col.field, $event)">
              <IIcon
                :name="col.dataType === 'number' ? 'type-number' : col.dataType === 'date' || col.dataType === 'datetime' ? 'calendar' : 'type-text'"
                :size="13"
                class="dg__typeicon"
              />
              <span class="dg__th-name is-ellipsis" :title="col.title">{{ col.title }}</span>
              <IIcon
                v-if="sortInfo?.field === col.field"
                :name="sortInfo.direction === 'asc' ? 'sort-asc' : 'sort-desc'"
                :size="12"
                class="dg__th-sort"
              />
              <!-- 列筛选漏斗（弹层为全局单例，见下方 Teleport） -->
              <button
                type="button"
                class="dg__th-btn"
                :class="{ 'dg__th-btn--active': !!columnFilterOf(col.field) || colFilterFor === col.field }"
                :aria-label="`筛选 ${col.title}`"
                title="筛选此列"
                @click.stop="openColumnFilter(col.field, $event)"
              >
                <IIcon name="filter" :size="12" />
              </button>
              <!-- 列菜单触发 -->
              <button
                type="button"
                class="dg__th-btn dg__th-btn--menu"
```

=== FILE: src/modules/charts/ChartPanel.vue (from line 197) ===
```
<template>
  <div
    ref="el"
    class="chart-panel"
    :class="{ 'chart-panel--flagging': flagMode !== 'off' }"
    :style="{
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : '100%',
      maxWidth: '100%',
    }"
  />
</template>

<style scoped>
.chart-panel {
  min-height: 0;
  min-width: 0;
  transition: opacity var(--is-dur-fast) var(--is-ease);
}
.chart-panel--flagging {
  cursor: crosshair;
}
</style>
```

=== FILE: src/modules/charts/ChartView.vue (from line 400) ===
```
<template>
  <div class="cview">
    <div class="cview__main">
      <!-- 采样警告条 -->
      <div v-if="sampling.sampled" class="cview__notice cview__notice--sample">
        <IIcon name="warning" :size="14" />
        <span>{{ sampling.message }}</span>
        <button type="button" class="cview__notice-link" @click="downloadFull">Download</button>
        <span class="cview__notice-hint">to view the complete data.</span>
      </div>

      <!-- 绑定列消失警告 -->
      <div v-if="missingColumns.length" class="cview__notice cview__notice--missing">
        <IIcon name="warning" :size="14" />
        <span>{{ missingColumns.map((e) => e.message).join('；') }}，请打开配置面板重新绑定</span>
      </div>

      <!-- 构建警告（log 回退 / 拟合失败 / 负值剔除等） -->
      <div v-for="(w, i) in warnings" :key="i" class="cview__notice cview__notice--warn">
        <IIcon name="warning" :size="13" />
        <span>{{ w }}</span>
      </div>

      <!-- 图表区 -->
      <div class="cview__stage">
        <template v-if="!requiredMissing">
          <ChartPanel
            ref="chartRef"
            :option="previewOption"
            :row-count="rowCount"
            :width="chartWidth"
            :height="chartHeight"
            :flag-mode="flagMode"
            class="cview__chart"
            data-testid="chart-canvas"
            @rendered="rebuilding = false"
            @lasso="onLasso"
          />
          <!-- 加载 shimmer -->
          <div v-if="rebuilding" class="cview__loading" aria-hidden="true" />

          <!-- Flag / Clear 工具条（Line/Scatter） -->
          <div v-if="flagCapable" class="cview__flagbar">
            <span v-if="flagCount" class="cview__flagcount" title="已打标点">{{ flagCount }} flagged</span>
            <button
              type="button"
              class="cview__flagbtn"
              :class="{ 'cview__flagbtn--active': flagMode === 'flag' }"
              :aria-pressed="flagMode === 'flag'"
              @click="toggleFlagMode('flag')"
            >
              <IIcon name="flag" :size="13" /> Flag
            </button>
            <button
              type="button"
              class="cview__flagbtn"
              :class="{ 'cview__flagbtn--active': flagMode === 'clear' }"
              :aria-pressed="flagMode === 'clear'"
              @click="toggleFlagMode('clear')"
            >
              <IIcon name="flag" :size="13" /> Clear
            </button>
          </div>

          <!-- 悬停导出 -->
          <div class="cview__export">
            <IPopover :open="exportOpen" placement="bottom-end" :arrow="false" @update:open="exportOpen = $event">
              <template #anchor>
                <IButton size="sm" variant="secondary" icon="download" aria-label="导出图表" @click="exportOpen = !exportOpen" />
              </template>
              <template #default>
                <div class="cview__export-menu" role="menu">
                  <button type="button" role="menuitem" @click="doExport('png')">导出 PNG</button>
                  <button type="button" role="menuitem" @click="doExport('pdf')">导出 PDF</button>
                </div>
              </template>
            </IPopover>
          </div>
        </template>

        <!-- 必填缺失空态 -->
        <IEmptyState
          v-else
          :icon="def.icon"
          title="开始配置图表"
          description="选择 X 轴与 Y 轴字段开始绘图"
        >
          <IButton variant="primary" icon="gear" @click="panelOpen = true">打开配置面板</IButton>
        </IEmptyState>
      </div>

      <!-- 打开配置按钮（面板关闭时） -->
      <button v-if="!panelOpen" type="button" class="cview__open" title="打开配置面板" @click="panelOpen = true">
        <IIcon name="gear" :size="14" />
        配置
      </button>

      <!-- MODEL TABLES 底栏（6G-1） -->
      <ModelTables
        v-if="view"
        :result="result"
        :fits="fits"
        :flags="flags"
        :view-name="view.name"
        :model-selected="regModelActive"
      />
    </div>

    <!-- 右侧配置抽屉（v-show：开合不重建 ECharts） -->
    <Transition name="cview-drawer">
      <div v-show="panelOpen" class="cview__drawer">
        <ChartConfigPanel v-if="view" :view-name="view.name" :chips="chips" @rename="rename" @cancel="cancel" @save="save" />
      </div>
    </Transition>

    <!-- 切换视图 dirty 确认 -->
    <IModal :open="guardOpen" title="未保存的图表修改" :width="420" @update:open="guardCancel">
      <p class="cview__guard-text">当前图表配置有未保存的修改，切换视图前要保存吗？</p>
      <template #footer>
        <IButton @click="guardCancel">取消</IButton>
        <IButton variant="danger" @click="guardDiscard">放弃修改</IButton>
        <IButton variant="primary" @click="guardSave">保存并切换</IButton>
      </template>
    </IModal>

    <!-- Flag 确认（comment 必填） -->
    <IModal :open="flagModalOpen" title="Flag selected points" :width="440" @update:open="flagModalOpen = $event">
      <div class="cview__flagmodal">
        <p class="cview__flagmodal-hint">已选 <b>{{ pendingIds.length }}</b> 个点，打标后显示为 ×；开启 Exclude flagged 后不参与拟合。</p>
        <label class="cview__flagmodal-label">
          Comment <span class="cview__flagmodal-req">*</span>
          <textarea
            v-model="flagCommentInput"
            class="cview__flagmodal-textarea"
            rows="3"
            placeholder="例如：Bad samples /  outliers"
            aria-label="打标备注（必填）"
          />
        </label>
        <ul class="cview__flagmodal-list">
          <li v-for="p in pendingPreview" :key="p.id">
            <span class="cview__flagmodal-coord">x: {{ p.x }}</span>
            <span class="cview__flagmodal-coord">y: {{ p.y }}</span>
          </li>
          <li v-if="pendingIds.length > pendingPreview.length" class="cview__flagmodal-more">… 共 {{ pendingIds.length }} 个</li>
        </ul>
      </div>
      <template #footer>
        <IButton @click="flagModalOpen = false">取消</IButton>
        <IButton variant="primary" icon="flag" :disabled="!flagCommentInput.trim()" @click="confirmFlag">Flag {{ pendingIds.length }} 个点</IButton>
      </template>
    </IModal>

    <!-- Clear 确认 -->
    <IModal :open="clearModalOpen" title="清除打标" :width="400" @update:open="clearModalOpen = $event">
      <p class="cview__guard-text">将移除 <b>{{ pendingIds.length }}</b> 个点的打标（×），确定继续吗？</p>
      <template #footer>
        <IButton @click="clearModalOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmClear">清除 {{ pendingIds.length }} 个打标</IButton>
      </template>
    </IModal>
  </div>
</template>

<style scoped>
.cview {
  height: 100%;
  min-height: 0;
  display: flex;
  position: relative;
}
.cview__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}
.cview__notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
}
.cview__notice--sample {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
}
.cview__notice--missing {
  background: var(--is-danger-soft);
  color: var(--is-danger);
}
.cview__notice--info {
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
  font-size: var(--is-text-xs);
}
.cview__notice--warn {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
}
.cview__flagbar {
  position: absolute;
  top: 8px;
  right: 136px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 5;
}
.cview__flagcount {
  font-size: var(--is-text-xs);
  color: #d92d20;
  font-weight: 600;
  margin-right: 2px;
}
.cview__flagbtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  font-size: var(--is-text-xs);
  font-weight: 500;
  color: var(--is-primary);
  background: var(--is-surface);
  border: 1px solid var(--is-primary);
  border-radius: var(--is-radius-sm);
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.cview__flagbtn:hover {
  background: rgba(30, 42, 120, 0.06);
}
.cview__flagbtn--active {
  background: var(--is-primary);
  color: #fff;
}
.cview__flagmodal {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cview__flagmodal-hint {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
}
.cview__flagmodal-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.cview__flagmodal-req {
  color: var(--is-danger);
}
.cview__flagmodal-textarea {
  width: 100%;
  resize: vertical;
  min-height: 60px;
  padding: 8px 10px;
  font-size: var(--is-text-sm);
  font-family: inherit;
  color: var(--is-text);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  outline: none;
}
.cview__flagmodal-textarea:focus {
  border-color: var(--is-accent);
  box-shadow: var(--is-ring);
}
.cview__flagmodal-list {
  list-style: none;
  margin: 0;
  padding: 6px 8px;
  max-height: 120px;
  overflow-y: auto;
  background: var(--is-surface-hover);
  border-radius: var(--is-radius-sm);
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
}
.cview__flagmodal-coord {
  margin-right: 12px;
}
.cview__flagmodal-more {
  color: var(--is-text-tertiary);
}
.cview__notice-link {
  color: var(--is-accent);
  font-weight: 600;
  text-decoration: underline;
}
.cview__notice-hint {
  color: var(--is-warning-text);
  opacity: 0.8;
}
.cview__stage {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  /* 底部 MODEL TABLES 面板展开会把 stage 压扁：裁掉溢出的绝对定位浮层
     （Flag 工具条 / 导出按钮），避免盖住 tab bar 上的按钮 */
  overflow: hidden;
}
.cview__chart {
  flex: 1;
  min-height: 0;
}
.cview__loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  overflow: hidden;
}
.cview__loading::after {
  content: '';
  display: block;
  height: 100%;
  width: 40%;
  background: var(--is-accent);
  border-radius: 2px;
  animation: cview-shimmer 0.9s var(--is-ease) infinite;
}
@keyframes cview-shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}
.cview__export {
  position: absolute;
  top: 8px;
  right: 92px;
  opacity: 0;
  transition: opacity var(--is-dur-fast) var(--is-ease);
  z-index: 5;
}
.cview__stage:hover .cview__export,
.cview__export:focus-within {
  opacity: 1;
}
.cview__export-menu {
  display: flex;
  flex-direction: column;
  padding: 4px;
  min-width: 120px;
}
.cview__export-menu button {
  text-align: left;
  padding: 7px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
}
.cview__export-menu button:hover {
  background: var(--is-surface-hover);
}
.cview__open {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  box-shadow: var(--is-shadow-sm);
  transition:
    color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.cview__open:hover {
  color: var(--is-text);
  border-color: var(--is-accent);
}
.cview__drawer {
  height: 100%;
  overflow: hidden;
}
.cview-drawer-enter-active,
.cview-drawer-leave-active {
  transition:
    width var(--is-dur) var(--is-ease),
    opacity var(--is-dur) var(--is-ease);
  width: 340px;
}
.cview-drawer-enter-from,
.cview-drawer-leave-to {
  width: 0;
  opacity: 0;
}
.cview__guard-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
}
</style>
```

=== FILE: src/modules/charts/panel/ChartConfigPanel.vue (from line 34) ===
```
<template>
  <aside class="ccpanel" @keydown.esc.stop="emit('cancel')">
    <!-- 头部行：CONFIGURE/STYLE tabs（左）+ 无框 Chart type 下拉（右） -->
    <header class="ccpanel__head">
      <ITabs
        v-model="tab"
        :tabs="[
          { key: 'configure', label: 'CONFIGURE' },
          { key: 'style', label: 'STYLE' },
        ]"
        class="ccpanel__tabs"
      />
      <ISelect
        :model-value="def.type"
        :options="typeOptions"
        size="sm"
        variant="ghost"
        aria-label="Chart type"
        class="ccpanel__type"
        @update:model-value="onTypeChange"
      />
    </header>

    <div class="ccpanel__body">
      <KeepAlive>
        <component :is="activeSection" :key="`${def.type}-${tab}`" />
      </KeepAlive>

      <!-- FILTERS & TRANSFORMS（只读摘要；编辑入口在表格视图） -->
      <section class="ccpanel__ft">
        <h4 class="ccpanel__ft-title">FILTERS &amp; TRANSFORMS</h4>
        <p v-if="!chips.length" class="ccpanel__ft-empty">无（在表格视图中添加过滤与转换）</p>
        <ul v-else class="ccpanel__ft-list">
          <li v-for="(c, i) in chips" :key="i" class="ccpanel__ft-chip" :title="c">
            <IIcon name="filter" :size="11" />
            <span class="is-ellipsis">{{ c }}</span>
          </li>
        </ul>
      </section>
    </div>

    <!-- Cancel / Save -->
    <footer class="ccpanel__foot">
      <IButton @click="emit('cancel')">Cancel</IButton>
      <IButton variant="primary" :class="{ 'ccpanel__save--dirty': ctx.dirty.value }" @click="emit('save')">Save</IButton>
    </footer>
  </aside>
</template>

<style scoped>
.ccpanel {
  width: 340px;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--is-surface);
  border-left: 1px solid var(--is-border);
  overflow: hidden;
}
.ccpanel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px 0 16px;
  border-bottom: 1px solid var(--is-border);
}
.ccpanel__tabs {
  flex: 1;
  min-width: 0;
}
.ccpanel__tabs :deep(.is-tabs) {
  border-bottom: none;
}
.ccpanel__type {
  flex-shrink: 0;
}
.ccpanel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ccpanel__ft {
  margin-top: 12px;
  padding: 10px 8px;
  border-top: 1px solid var(--is-border);
}
.ccpanel__ft-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  margin-bottom: 6px;
}
.ccpanel__ft-empty {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.ccpanel__ft-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ccpanel__ft-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  background: var(--is-surface-hover);
  border-radius: var(--is-radius-sm);
  padding: 4px 8px;
}
.ccpanel__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--is-border);
}
.ccpanel__save--dirty {
  box-shadow: 0 0 0 3px rgba(30, 42, 120, 0.18);
}
</style>
```

=== FILE: src/modules/charts/panel/MappingSlot.vue (from line 72) ===
```
<template>
  <div class="mslot" :class="{ 'mslot--error': !!error }">
    <div class="mslot__head">
      <span class="mslot__label">
        {{ slot.label }}<span v-if="slot.required" class="mslot__req">*</span>
      </span>
    </div>

    <div class="mslot__body">
      <template v-for="(m, i) in mappings" :key="`${m.field}-${i}`">
        <AxisSettingsPopover
          v-if="slot.aggregatable || slot.axisSettings || slot.ySide"
          :open="gearFor === i"
          :slot="slot"
          :mapping="m"
          :axis-key="axisKeyOf"
          @update:open="gearFor = $event ? i : null"
        >
          <template #anchor>
            <IFieldCapsule
              :name="m.field"
              :data-type="colType(m.field)"
              :aggregation="capsuleAgg(m)"
              :configurable="true"
              :removable="true"
              :class="{ 'mslot__capsule--missing': missingFields.has(m.field) }"
              @configure="gearFor = i"
              @remove="removeAt(i)"
            />
          </template>
        </AxisSettingsPopover>
        <IFieldCapsule
          v-else
          :name="m.field"
          :data-type="colType(m.field)"
          :removable="true"
          :class="{ 'mslot__capsule--missing': missingFields.has(m.field) }"
          @remove="removeAt(i)"
        />
      </template>

      <ISelect
        v-if="slot.multiple || mappings.length === 0"
        :options="options"
        :placeholder="slot.multiple ? '+ 添加度量' : '选择字段'"
        :searchable="options.length > 6"
        size="sm"
        class="mslot__select"
        :aria-label="slot.label"
        :model-value="null"
        @update:model-value="slot.multiple ? addMapping($event) : setSingle($event)"
      />
    </div>

    <p v-if="missingFields.size" class="mslot__msg mslot__msg--missing">
      列 {{ [...missingFields].map((f) => `「${f}」`).join('、') }} 已不存在，请重新绑定
    </p>
    <p v-else-if="error" class="mslot__msg">{{ error.message }}</p>
  </div>
</template>

<style scoped>
.mslot {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  border: 1px solid transparent;
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.mslot--error {
  border-color: var(--is-danger);
  background: var(--is-danger-soft);
}
.mslot__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mslot__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.mslot__req {
  color: var(--is-danger);
  margin-left: 2px;
}
.mslot__body {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.mslot__select {
  flex: 1;
  min-width: 120px;
}
.mslot__capsule--missing {
  border-color: var(--is-danger) !important;
  color: var(--is-danger);
  background: var(--is-danger-soft) !important;
}
.mslot__msg {
  font-size: 11px;
  color: var(--is-danger);
}
.mslot__msg--missing {
  color: var(--is-danger);
}
</style>
```

=== FILE: src/modules/charts/panel/configure/BaseConfigure.vue (from line 162) ===
```
<template>
  <div class="cfg">
    <!-- 映射槽位 -->
    <MappingSlot v-for="slot in def.mappingSlots" :key="slot.key" :slot="slot" />

    <!-- X⇄Y 交换 -->
    <div v-if="caps.swapXY" class="cfg__row">
      <IButton size="sm" variant="ghost" icon="swap" class="cfg__swap" @click="swapXY">交换 X / Y</IButton>
    </div>

    <!-- Bar：方向 / 堆叠 -->
    <div v-if="caps.horizontal" class="cfg__row">
      <span class="cfg__label">方向</span>
      <ISelect
        v-model="direction"
        :options="[
          { value: 'vertical', label: '竖直' },
          { value: 'horizontal', label: '水平' },
        ]"
        size="sm"
        aria-label="柱方向"
      />
    </div>
    <div v-if="caps.stack" class="cfg__row">
      <span class="cfg__label">分组模式</span>
      <ISelect
        v-model="mode"
        :options="[
          { value: 'grouped', label: '并排 (Grouped)' },
          { value: 'stacked', label: '堆叠 (Stacked)' },
        ]"
        size="sm"
        aria-label="分组模式"
      />
    </div>

    <!-- 误差棒 -->
    <div v-if="caps.errorBars" class="cfg__row">
      <span class="cfg__label">Error bars</span>
      <ITooltip :content="meanActive ? '' : '仅在聚合为 Average (Mean) 时可用'" placement="bottom">
        <ISelect
          v-model="errorBars"
          :disabled="!meanActive"
          :options="[
            { value: 'none', label: 'None' },
            { value: 'sd', label: 'Standard Deviation' },
            { value: 'sem', label: 'Standard Error of the Mean' },
          ]"
          size="sm"
          aria-label="误差棒"
        />
      </ITooltip>
    </div>

    <!-- 色板 -->
    <div class="cfg__row">
      <span class="cfg__label">Color palette</span>
      <PalettePicker v-model="palette" :continuous="def.type === 'heatmap'" class="cfg__palette" />
    </div>

    <!-- REGRESSION（6B：Line/Scatter 拟合套件） -->
    <section v-if="caps.regression" class="cfg__section">
      <h4 class="cfg__section-title">REGRESSION</h4>
      <div class="cfg__row">
        <span class="cfg__label">Regression model</span>
        <ISelect v-model="regModel" :options="regressionModels" placeholder="Select a regression type" size="sm" aria-label="回归模型" />
      </div>
      <div class="cfg__row">
        <span class="cfg__label cfg__label--icon">
          Weights
          <ITooltip content="选择数值列作为加权最小二乘的权重（权重越大的点对拟合影响越大）；默认 None = 等权" placement="bottom">
            <IIcon name="info" :size="12" class="cfg__help" />
          </ITooltip>
        </span>
        <ISelect v-model="regWeights" :options="weightOptions" size="sm" aria-label="权重列" />
      </div>
      <div class="cfg__row cfg__row--switch">
        <span class="cfg__label cfg__label--icon">
          Exclude flagged
          <ITooltip content="开启后，打标（×）的点不参与拟合，但仍显示在图表上" placement="bottom">
            <IIcon name="info" :size="12" class="cfg__help" />
          </ITooltip>
        </span>
        <IToggle v-model="regExclude" aria-label="Exclude flagged" />
      </div>
      <template v-if="regModel === '4pl'">
        <div class="cfg__row">
          <span class="cfg__label cfg__label--icon">
            Constraints
            <ITooltip content="固定 4PL 的 Min / Max 参数（留空则由算法自动估计）" placement="bottom">
              <IIcon name="info" :size="12" class="cfg__help" />
            </ITooltip>
          </span>
          <div class="cfg__inline">
            <ITextField v-model="constraintMin" type="number" placeholder="Min（可选）" size="sm" aria-label="4PL Min 约束" class="cfg__constraint" />
            <ITextField v-model="constraintMax" type="number" placeholder="Max（可选）" size="sm" aria-label="4PL Max 约束" class="cfg__constraint" />
          </div>
        </div>
        <div class="cfg__row cfg__row--switch">
          <span class="cfg__label">Show asymptotes</span>
          <IToggle v-model="regAsymptotes" aria-label="显示渐近线" />
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.cfg {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cfg__row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 0 8px;
}
.cfg__row--inline {
  flex-direction: row;
  align-items: center;
}
.cfg__row--switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.cfg__row--disabled {
  opacity: 0.55;
}
.cfg__label {
  flex-shrink: 0;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.cfg__row :deep(.is-select) {
  flex: 1;
}
.cfg__palette {
  flex: 1;
  min-width: 0;
}
.cfg__section {
  margin-top: 8px;
  padding: 10px 8px 4px;
  border-top: 1px solid var(--is-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cfg__section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
}
.cfg__label--icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.cfg__help {
  color: var(--is-text-tertiary);
  cursor: help;
}
.cfg__constraint {
  flex: 1;
  min-width: 0;
}
.cfg__inline {
  display: flex;
  gap: 8px;
}
.cfg__swap {
  align-self: flex-start;
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

=== FILE: src/ui/ITabs.vue (from line 1) ===
```
<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

export interface TabItem {
  key: string
  label: string
  disabled?: boolean
}

const props = defineProps<{
  modelValue: string
  tabs: TabItem[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const tabEls = ref<HTMLElement[]>([])
const indicator = ref<{ left: number; width: number }>({ left: 0, width: 0 })

function select(key: string) {
  const tab = props.tabs.find((t) => t.key === key)
  if (!tab || tab.disabled) return
  emit('update:modelValue', key)
}

async function updateIndicator() {
  await nextTick()
  const idx = props.tabs.findIndex((t) => t.key === props.modelValue)
  const el = tabEls.value?.[idx]
  if (el) indicator.value = { left: el.offsetLeft, width: el.offsetWidth }
}

function onKeydown(e: KeyboardEvent, idx: number) {
  let next = -1
  if (e.key === 'ArrowRight') next = (idx + 1) % props.tabs.length
  else if (e.key === 'ArrowLeft') next = (idx - 1 + props.tabs.length) % props.tabs.length
  if (next >= 0) {
    e.preventDefault()
    tabEls.value[next]?.focus()
    select(props.tabs[next].key)
  }
}

onMounted(updateIndicator)
watch(() => [props.modelValue, props.tabs], updateIndicator, { deep: true })
</script>

<template>
  <div class="is-tabs" role="tablist">
    <button
      v-for="(tab, i) in tabs"
      :key="tab.key"
      ref="tabEls"
      type="button"
      class="is-tabs__tab"
      :class="{ 'is-tabs__tab--active': tab.key === modelValue }"
      role="tab"
      :aria-selected="tab.key === modelValue"
      :tabindex="tab.key === modelValue ? 0 : -1"
      :disabled="tab.disabled"
      @click="select(tab.key)"
      @keydown="onKeydown($event, i)"
    >
      {{ tab.label }}
    </button>
    <span
      class="is-tabs__indicator"
      :style="{ transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px` }"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.is-tabs {
  position: relative;
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--is-border);
}
.is-tabs__tab {
  padding: 8px 12px;
  font-size: var(--is-text-sm);
  font-weight: 500;
  color: var(--is-text-secondary);
  border-radius: var(--is-radius-sm) var(--is-radius-sm) 0 0;
  transition: color var(--is-dur-fast) var(--is-ease);
}
.is-tabs__tab:hover:not(:disabled) {
  color: var(--is-text);
}
.is-tabs__tab--active {
  color: var(--is-accent);
}
.is-tabs__tab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.is-tabs__indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--is-accent);
  border-radius: 2px;
  transition:
    transform var(--is-dur) var(--is-ease),
    width var(--is-dur) var(--is-ease);
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
