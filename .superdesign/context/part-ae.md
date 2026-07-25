
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
          ]"
          size="sm"
          aria-label="列排序"
          @update:model-value="heatmap.colSort = $event as 'label' | 'mean'; ctx.touch()"
        />
      </div>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">聚类</span>
        <div class="sty__inline">
          <IToggle :model-value="!!heatmap.clusterRows" @update:model-value="heatmap.clusterRows = $event; ctx.touch()">行</IToggle>
          <IToggle :model-value="!!heatmap.clusterCols" @update:model-value="heatmap.clusterCols = $event; ctx.touch()">列</IToggle>
        </div>
      </div>
    </section>

    <!-- Legend -->
    <section class="sty__sec">
      <h4 class="sty__sec-title">Legend</h4>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">显示图例</span>
        <IToggle v-model="legendShow" aria-label="显示图例" />
      </div>
      <div v-if="legendShow" class="sty__row">
        <span class="sty__label">Position</span>
        <ISelect
          v-model="legendPos"
          :options="[
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ]"
          size="sm"
          aria-label="图例位置"
        />
      </div>
    </section>

    <!-- Axis -->
    <AxisSection v-if="showXAxis" title="X-Axis" axis-key="xAxis" :with-scale="xScaleTypes.includes(type)" />
    <AxisSection v-if="showYAxis" :title="caps.secondY && useRightAxis ? 'Y-Axis (Left)' : 'Y-Axis'" axis-key="yAxis" :with-scale="yScaleTypes.includes(type)" />
    <AxisSection v-if="caps.secondY && useRightAxis" title="Y-Axis (Right)" axis-key="yAxisRight" :with-scale="true" />

    <!-- Series colors -->
    <SeriesColorsSection />
  </div>
</template>

<style scoped>
.sty {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sty__sec {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 8px;
  border-top: 1px solid var(--is-border);
}
.sty__sec:first-child {
  border-top: none;
}
.sty__sec-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.sty__row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}
.sty__label {
  flex-shrink: 0;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.sty__row :deep(.is-field),
.sty__row :deep(.is-select),
.sty__row :deep(.is-slider) {
  flex: 1;
  min-width: 0;
}
.sty__margins {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.sty__inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sty__row--switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.sty__inline :deep(.is-field) {
  flex: 1;
  min-width: 0;
}
</style>
```

=== FILE: src/modules/charts/panel/style/AxisSection.vue (from line 69) ===
```
<template>
  <section class="axis-sec">
    <h4 class="axis-sec__title">{{ title }}</h4>
    <div class="axis-sec__row">
      <span class="axis-sec__label">Label</span>
      <ITextField v-model="label" size="sm" clearable :placeholder="defaultLabel ?? '默认'" />
    </div>
    <div v-if="withScale" class="axis-sec__row axis-sec__row--switch">
      <span class="axis-sec__label">Scale</span>
      <IToggle :model-value="scale === 'log'" aria-label="Scale Log/Linear" @update:model-value="scale = $event ? 'log' : 'linear'">
        {{ scale === 'log' ? 'Log' : 'Linear' }}
      </IToggle>
    </div>
    <div class="axis-sec__row">
      <span class="axis-sec__label">Range</span>
      <ISelect
        v-model="range"
        :options="[
          { value: 'auto', label: 'Automatic' },
          { value: 'manual', label: 'Manual (min/max)' },
        ]"
        size="sm"
        aria-label="Range"
      />
    </div>
    <div v-if="range === 'manual'" class="axis-sec__row">
      <span class="axis-sec__label">Min / Max</span>
      <div class="axis-sec__inline">
        <ITextField v-model="minStr" size="sm" placeholder="Min" aria-label="最小值" />
        <ITextField v-model="maxStr" size="sm" placeholder="Max" aria-label="最大值" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.axis-sec {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 8px;
  border-top: 1px solid var(--is-border);
}
.axis-sec__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.axis-sec__row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}
.axis-sec__label {
  flex-shrink: 0;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.axis-sec__inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
.axis-sec__row--switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.axis-sec__row :deep(.is-select),
.axis-sec__inline :deep(.is-field) {
  flex: 1;
  min-width: 0;
}
</style>
```
