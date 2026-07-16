<template>
  <aside class="sidebar">
    <el-input v-model="q" placeholder="搜索表 / 视图" clearable size="small" class="search" />
    <div class="section-head">
      <span>ANALYSIS DATA</span>
      <el-dropdown trigger="click" @command="(c: string) => emit('add-data', c)">
        <el-button size="small" text>+</el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="csv">From CSV</el-dropdown-item>
            <el-dropdown-item command="combine">By combining tables</el-dropdown-item>
            <el-dropdown-item disabled command="registry">From Registry</el-dropdown-item>
            <el-dropdown-item disabled command="plate">From Plate</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <el-tree
      :data="treeData"
      node-key="id"
      default-expand-all
      highlight-current
      :expand-on-click-node="false"
      :current-node-key="store.selectedNodeId || undefined"
      @node-click="onClick"
    >
      <template #default="{ data }">
        <div class="node">
          <span class="label">{{ data.label }}</span>
          <span class="ops" @click.stop>
            <el-dropdown trigger="click" @command="(c: string) => onMenu(c, data)">
              <el-button size="small" text>⋯</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="new-view">New view</el-dropdown-item>
                  <el-dropdown-item command="rename">重命名</el-dropdown-item>
                  <el-dropdown-item command="jump">跳转到流程图</el-dropdown-item>
                  <el-dropdown-item v-if="data.kind === 'view'" command="promote">提升为表</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </span>
        </div>
      </template>
    </el-tree>

    <div class="footer">
      <el-button class="ext" @click="ElMessage.info('Connect with external tool：后续版本')">
        Connect with external tool
      </el-button>
    </div>

    <el-dialog v-model="showNewView" title="新建视图" width="400px">
      <el-form label-width="90px">
        <el-form-item label="名称">
          <el-input v-model="newViewName" />
        </el-form-item>
        <el-form-item label="View Type">
          <el-select v-model="newViewType" style="width: 100%">
            <el-option v-for="t in viewTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNewView = false">取消</el-button>
        <el-button type="primary" @click="createView">创建</el-button>
      </template>
    </el-dialog>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import type { ViewType } from '@/shared/types/analysis'

const emit = defineEmits<{ 'add-data': [string]; 'jump-flowchart': [string] }>()
const store = useAnalysisStore()
const q = ref('')
const showNewView = ref(false)
const newViewName = ref('New view')
const newViewType = ref<ViewType>('table')
const newViewParent = ref<{ tableId: string; parentId: string } | null>(null)
const viewTypes: ViewType[] = ['table', 'bar', 'line', 'scatter', 'box', 'pie', 'heatmap']

type TreeNode = {
  id: string
  label: string
  kind: 'table' | 'view'
  tableId: string
  children?: TreeNode[]
}

const treeData = computed(() => {
  const a = store.current
  if (!a) return []
  const match = (s: string) => !q.value || s.toLowerCase().includes(q.value.toLowerCase())
  const mapViews = (views: typeof a.tables[0]['views'], tableId: string): TreeNode[] =>
    views
      .map((v) => ({
        id: v.id,
        label: `${v.name} (${v.viewType})`,
        kind: 'view' as const,
        tableId,
        children: mapViews(v.children, tableId),
      }))
      .filter((n) => match(n.label) || (n.children && n.children.length))

  return a.tables
    .map((t) => ({
      id: t.id,
      label: t.name,
      kind: 'table' as const,
      tableId: t.id,
      children: mapViews(t.views, t.id),
    }))
    .filter((n) => match(n.label) || (n.children && n.children.length))
})

function onClick(data: TreeNode) {
  store.selectNode(data.id, 'workspace')
}

function onMenu(cmd: string, data: TreeNode) {
  if (cmd === 'new-view') {
    newViewParent.value = { tableId: data.tableId, parentId: data.id }
    newViewName.value = 'New view'
    newViewType.value = 'table'
    showNewView.value = true
  } else if (cmd === 'rename') {
    ElMessageBox.prompt('新名称', '重命名', { inputValue: data.label.replace(/ \(.*\)$/, '') }).then(({ value }) => {
      store.renameNode(data.id, value)
    })
  } else if (cmd === 'jump') {
    emit('jump-flowchart', data.id)
  } else if (cmd === 'promote') {
    store.selectNode(data.id, 'workspace')
    store.promoteViewToTable(data.id)
    ElMessage.success('已提升为 Analysis 表')
  } else if (cmd === 'delete') {
    ElMessageBox.confirm('确定删除？子视图将一并删除。', '确认').then(() => {
      const r = store.deleteNode(data.id)
      if (!r.ok) ElMessage.error(r.reason || '删除失败')
      else ElMessage.success('已删除')
    })
  }
}

function createView() {
  if (!newViewParent.value) return
  store.addView(
    newViewParent.value.tableId,
    newViewParent.value.parentId,
    newViewName.value,
    newViewType.value,
  )
  showNewView.value = false
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  background: var(--ia-sidebar);
  border-right: 1px solid var(--ia-border);
  display: flex;
  flex-direction: column;
  padding: 10px;
}
.search {
  margin-bottom: 8px;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #646a73;
  margin-bottom: 6px;
}
.node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 4px;
}
.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.footer {
  margin-top: auto;
  padding-top: 10px;
}
.ext {
  width: 100%;
}
</style>
