<template>
  <el-dialog :model-value="modelValue" title="Upload CSV" width="720px" @close="close">
    <div class="grid">
      <div>
        <el-upload drag :auto-upload="false" accept=".csv,text/csv" :show-file-list="false" :on-change="onFile">
          <div class="upload-tip">拖放或选择 CSV 文件</div>
        </el-upload>
        <el-form label-width="90px" style="margin-top: 12px">
          <el-form-item label="Name table">
            <el-input v-model="tableName" />
          </el-form-item>
        </el-form>
      </div>
      <div>
        <div class="preview-title">预览（前 20 行）</div>
        <el-table :data="previewRows" height="280" size="small" border>
          <el-table-column v-for="c in columns" :key="c.field" :prop="c.field" :label="c.title" min-width="100" />
        </el-table>
      </div>
    </div>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :disabled="!rows.length" @click="add">Add table</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Papa from 'papaparse'
import type { UploadFile } from 'element-plus'
import { toast } from '@/shared/ui/feedback'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { buildColumnsFromRows, withRowIds } from '@/shared/utils/schema'
import { uid } from '@/shared/utils/id'
import type { TableColumn } from '@/shared/types/analysis'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const store = useAnalysisStore()

const tableName = ref('')
const rows = ref<Record<string, unknown>[]>([])
const columns = ref<TableColumn[]>([])
const previewRows = ref<Record<string, unknown>[]>([])
const fileName = ref('')

function close() {
  emit('update:modelValue', false)
}

function onFile(file: UploadFile) {
  const raw = file.raw
  if (!raw) return
  fileName.value = raw.name
  tableName.value = raw.name.replace(/\.csv$/i, '')
  Papa.parse(raw, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      if (res.errors?.length) {
        toast('error', 'CSV 解析失败：' + res.errors[0].message)
        rows.value = []
        return
      }
      const data = withRowIds(res.data as Record<string, unknown>[])
      rows.value = data
      columns.value = buildColumnsFromRows(data)
      previewRows.value = data.slice(0, 20)
    },
    error: () => toast('error', 'CSV 解析失败'),
  })
}

function add() {
  store.addTable({
    id: uid('tbl'),
    name: tableName.value || 'Table',
    source: { type: 'csv', fileName: fileName.value },
    columns: columns.value,
    rows: rows.value,
    tableFilters: [],
    views: [],
  })
  toast('success', '已添加表')
  close()
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.upload-tip {
  padding: 24px;
  color: #646a73;
}
.preview-title {
  font-size: 13px;
  margin-bottom: 6px;
  color: #646a73;
}
</style>
