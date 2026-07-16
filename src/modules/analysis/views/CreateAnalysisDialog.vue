<template>
  <el-dialog :model-value="modelValue" title="创建 Analysis" width="420px" @close="emit('update:modelValue', false)">
    <el-form label-width="80px">
      <el-form-item label="名称" required>
        <el-input v-model="name" placeholder="例如 Dose Response" />
      </el-form-item>
      <el-form-item label="项目" required>
        <el-select v-model="projectId" style="width: 100%">
          <el-option v-for="p in MOCK_PROJECTS" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!name.trim() || !projectId" @click="submit">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { MOCK_PROJECTS } from '@/shared/mock/projects'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  create: [{ name: string; projectId: string }]
}>()

const name = ref('')
const projectId = ref(MOCK_PROJECTS[0].id)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      name.value = ''
      projectId.value = MOCK_PROJECTS[0].id
    }
  },
)

function submit() {
  const n = name.value.trim()
  if (!n || !projectId.value) return
  emit('create', { name: n, projectId: projectId.value })
}
</script>
