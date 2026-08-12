<script setup lang="ts">
/**
 * 报告内嵌数据表预览（前若干行，PDF 走 HTML 表格）。
 */
import { computed } from 'vue'
import type { Analysis } from '../../../shared/types'

const props = withDefaults(
  defineProps<{
    analysis: Analysis | null
    tableId?: string
    maxRows?: number
  }>(),
  { maxRows: 12 },
)

const table = computed(() => props.analysis?.tables.find((t) => t.id === props.tableId) ?? null)

const columns = computed(() => (table.value?.columns ?? []).slice(0, 10))

const rows = computed(() => (table.value?.rows ?? []).slice(0, props.maxRows))

const cell = (row: Record<string, unknown>, field: string) => {
  const v = row[field]
  return v == null ? '' : String(v)
}
</script>

<template>
  <div class="ret">
    <p v-if="!table" class="ret__err">未找到数据表</p>
    <template v-else>
      <div class="ret__scroll">
        <table class="ret__table">
          <thead>
            <tr>
              <th v-for="c in columns" :key="c.field">{{ c.title || c.field }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="i">
              <td v-for="c in columns" :key="c.field">{{ cell(r as Record<string, unknown>, c.field) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="table.rows.length > maxRows" class="ret__more">
        仅展示前 {{ maxRows }} 行（共 {{ table.rows.length }} 行）
      </p>
    </template>
  </div>
</template>

<style scoped>
.ret {
  background: #fff;
  border: 1px solid var(--rp-line, #d8dde3);
}
.ret__scroll {
  overflow: auto;
  max-height: 280px;
}
.ret__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.ret__table th,
.ret__table td {
  border: 1px solid var(--rp-line, #d8dde3);
  padding: 4px 8px;
  text-align: left;
  vertical-align: top;
  white-space: nowrap;
}
.ret__table th {
  background: var(--rp-accent-soft, #e8eef5);
  font-weight: 600;
  position: sticky;
  top: 0;
}
.ret__more,
.ret__err {
  margin: 0;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--rp-muted, #5c6570);
  font-style: italic;
}
</style>
