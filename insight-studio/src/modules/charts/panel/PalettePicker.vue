<script setup lang="ts">
import { computed, ref } from 'vue'
import { IPopover } from '../../../ui'
import { CATEGORICAL_PALETTES, CONTINUOUS_PALETTES } from '../runtime/palette'

/** 色板选择：触发器 = 色条预览 + 名称；弹层逐套预览。 */
const props = withDefaults(defineProps<{ modelValue?: string; continuous?: boolean }>(), { continuous: false })
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const open = ref(false)
const palettes = computed(() => (props.continuous ? CONTINUOUS_PALETTES : CATEGORICAL_PALETTES))
const current = computed(() => palettes.value.find((p) => p.id === props.modelValue) ?? palettes.value[0])

function pick(id: string) {
  emit('update:modelValue', id)
  open.value = false
}

const stopsOf = (p: { colors?: string[]; stops?: string[] }) => p.colors ?? p.stops ?? []
</script>

<template>
  <IPopover :open="open" placement="bottom-start" :arrow="false" @update:open="open = $event">
    <template #anchor>
      <button type="button" class="palette" @click="open = !open">
        <span class="palette__strip">
          <span
            v-for="(c, i) in stopsOf(current).slice(0, 8)"
            :key="i"
            class="palette__chip"
            :style="{ background: c }"
          />
        </span>
        <span class="palette__name is-ellipsis">{{ current.label }}</span>
      </button>
    </template>
    <template #default>
      <div class="palette__list" role="listbox" aria-label="色板">
        <button
          v-for="p in palettes"
          :key="p.id"
          type="button"
          class="palette__item"
          :class="{ 'palette__item--active': p.id === current.id }"
          role="option"
          :aria-selected="p.id === current.id"
          @click="pick(p.id)"
        >
          <span class="palette__strip">
            <span v-for="(c, i) in stopsOf(p).slice(0, 10)" :key="i" class="palette__chip" :style="{ background: c }" />
          </span>
          <span class="palette__name">{{ p.label }}</span>
        </button>
      </div>
    </template>
  </IPopover>
</template>

<style scoped>
.palette {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  transition: border-color var(--is-dur-fast) var(--is-ease);
}
.palette:hover {
  border-color: var(--is-accent);
}
.palette__strip {
  display: inline-flex;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}
.palette__chip {
  width: 12px;
  height: 12px;
}
.palette__name {
  color: var(--is-text);
}
.palette__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  min-width: 220px;
}
.palette__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
}
.palette__item:hover {
  background: var(--is-surface-hover);
}
.palette__item--active {
  background: var(--is-accent-soft);
}
</style>
