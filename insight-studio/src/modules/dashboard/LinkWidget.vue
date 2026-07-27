<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IButton, IIcon } from '../../ui'

const props = defineProps<{
  url: string
  title?: string
}>()

const embedFailed = ref(false)
const frameLoaded = ref(false)

const safeUrl = computed(() => props.url)

watch(
  () => props.url,
  () => {
    embedFailed.value = false
    frameLoaded.value = false
  },
)

function onFrameLoad() {
  frameLoaded.value = true
}

function onFrameError() {
  embedFailed.value = true
}

function openExternal() {
  window.open(safeUrl.value, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="lw">
    <div class="lw__bar">
      <span class="lw__url is-ellipsis" :title="safeUrl">{{ safeUrl }}</span>
      <IButton size="sm" variant="secondary" icon="external" @click="openExternal">新标签打开</IButton>
    </div>
    <div class="lw__frame-wrap">
      <iframe
        v-if="!embedFailed"
        class="lw__frame"
        :src="safeUrl"
        :title="title || '外部链接预览'"
        referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        @load="onFrameLoad"
        @error="onFrameError"
      />
      <div v-if="embedFailed" class="lw__fallback">
        <IIcon name="warning" :size="18" />
        <p>该站点不允许嵌入预览，请用新标签打开查看。</p>
        <IButton size="sm" variant="primary" icon="external" @click="openExternal">打开链接</IButton>
      </div>
      <div v-else-if="!frameLoaded" class="lw__loading">加载预览…</div>
    </div>
  </div>
</template>

<style scoped>
.lw {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.lw__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.lw__url {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  color: var(--is-text-tertiary);
  font-family: var(--is-font-mono, ui-monospace, monospace);
}
.lw__frame-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  background: var(--is-surface-muted, #f9fafb);
}
.lw__frame {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}
.lw__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  background: var(--is-surface);
}
.lw__loading {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 6px 10px;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  color: var(--is-text-tertiary);
  font-size: 12px;
  pointer-events: none;
}
.lw__fallback p {
  margin: 0;
  max-width: 280px;
}
</style>
