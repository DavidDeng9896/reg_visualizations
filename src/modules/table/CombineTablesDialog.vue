<template>
  <el-dialog :model-value="modelValue" title="By combining tables" width="780px" @close="close">
    <el-form label-width="110px">
      <el-form-item label="左表">
        <select v-model="leftId" class="native-field-select" style="width: 100%" aria-label="左表">
          <option value="" disabled>请选择</option>
          <option v-for="t in tables" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </el-form-item>
      <el-form-item label="右表">
        <select v-model="rightId" class="native-field-select" style="width: 100%" aria-label="右表">
          <option value="" disabled>请选择</option>
          <option v-for="t in tables" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </el-form-item>
      <el-form-item label="连接类型">
        <select v-model="joinType" class="native-field-select" style="width: 100%" aria-label="连接类型">
          <option value="left">Left Join</option>
          <option value="inner">Inner Join</option>
          <option value="right">Right Join</option>
          <option value="full">Full Join</option>
          <option value="append">Append</option>
        </select>
      </el-form-item>
      <template v-if="joinType !== 'append'">
        <el-form-item label="左连接键">
          <select
            v-model="leftKeys"
            multiple
            class="native-field-select native-multi"
            style="width: 100%"
            aria-label="左连接键"
          >
            <option v-for="c in leftCols" :key="c.field" :value="c.field">{{ c.title }}</option>
          </select>
        </el-form-item>
        <el-form-item label="右连接键">
          <select
            v-model="rightKeys"
            multiple
            class="native-field-select native-multi"
            style="width: 100%"
            aria-label="右连接键"
          >
            <option v-for="c in rightCols" :key="c.field" :value="c.field">{{ c.title }}</option>
          </select>
        </el-form-item>
      </template>
      <el-form-item label="新表名称">
        <el-input v-model="name" />
      </el-form-item>
    </el-form>
    <div class="preview-title">预览（前 20 行）{{ warning }}</div>
    <el-table :data="preview" height="220" size="small" border>
      <el-table-column v-for="c in previewCols" :key="c.field" :prop="c.field" :label="c.title" min-width="90" />
    </el-table>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :disabled="!canAdd" @click="add">Add table</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from '@/shared/ui/feedback'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { combineTables } from '@/modules/table/join'
import type { JoinType, TableColumn } from '@/shared/types/analysis'
import { uid } from '@/shared/utils/id'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const store = useAnalysisStore()

const leftId = ref('')
const rightId = ref('')
const joinType = ref<JoinType>('left')
const leftKeys = ref<string[]>([])
const rightKeys = ref<string[]>([])
const name = ref('Combined table')
const preview = ref<Record<string, unknown>[]>([])
const previewCols = ref<TableColumn[]>([])
const warning = ref('')

const tables = computed(() => store.current?.tables || [])
const leftCols = computed(() => tables.value.find((t) => t.id === leftId.value)?.columns || [])
const rightCols = computed(() => tables.value.find((t) => t.id === rightId.value)?.columns || [])

const canAdd = computed(() => {
  if (!leftId.value || !rightId.value || !name.value) return false
  if (joinType.value === 'append') return true
  return leftKeys.value.length && leftKeys.value.length === rightKeys.value.length
})

watch([leftId, rightId, joinType, leftKeys, rightKeys], rebuild, { deep: true })

function rebuild() {
  warning.value = ''
  preview.value = []
  previewCols.value = []
  const L = tables.value.find((t) => t.id === leftId.value)
  const R = tables.value.find((t) => t.id === rightId.value)
  if (!L || !R) return
  try {
    const result = combineTables({
      leftColumns: L.columns,
      leftRows: L.rows,
      rightColumns: R.columns,
      rightRows: R.rows,
      joinType: joinType.value,
      leftKeys: leftKeys.value,
      rightKeys: rightKeys.value,
    })
    previewCols.value = result.columns
    preview.value = result.rows.slice(0, 20)
    if (!result.rows.length) warning.value = '（警告：结果为空）'
  } catch (e) {
    warning.value = String(e)
  }
}

function close() {
  emit('update:modelValue', false)
}

function add() {
  const L = tables.value.find((t) => t.id === leftId.value)!
  const R = tables.value.find((t) => t.id === rightId.value)!
  const result = combineTables({
    leftColumns: L.columns,
    leftRows: L.rows,
    rightColumns: R.columns,
    rightRows: R.rows,
    joinType: joinType.value,
    leftKeys: leftKeys.value,
    rightKeys: rightKeys.value,
  })
  store.addTable({
    id: uid('tbl'),
    name: name.value,
    source: {
      type: 'combine',
      joinType: joinType.value,
      leftTableId: L.id,
      rightTableId: R.id,
      leftKeys: leftKeys.value,
      rightKeys: rightKeys.value,
    },
    columns: result.columns,
    rows: result.rows,
    tableFilters: [],
    views: [],
  })
  toast('success', '已添加合并表')
  close()
}
</script>

<style scoped>
.preview-title {
  margin: 8px 0;
  color: #646a73;
  font-size: 13px;
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
  min-height: 88px;
  padding: 4px 6px;
}
</style>
