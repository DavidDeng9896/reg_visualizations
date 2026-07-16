<template>
  <el-drawer :model-value="modelValue" title="图表配置" size="400px" @close="emit('update:modelValue', false)">
    <el-tabs v-model="tab">
      <el-tab-pane label="CONFIGURE" name="configure">
        <el-form label-width="110px" size="small">
          <el-form-item label="X / Categories">
            <el-select v-model="draft.configure.xField" clearable style="width: 100%">
              <el-option v-for="c in columns" :key="c.field" :label="`${c.title} (${c.dataType})`" :value="c.field" />
            </el-select>
          </el-form-item>
          <el-form-item label="Y / Measure">
            <el-select v-model="draft.configure.yField" clearable style="width: 100%">
              <el-option v-for="c in columns" :key="c.field" :label="`${c.title} (${c.dataType})`" :value="c.field" />
            </el-select>
          </el-form-item>
          <el-form-item label="Series / Color">
            <el-select v-model="draft.configure.seriesField" clearable style="width: 100%">
              <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
            </el-select>
          </el-form-item>
          <el-form-item label="Categories(Pie)">
            <el-select v-model="draft.configure.categoriesField" clearable style="width: 100%">
              <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
            </el-select>
          </el-form-item>
          <el-form-item label="Measure(Pie)">
            <el-select v-model="draft.configure.measureField" clearable style="width: 100%">
              <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
            </el-select>
          </el-form-item>
          <el-form-item label="Heatmap Row">
            <el-select v-model="draft.configure.heatmapRowField" clearable style="width: 100%">
              <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
            </el-select>
          </el-form-item>
          <el-form-item label="Heatmap Col">
            <el-select v-model="draft.configure.heatmapColField" clearable style="width: 100%">
              <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
            </el-select>
          </el-form-item>
          <el-form-item label="Heatmap Value">
            <el-select v-model="draft.configure.heatmapValueField" clearable style="width: 100%">
              <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
            </el-select>
          </el-form-item>
          <el-form-item label="聚合">
            <el-select v-model="draft.configure.aggregation" style="width: 100%">
              <el-option v-for="a in aggs" :key="a" :label="a" :value="a" />
            </el-select>
          </el-form-item>
          <el-form-item label="误差棒">
            <el-select v-model="draft.configure.errorBars" style="width: 100%">
              <el-option label="None" value="none" />
              <el-option label="SD" value="sd" />
              <el-option label="SEM" value="sem" />
            </el-select>
          </el-form-item>
          <el-form-item label="水平柱">
            <el-switch v-model="horiz" />
          </el-form-item>
          <el-form-item label="堆叠">
            <el-switch v-model="draft.configure.stacked" />
          </el-form-item>
          <el-form-item label="拟合">
            <el-select v-model="draft.configure.fitModel" style="width: 100%" aria-label="拟合模型">
              <el-option label="None" value="none" />
              <el-option label="Point-to-Point" value="ptp" />
              <el-option label="Linear" value="linear" />
              <el-option label="Quadratic" value="quadratic" />
              <el-option label="4PL" value="4pl" />
            </el-select>
            <p v-if="draft.configure.fitModel === '4pl'" class="fit-hint" role="note">
              4PL 至少需要 4 个有效点，且 X/Y 均需有变化；点数不足或边界异常时画布会显示拟合提示。
            </p>
          </el-form-item>
          <el-form-item label="Exclude flagged">
            <el-switch v-model="draft.configure.excludeFlagged" />
          </el-form-item>
          <el-form-item label="Custom X label">
            <el-input v-model="draft.configure.xLabel" />
          </el-form-item>
          <el-form-item label="Custom Y label">
            <el-input v-model="draft.configure.yLabel" />
          </el-form-item>
          <el-form-item label="色板">
            <el-select v-model="draft.configure.colorPalette" style="width: 100%">
              <el-option label="Light" value="light" />
              <el-option label="Dark" value="dark" />
              <el-option label="Alternate" value="alternate" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-tab-pane>
      <el-tab-pane label="STYLE" name="style">
        <el-form label-width="110px" size="small">
          <el-form-item label="Title"><el-input v-model="draft.style.title" /></el-form-item>
          <el-form-item label="Subtitle"><el-input v-model="draft.style.subtitle" /></el-form-item>
          <el-form-item label="Opacity">
            <el-slider v-model="opacity" :min="0.1" :max="1" :step="0.05" />
          </el-form-item>
          <el-form-item label="图例">
            <el-switch v-model="draft.style.legendShow" />
          </el-form-item>
          <el-form-item label="图例位置">
            <el-select v-model="draft.style.legendPosition" style="width: 100%">
              <el-option label="Left" value="left" />
              <el-option label="Right" value="right" />
              <el-option label="Top" value="top" />
              <el-option label="Bottom" value="bottom" />
            </el-select>
          </el-form-item>
          <el-form-item label="点形状">
            <el-select v-model="draft.style.pointShape" style="width: 100%">
              <el-option label="circle" value="circle" />
              <el-option label="rect" value="rect" />
              <el-option label="triangle" value="triangle" />
              <el-option label="diamond" value="diamond" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
    <div class="footer">
      <el-button @click="emit('update:modelValue', false)">Cancel</el-button>
      <el-button type="primary" @click="save">Save</el-button>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ChartConfig, TableColumn } from '@/shared/types/analysis'
import { cloneDeep } from '@/shared/utils/clone'

const props = defineProps<{ modelValue: boolean; config: ChartConfig; columns: TableColumn[] }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; save: [ChartConfig] }>()

const tab = ref('configure')
const draft = ref<ChartConfig>(cloneDeep(props.config))
const aggs = ['count', 'sum', 'min', 'max', 'mean', 'median'] as const

watch(
  () => props.config,
  (c) => {
    draft.value = cloneDeep(c)
  },
)

const horiz = computed({
  get: () => draft.value.configure.orientation === 'horizontal',
  set: (v: boolean) => {
    draft.value.configure.orientation = v ? 'horizontal' : 'vertical'
  },
})

const opacity = computed({
  get: () => draft.value.style.opacity ?? 0.85,
  set: (v: number) => {
    draft.value.style.opacity = v
  },
})

function save() {
  emit('save', cloneDeep(draft.value))
}
</script>

<style scoped>
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.fit-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #8f959e;
}
</style>
