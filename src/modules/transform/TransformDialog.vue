<template>
  <el-dialog :model-value="modelValue" title="过滤与转换" width="720px" @close="emit('update:modelValue', false)">
    <template v-if="store.selectedView">
      <h4>视图过滤</h4>
      <div v-for="(f, i) in filters" :key="f.id" class="row">
        <select v-model="f.field" class="native-field-select" style="width: 140px" aria-label="过滤字段">
          <option v-for="c in cols" :key="c.field" :value="c.field">{{ c.title }}</option>
        </select>
        <select v-model="f.op" class="native-field-select" style="width: 120px" aria-label="过滤运算符">
          <option value="eq">等于</option>
          <option value="neq">不等于</option>
          <option value="contains">包含</option>
          <option value="empty">为空</option>
          <option value="notEmpty">非空</option>
          <option value="gt">&gt;</option>
          <option value="lt">&lt;</option>
        </select>
        <el-input v-model="f.value" style="width: 140px" :disabled="f.op === 'empty' || f.op === 'notEmpty'" />
        <el-button @click="filters.splice(i, 1)">删</el-button>
      </div>
      <el-button size="small" @click="addFilter">+ 过滤</el-button>

      <h4 style="margin-top: 16px">转换步骤</h4>
      <div v-for="(t, i) in transforms" :key="t.id" class="row transform">
        <select
          class="native-field-select"
          style="width: 130px"
          aria-label="转换类型"
          :value="t.kind"
          @change="onKindChange(t, $event)"
        >
          <option value="select">选列</option>
          <option value="rename">重命名</option>
          <option value="derived">派生列</option>
          <option value="dedupe">去重</option>
          <option value="sort">排序</option>
        </select>
        <template v-if="t.kind === 'select' || t.kind === 'dedupe'">
          <select
            v-model="t.config.fields"
            multiple
            class="native-field-select native-multi"
            style="width: 280px"
            aria-label="转换列"
          >
            <option v-for="c in cols" :key="c.field" :value="c.field">{{ c.title }}</option>
          </select>
        </template>
        <template v-else-if="t.kind === 'rename'">
          <select v-model="t.config.from" class="native-field-select" style="width: 120px" aria-label="重命名源列">
            <option v-for="c in cols" :key="c.field" :value="c.field">{{ c.title }}</option>
          </select>
          <el-input v-model="t.config.to" placeholder="新 field" style="width: 120px" />
        </template>
        <template v-else-if="t.kind === 'derived'">
          <el-input v-model="t.config.field" placeholder="新列名" style="width: 100px" />
          <el-input v-model="t.config.expr" placeholder="如 colA + colB 或 concat(a,b)" style="width: 220px" />
        </template>
        <template v-else-if="t.kind === 'sort'">
          <select
            class="native-field-select"
            style="width: 140px"
            aria-label="排序字段"
            :value="sortField"
            @change="onSortField($event, t)"
          >
            <option v-for="c in cols" :key="c.field" :value="c.field">{{ c.title }}</option>
          </select>
          <select
            class="native-field-select"
            style="width: 100px"
            aria-label="排序方向"
            :value="sortOrder"
            @change="onSortOrder($event, t)"
          >
            <option value="asc">升序</option>
            <option value="desc">降序</option>
          </select>
        </template>
        <el-button @click="transforms.splice(i, 1)">删</el-button>
        <el-button v-if="i" @click="move(i, -1)">上</el-button>
        <el-button v-if="i < transforms.length - 1" @click="move(i, 1)">下</el-button>
      </div>
      <el-button size="small" @click="addTransform">+ 转换</el-button>
      <div v-if="error" class="err">{{ error }}</div>
    </template>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="save">Save</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from '@/shared/ui/feedback'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import type { FilterCondition, TransformStep } from '@/shared/types/analysis'
import { uid } from '@/shared/utils/id'
import { runPipeline } from '@/modules/transform/pipeline'
import { cloneDeep } from '@/shared/utils/clone'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const store = useAnalysisStore()
const filters = ref<FilterCondition[]>([])
const transforms = ref<TransformStep[]>([])
const error = ref('')
const sortField = ref('')
const sortOrder = ref<'asc' | 'desc'>('asc')

const cols = computed(() => store.selectedView?.table.columns || [])

watch(
  () => store.selectedView?.view,
  (v) => {
    if (!v) return
    filters.value = cloneDeep(v.viewFilters)
    transforms.value = cloneDeep(v.transforms)
  },
  { immediate: true },
)

function addFilter() {
  filters.value.push({ id: uid('f'), field: cols.value[0]?.field || '', op: 'contains', value: '' })
}
function addTransform() {
  transforms.value.push({ id: uid('tr'), kind: 'select', config: { fields: cols.value.map((c) => c.field) } })
}
function resetConfig(t: TransformStep) {
  t.config = t.kind === 'select' || t.kind === 'dedupe' ? { fields: [] } : {}
}
function onKindChange(t: TransformStep, e: Event) {
  t.kind = (e.target as HTMLSelectElement).value as TransformStep['kind']
  resetConfig(t)
}
function syncSort(t: TransformStep) {
  t.config = { sorts: [{ field: sortField.value, order: sortOrder.value }] }
}
function onSortField(e: Event, t: TransformStep) {
  sortField.value = (e.target as HTMLSelectElement).value
  syncSort(t)
}
function onSortOrder(e: Event, t: TransformStep) {
  const v = (e.target as HTMLSelectElement).value
  sortOrder.value = v === 'desc' ? 'desc' : 'asc'
  syncSort(t)
}
function move(i: number, dir: number) {
  const j = i + dir
  const tmp = transforms.value[i]
  transforms.value[i] = transforms.value[j]
  transforms.value[j] = tmp
}

function save() {
  error.value = ''
  const sv = store.selectedView
  if (!sv) return
  try {
    runPipeline({
      columns: sv.table.columns,
      rows: sv.table.rows.slice(0, 5),
      tableFilters: sv.table.tableFilters,
      viewFilters: filters.value,
      transforms: transforms.value,
    })
  } catch (e) {
    error.value = String(e)
    toast('error', '转换无效，已阻断 Save')
    return
  }
  store.setViewFilters(sv.view.id, filters.value)
  store.setTransforms(sv.view.id, transforms.value)
  toast('success', '已保存')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.err {
  color: #c45656;
  margin-top: 8px;
}
.native-field-select {
  height: 32px;
  border: 1px solid #d0d3d6;
  border-radius: 6px;
  padding: 0 8px;
  background: #fff;
  color: #1f2329;
  font-size: 13px;
}
.native-field-select:focus-visible {
  outline: 2px solid #3370ff;
  outline-offset: 1px;
}
.native-multi {
  height: auto;
  min-height: 72px;
  padding: 4px 6px;
}
</style>
