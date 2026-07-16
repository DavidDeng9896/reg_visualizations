<template>
  <el-dialog :model-value="modelValue" title="过滤与转换" width="720px" @close="emit('update:modelValue', false)">
    <template v-if="store.selectedView">
      <h4>视图过滤</h4>
      <div v-for="(f, i) in filters" :key="f.id" class="row">
        <el-select v-model="f.field" style="width: 140px">
          <el-option v-for="c in cols" :key="c.field" :label="c.title" :value="c.field" />
        </el-select>
        <el-select v-model="f.op" style="width: 120px">
          <el-option label="等于" value="eq" />
          <el-option label="不等于" value="neq" />
          <el-option label="包含" value="contains" />
          <el-option label="为空" value="empty" />
          <el-option label="非空" value="notEmpty" />
          <el-option label=">" value="gt" />
          <el-option label="<" value="lt" />
        </el-select>
        <el-input v-model="f.value" style="width: 140px" :disabled="f.op === 'empty' || f.op === 'notEmpty'" />
        <el-button @click="filters.splice(i, 1)">删</el-button>
      </div>
      <el-button size="small" @click="addFilter">+ 过滤</el-button>

      <h4 style="margin-top: 16px">转换步骤</h4>
      <div v-for="(t, i) in transforms" :key="t.id" class="row transform">
        <el-select v-model="t.kind" style="width: 130px" @change="() => resetConfig(t)">
          <el-option label="选列" value="select" />
          <el-option label="重命名" value="rename" />
          <el-option label="派生列" value="derived" />
          <el-option label="去重" value="dedupe" />
          <el-option label="排序" value="sort" />
        </el-select>
        <template v-if="t.kind === 'select' || t.kind === 'dedupe'">
          <el-select v-model="t.config.fields" multiple style="width: 280px">
            <el-option v-for="c in cols" :key="c.field" :label="c.title" :value="c.field" />
          </el-select>
        </template>
        <template v-else-if="t.kind === 'rename'">
          <el-select v-model="t.config.from" style="width: 120px">
            <el-option v-for="c in cols" :key="c.field" :label="c.title" :value="c.field" />
          </el-select>
          <el-input v-model="t.config.to" placeholder="新 field" style="width: 120px" />
        </template>
        <template v-else-if="t.kind === 'derived'">
          <el-input v-model="t.config.field" placeholder="新列名" style="width: 100px" />
          <el-input v-model="t.config.expr" placeholder="如 colA + colB 或 concat(a,b)" style="width: 220px" />
        </template>
        <template v-else-if="t.kind === 'sort'">
          <el-select v-model="sortField" style="width: 140px" @change="syncSort(t)">
            <el-option v-for="c in cols" :key="c.field" :label="c.title" :value="c.field" />
          </el-select>
          <el-select v-model="sortOrder" style="width: 100px" @change="syncSort(t)">
            <el-option label="升序" value="asc" />
            <el-option label="降序" value="desc" />
          </el-select>
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
import { ElMessage } from 'element-plus'
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
function syncSort(t: TransformStep) {
  t.config = { sorts: [{ field: sortField.value, order: sortOrder.value }] }
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
    ElMessage.error('转换无效，已阻断 Save')
    return
  }
  store.setViewFilters(sv.view.id, filters.value)
  store.setTransforms(sv.view.id, transforms.value)
  ElMessage.success('已保存')
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
</style>
