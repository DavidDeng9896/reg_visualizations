<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { ROW_ID_FIELD } from '../../shared/types'
import type { WidgetResolveOk } from './widgetData'

/** structure 列渲染化合物结构图（RDKit wasm 按需加载）。 */
const StructureCellView = defineAsyncComponent(() => import('../table/structure/StructureCell.vue'))

const props = defineProps<{
  source: WidgetResolveOk
}>()

const columns = computed(() => props.source.result.columns)
const rows = computed(() => props.source.result.rows.slice(0, 200))
const truncated = computed(() => props.source.result.totalRows > rows.value.length)
</script>

<template>
  <div class="tw">
    <div class="tw__scroll">
      <table class="tw__table">
        <thead>
          <tr>
            <th v-for="c in columns" :key="c.field">{{ c.title }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="String(row[ROW_ID_FIELD] ?? i)">
            <td v-for="c in columns" :key="c.field">
              <StructureCellView
                v-if="c.dataType === 'structure'"
                :value="row[c.field] == null ? null : String(row[c.field])"
                compact
              />
              <template v-else>{{ row[c.field] == null ? '' : String(row[c.field]) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="truncated" class="tw__note">
      显示前 {{ rows.length }} / {{ source.result.totalRows }} 行
    </p>
  </div>
</template>

<style scoped>
.tw {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.tw__scroll {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
.tw__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.tw__table th,
.tw__table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--is-border);
  text-align: left;
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tw__table th {
  position: sticky;
  top: 0;
  background: var(--is-surface-muted, #f9fafb);
  font-weight: 600;
  z-index: 1;
}
.tw__note {
  margin: 0;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--is-text-tertiary);
  border-top: 1px solid var(--is-border);
  flex-shrink: 0;
}
</style>
