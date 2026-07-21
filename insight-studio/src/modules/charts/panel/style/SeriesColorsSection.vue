<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { IColorPicker, IPopover, ITextField } from '../../../../ui'
import { paletteColor } from '../../runtime/palette'
import { CHART_DRAFT_CONTEXT } from '../context'

/** STYLE 系列取色：逐系列色块 + picker + 自定义图例标签。 */
const ctx = inject(CHART_DRAFT_CONTEXT)!

const names = computed(() => ctx.seriesNames.value)
const openFor = ref<string | null>(null)

const colorOf = (name: string, i: number) =>
  ctx.draft.style.seriesColors?.[name] ?? paletteColor(ctx.draft.configure.palette, i)

function setColor(name: string, color: string) {
  const style = ctx.draft.style
  if (!style.seriesColors) style.seriesColors = {}
  style.seriesColors[name] = color
  ctx.touch()
}

const labelOf = (name: string) => ctx.draft.style.legend?.labels?.[name] ?? ''

function setLabel(name: string, label: string) {
  const style = ctx.draft.style
  if (!style.legend) style.legend = { show: true, position: 'top' }
  if (!style.legend.labels) style.legend.labels = {}
  if (label.trim()) style.legend.labels[name] = label
  else delete style.legend.labels[name]
  ctx.touch()
}
</script>

<template>
  <section v-if="names.length" class="scolors">
    <h4 class="scolors__title">Series colors</h4>
    <div v-for="(name, i) in names" :key="name" class="scolors__row">
      <IPopover :open="openFor === name" placement="bottom-start" :arrow="false" @update:open="openFor = $event ? name : null">
        <template #anchor>
          <button
            type="button"
            class="scolors__swatch"
            :style="{ background: colorOf(name, i) }"
            :aria-label="`修改「${name}」颜色`"
            @click="openFor = openFor === name ? null : name"
          />
        </template>
        <template #default>
          <div class="scolors__picker">
            <IColorPicker :model-value="colorOf(name, i)" @update:model-value="setColor(name, $event)" />
          </div>
        </template>
      </IPopover>
      <span class="scolors__name is-ellipsis" :title="name">{{ name }}</span>
      <ITextField
        :model-value="labelOf(name)"
        size="sm"
        placeholder="图例标签"
        :aria-label="`「${name}」图例标签`"
        class="scolors__label"
        @update:model-value="setLabel(name, $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.scolors {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 8px;
  border-top: 1px solid var(--is-border);
}
.scolors__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.scolors__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.scolors__swatch {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(16, 24, 40, 0.15);
  flex-shrink: 0;
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.scolors__swatch:hover {
  transform: scale(1.12);
}
.scolors__name {
  flex: 1;
  min-width: 0;
  font-size: var(--is-text-xs);
}
.scolors__label {
  width: 96px;
  flex-shrink: 0;
}
.scolors__picker {
  padding: 10px;
}
</style>
