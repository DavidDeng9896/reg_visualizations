<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDashboardStore } from '../../stores/dashboardStore'
import { IButton, IEmptyState, IIcon, IModal, IPopover, ITextField, toast } from '../../ui'

const store = useDashboardStore()
const { sortedItems, currentId, loading } = storeToRefs(store)
const router = useRouter()

const createOpen = ref(false)
const createName = ref('')
const creating = ref(false)

const renameOpen = ref(false)
const renameName = ref('')
const menuFor = ref<string | null>(null)

const deleteOpen = ref(false)
const deleteId = ref<string | null>(null)
const deleteName = computed(() => sortedItems.value.find((d) => d.id === deleteId.value)?.name ?? '')

function select(id: string) {
  void router.push(`/dashboards/${id}`)
}

function openCreate() {
  createName.value = ''
  createOpen.value = true
}

async function submitCreate() {
  const name = createName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    const d = await store.create(name)
    createOpen.value = false
    toast.success('看板已创建')
    void router.push(`/dashboards/${d.id}`)
  } finally {
    creating.value = false
  }
}

function openRename(id: string) {
  const d = sortedItems.value.find((x) => x.id === id)
  if (!d) return
  menuFor.value = null
  // 临时选中以便 rename 作用在 current；若不是 current 先 load
  void (async () => {
    if (store.currentId !== id) await store.loadOne(id)
    renameName.value = d.name
    renameOpen.value = true
  })()
}

async function submitRename() {
  const name = renameName.value.trim()
  if (!name) return
  await store.rename(name)
  renameOpen.value = false
  toast.success('已重命名')
}

function openDelete(id: string) {
  menuFor.value = null
  deleteId.value = id
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteId.value) return
  const id = deleteId.value
  const next = await store.remove(id)
  deleteOpen.value = false
  deleteId.value = null
  toast.success('看板已删除')
  if (next) void router.push(`/dashboards/${next}`)
  else void router.push('/dashboards')
}
</script>

<template>
  <aside class="dsb">
    <div class="dsb__head">
      <span class="dsb__label">DASHBOARDS</span>
      <IButton variant="ghost" size="sm" icon="plus" title="新建看板" @click="openCreate" />
    </div>
    <div v-if="loading && !sortedItems.length" class="dsb__hint">加载中…</div>
    <IEmptyState
      v-else-if="!sortedItems.length"
      icon="folder"
      title="还没有看板"
      description="新建一个看板，从多个 Insight 中挑选表和图表拼成总览。"
      class="dsb__empty"
    >
      <IButton variant="primary" size="sm" icon="plus" @click="openCreate">新建看板</IButton>
    </IEmptyState>
    <ul v-else class="dsb__list" role="listbox" aria-label="看板列表">
      <li v-for="d in sortedItems" :key="d.id">
        <div
          class="dsb__item"
          :class="{ 'dsb__item--on': d.id === currentId }"
          role="option"
          :aria-selected="d.id === currentId"
        >
          <button type="button" class="dsb__name is-ellipsis" :title="d.name" @click="select(d.id)">
            {{ d.name }}
          </button>
          <IPopover :open="menuFor === d.id" placement="bottom-end" :arrow="false" @update:open="menuFor = $event ? d.id : null">
            <template #anchor>
              <button type="button" class="dsb__more" aria-label="更多" @click.stop="menuFor = menuFor === d.id ? null : d.id">
                <IIcon name="more" :size="14" />
              </button>
            </template>
            <template #default="{ close }">
              <div class="menu" role="menu">
                <button type="button" class="menu__item" role="menuitem" @click="close(); openRename(d.id)">
                  <IIcon name="edit" :size="13" /> 重命名
                </button>
                <button type="button" class="menu__item menu__item--danger" role="menuitem" @click="close(); openDelete(d.id)">
                  <IIcon name="trash" :size="13" /> 删除
                </button>
              </div>
            </template>
          </IPopover>
        </div>
      </li>
    </ul>

    <IModal :open="createOpen" title="新建看板" :width="400" @update:open="createOpen = $event">
      <label class="form-row">
        <span class="form-row__label">名称</span>
        <ITextField v-model="createName" placeholder="例如：细胞培养 / Assay" autofocus @enter="submitCreate" />
      </label>
      <template #footer>
        <IButton @click="createOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!createName.trim()" :loading="creating" @click="submitCreate">创建</IButton>
      </template>
    </IModal>

    <IModal :open="renameOpen" title="重命名看板" :width="400" @update:open="renameOpen = $event">
      <label class="form-row">
        <span class="form-row__label">名称</span>
        <ITextField v-model="renameName" autofocus @enter="submitRename" />
      </label>
      <template #footer>
        <IButton @click="renameOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!renameName.trim()" @click="submitRename">保存</IButton>
      </template>
    </IModal>

    <IModal :open="deleteOpen" title="删除看板" :width="400" @update:open="deleteOpen = $event">
      <p class="confirm-text">确定删除「{{ deleteName }}」吗？仅删除看板布局，不会删除 Insight 中的表与图表。</p>
      <template #footer>
        <IButton @click="deleteOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmDelete">删除</IButton>
      </template>
    </IModal>
  </aside>
</template>

<style scoped>
.dsb {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--is-surface);
  border-right: 1px solid var(--is-border);
}
.dsb__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 10px 8px 14px;
}
.dsb__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--is-text-tertiary);
}
.dsb__hint {
  padding: 16px;
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
}
.dsb__empty {
  padding: 24px 12px;
}
.dsb__list {
  list-style: none;
  margin: 0;
  padding: 4px 8px 16px;
  overflow: auto;
  flex: 1;
}
.dsb__item {
  display: flex;
  align-items: center;
  gap: 2px;
  border-radius: var(--is-radius-sm);
  margin-bottom: 2px;
}
.dsb__item--on {
  background: var(--is-surface-hover, #f2f4f7);
}
.dsb__name {
  flex: 1;
  min-width: 0;
  text-align: left;
  border: none;
  background: transparent;
  padding: 8px 10px;
  font: inherit;
  font-size: var(--is-text-sm);
  cursor: pointer;
  color: var(--is-text);
  border-radius: var(--is-radius-sm);
}
.dsb__name:hover {
  background: var(--is-surface-hover);
}
.dsb__item--on .dsb__name {
  font-weight: 600;
}
.dsb__more {
  appearance: none;
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--is-text-tertiary);
  opacity: 0;
}
.dsb__item:hover .dsb__more,
.dsb__item--on .dsb__more {
  opacity: 1;
}
.dsb__more:hover {
  background: var(--is-border);
  color: var(--is-text);
}
.menu {
  min-width: 140px;
  padding: 4px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 8px 10px;
  font: inherit;
  font-size: var(--is-text-sm);
  cursor: pointer;
  border-radius: 4px;
  text-align: left;
}
.menu__item:hover {
  background: var(--is-surface-hover);
}
.menu__item--danger {
  color: var(--is-danger);
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-row__label {
  font-size: var(--is-text-sm);
  font-weight: 500;
}
.confirm-text {
  margin: 0;
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.5;
}
</style>
