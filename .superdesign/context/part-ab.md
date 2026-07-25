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
