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

=== FILE: src/modules/charts/panel/style/BaseStyle.vue (from line 111) ===
```
<template>
  <div class="sty">
    <!-- General -->
    <section class="sty__sec">
      <h4 class="sty__sec-title">General</h4>
      <div class="sty__row">
        <span class="sty__label">Title</span>
        <ITextField v-model="title" size="sm" clearable :placeholder="ctx.defaultTitle.value" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Subtitle</span>
        <ITextField v-model="subtitle" size="sm" placeholder="可选" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Width (px)</span>
        <ITextField v-model="width" size="sm" placeholder="自适应" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Height (px)</span>
        <ITextField v-model="height" size="sm" placeholder="自适应" />
      </div>
      <div class="sty__row sty__row--margins">
        <span class="sty__label">Margins</span>
        <div class="sty__margins">
          <ITextField v-model="marginTop" size="sm" placeholder="Top" aria-label="上边距" />
          <ITextField v-model="marginRight" size="sm" placeholder="Right" aria-label="右边距" />
          <ITextField v-model="marginBottom" size="sm" placeholder="Bottom" aria-label="下边距" />
          <ITextField v-model="marginLeft" size="sm" placeholder="Left" aria-label="左边距" />
        </div>
      </div>
      <div class="sty__row">
        <span class="sty__label">Opacity</span>
        <ISlider v-model="opacity" :min="0" :max="1" :step="0.05" :format="(v: number) => v.toFixed(2)" aria-label="透明度" />
      </div>
    </section>

    <!-- Bar 专属 -->
    <section v-if="type === 'bar'" class="sty__sec">
      <h4 class="sty__sec-title">Bar</h4>
      <div class="sty__row">
        <span class="sty__label">Line Width</span>
        <ISlider :model-value="numOr(bar.lineWidth, 0)" :min="0" :max="4" :step="0.5" aria-label="柱描边线宽" @update:model-value="bar.lineWidth = $event; ctx.touch()" />
      </div>
      <ColorField :model-value="bar.lineColor ?? '#1d2939'" label="Line Color" @update:model-value="bar.lineColor = $event; ctx.touch()" />
    </section>

    <!-- Line 专属（5B：无线宽/点大小） -->
    <section v-if="type === 'line'" class="sty__sec">
      <h4 class="sty__sec-title">Line</h4>
      <div class="sty__row">
        <span class="sty__label">Point Shape</span>
        <ISelect :model-value="line.pointShape ?? 'circle'" :options="SHAPES" size="sm" aria-label="点形状" @update:model-value="line.pointShape = String($event); ctx.touch()" />
      </div>
      <ColorField v-if="!hasSeries" :model-value="line.defaultColor ?? '#2e5bff'" label="Default Color" @update:model-value="line.defaultColor = $event; ctx.touch()" />
      <div class="sty__row">
        <span class="sty__label">Charts</span>
        <ISelect
          :model-value="line.facet ?? 'one'"
          :options="[
            { value: 'one', label: 'One Chart' },
            { value: 'per-measure', label: 'One Per Measure' },
          ]"
          size="sm"
          aria-label="分面"
          @update:model-value="line.facet = $event as 'one' | 'per-measure'; ctx.touch()"
        />
      </div>
    </section>

    <!-- Scatter 专属 -->
    <section v-if="type === 'scatter'" class="sty__sec">
      <h4 class="sty__sec-title">Scatter</h4>
      <div class="sty__row">
        <span class="sty__label">Point Size</span>
        <ISlider :model-value="numOr(scatter.pointSize, 8)" :min="2" :max="24" aria-label="点大小" @update:model-value="scatter.pointSize = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Point Shape</span>
        <ISelect :model-value="scatter.pointShape ?? 'circle'" :options="SHAPES" size="sm" aria-label="点形状" @update:model-value="scatter.pointShape = String($event); ctx.touch()" />
      </div>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">Jitter</span>
        <IToggle :model-value="!!scatter.jitter" aria-label="Jitter Points" @update:model-value="scatter.jitter = $event; ctx.touch()" />
      </div>
      <div v-if="scatter.jitter" class="sty__row">
        <span class="sty__label">强度</span>
        <ISlider :model-value="numOr(scatter.jitterStrength, 0.4)" :min="0" :max="1" :step="0.05" :format="(v: number) => v.toFixed(2)" aria-label="Jitter 强度" @update:model-value="scatter.jitterStrength = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Charts</span>
        <ISelect
          :model-value="scatter.facet ?? 'one'"
          :options="[
            { value: 'one', label: 'One Chart' },
            { value: 'per-measure', label: 'One Per Measure' },
          ]"
          size="sm"
          aria-label="分面"
          @update:model-value="scatter.facet = $event as 'one' | 'per-measure'; ctx.touch()"
        />
      </div>
    </section>

    <!-- Box 专属（4B：无 Jitter） -->
    <section v-if="type === 'box'" class="sty__sec">
      <h4 class="sty__sec-title">Box</h4>
      <div class="sty__row">
        <span class="sty__label">Show Points</span>
        <ISelect
          :model-value="box.showPoints ?? 'outliers'"
          :options="[
            { value: 'all', label: '全部点' },
            { value: 'outliers', label: '仅离群点' },
            { value: 'none', label: '不显示' },
          ]"
          size="sm"
          aria-label="显示点"
          @update:model-value="box.showPoints = $event as 'all' | 'outliers' | 'none'; ctx.touch()"
        />
      </div>
      <div class="sty__row">
        <span class="sty__label">Point Size</span>
        <ISlider :model-value="numOr(box.pointSize, 5)" :min="2" :max="14" aria-label="点大小" @update:model-value="box.pointSize = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Point Shape</span>
        <ISelect :model-value="box.pointShape ?? 'circle'" :options="SHAPES" size="sm" aria-label="点形状" @update:model-value="box.pointShape = String($event); ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Line Width</span>
        <ISlider :model-value="numOr(box.lineWidth, 1.5)" :min="0.5" :max="4" :step="0.5" aria-label="箱线线宽" @update:model-value="box.lineWidth = $event; ctx.touch()" />
      </div>
      <ColorField :model-value="box.lineColor ?? '#1d2939'" label="Line Color" @update:model-value="box.lineColor = $event; ctx.touch()" />
      <ColorField :model-value="box.fillColor ?? '#2e5bff'" label="Fill Color" @update:model-value="box.fillColor = $event; ctx.touch()" />
    </section>

    <!-- Pie 专属 -->
    <section v-if="type === 'pie'" class="sty__sec">
      <h4 class="sty__sec-title">Pie</h4>
      <div class="sty__row">
        <span class="sty__label">Inner %</span>
        <ISlider :model-value="numOr(pie.innerRadiusPct, 0)" :min="0" :max="90" aria-label="内径百分比" @update:model-value="pie.innerRadiusPct = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Outer %</span>
        <ISlider :model-value="numOr(pie.outerRadiusPct, 72)" :min="10" :max="100" aria-label="外径百分比" @update:model-value="pie.outerRadiusPct = $event; ctx.touch()" />
      </div>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">百分比</span>
        <IToggle :model-value="pie.showPercent ?? true" aria-label="Show Percentages" @update:model-value="pie.showPercent = $event; ctx.touch()" />
      </div>
      <div v-if="pie.showPercent !== false" class="sty__row">
        <span class="sty__label">Hide % &lt;</span>
        <ISlider :model-value="numOr(pie.hideBelowPct, 5)" :min="0" :max="30" aria-label="小于该百分比隐藏标注" @update:model-value="pie.hideBelowPct = $event; ctx.touch()" />
      </div>
      <ColorField v-if="pie.showPercent !== false" :model-value="pie.percentColor ?? '#ffffff'" label="% Text Color" @update:model-value="pie.percentColor = $event; ctx.touch()" />
    </section>

    <!-- Heatmap 专属 -->
    <section v-if="type === 'heatmap'" class="sty__sec">
      <h4 class="sty__sec-title">Heatmap</h4>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">格内标注</span>
        <IToggle :model-value="!!heatmap.showCellValues" aria-label="显示数值" @update:model-value="heatmap.showCellValues = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">行排序</span>
        <ISelect
          :model-value="heatmap.rowSort ?? 'label'"
          :options="[
            { value: 'label', label: '按标签' },
            { value: 'mean', label: '按行均值' },
          ]"
          size="sm"
          aria-label="行排序"
          @update:model-value="heatmap.rowSort = $event as 'label' | 'mean'; ctx.touch()"
        />
      </div>
      <div class="sty__row">
        <span class="sty__label">列排序</span>
        <ISelect
          :model-value="heatmap.colSort ?? 'label'"
          :options="[
            { value: 'label', label: '按标签' },
            { value: 'mean', label: '按列均值' },
