<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { IButton, IIcon, IPopover } from '../../ui'
import { useAiStore, type TraceItem } from './aiStore'
import AiMessageList from './AiMessageList.vue'
import AiInputBar from './AiInputBar.vue'
import AiSettingsModal from './AiSettingsModal.vue'

/** AI 助手全局抽屉：会话切换 + 消息流 + 输入条。 */
const ai = useAiStore()
const { drawerOpen, settingsOpen, conversations, currentId, messages, running } = storeToRefs(ai)
const historyOpen = ref(false)

onMounted(() => {
  void ai.init()
})

async function onSelectConversation(id: string | number) {
  if (!id) return
  await ai.selectConversation(String(id))
}

async function onConfirm(item: TraceItem): Promise<void> {
  await ai.confirmAndResume(item.id, item.name, item.summary.replace(/^NEEDS_CONFIRMATION:\s*/, ''))
}
</script>

<template>
  <Teleport to="body">
    <Transition name="ai-drawer">
      <aside v-if="drawerOpen" class="ai-drawer" aria-label="AI 助手" data-testid="ai-drawer">
        <header class="ai-drawer__head">
          <div class="ai-drawer__title">
            <IIcon name="sparkle" :size="16" class="ai-drawer__logo" />
            <span>AI 助手</span>
          </div>
          <div class="ai-drawer__actions">
            <IPopover :open="historyOpen" placement="bottom-end" :arrow="false" @update:open="historyOpen = $event">
              <template #anchor>
                <button type="button" class="ai-drawer__btn" title="会话历史" aria-label="会话历史" @click="historyOpen = !historyOpen">
                  <IIcon name="calendar" :size="15" />
                </button>
              </template>
              <template #default="{ close }">
                <div class="ai-drawer__convlist" role="menu">
                  <button v-if="!conversations.length" type="button" class="ai-drawer__conv" disabled>暂无历史会话</button>
                  <div
                    v-for="c in conversations"
                    :key="c.id"
                    class="ai-drawer__conv"
                    :class="{ 'ai-drawer__conv--on': c.id === currentId }"
                    role="menuitem"
                    tabindex="0"
                    @click="close(); onSelectConversation(c.id)"
                    @keydown.enter="close(); onSelectConversation(c.id)"
                  >
                    <span class="is-ellipsis">{{ c.title }}</span>
                    <button
                      type="button"
                      class="ai-drawer__conv-del"
                      aria-label="删除会话"
                      @click.stop="ai.removeConversation(c.id)"
                    >
                      <IIcon name="trash" :size="12" />
                    </button>
                  </div>
                </div>
              </template>
            </IPopover>
            <button type="button" class="ai-drawer__btn" title="新会话" aria-label="新会话" data-testid="ai-newconv" @click="ai.newConversation()">
              <IIcon name="plus" :size="15" />
            </button>
            <button type="button" class="ai-drawer__btn" title="AI 设置" aria-label="AI 设置" data-testid="ai-settings" @click="settingsOpen = true">
              <IIcon name="gear" :size="15" />
            </button>
            <button type="button" class="ai-drawer__btn" title="关闭" aria-label="关闭" @click="drawerOpen = false">
              <IIcon name="close" :size="15" />
            </button>
          </div>
        </header>

        <div class="ai-drawer__body">
          <div v-if="!messages.length" class="ai-drawer__empty">
            <IIcon name="sparkle" :size="28" class="ai-drawer__empty-icon" />
            <p>我是平台内置的分析助手，可以帮你建表、加工数据、配图表、做看板。</p>
            <p class="ai-drawer__hint">试试：「把当前表画成散点图并加线性拟合」</p>
          </div>
          <AiMessageList v-else :messages="messages" @confirm="onConfirm" @retry="ai.retry()" />
          <div v-if="running" class="ai-drawer__running">正在生成…</div>
        </div>

        <AiInputBar />
        <AiSettingsModal :open="settingsOpen" @update:open="settingsOpen = $event" @saved="ai.init()" />
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ai-drawer {
  position: fixed;
  top: 48px;
  right: 0;
  bottom: 0;
  width: 480px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  background: var(--is-bg);
  border-left: 1px solid var(--is-border);
  box-shadow: var(--is-shadow-lg);
  z-index: var(--is-z-modal);
}
.ai-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--is-surface);
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.ai-drawer__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--is-text-md);
  font-weight: 600;
}
.ai-drawer__logo {
  color: var(--is-accent);
}
.ai-drawer__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.ai-drawer__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text-secondary);
  cursor: pointer;
}
.ai-drawer__btn:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.ai-drawer__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.ai-drawer__empty {
  padding: 40px 28px;
  text-align: center;
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
  line-height: 1.8;
}
.ai-drawer__empty-icon {
  color: var(--is-accent);
  margin-bottom: 10px;
}
.ai-drawer__hint {
  color: var(--is-text-tertiary);
  font-size: var(--is-text-xs);
}
.ai-drawer__running {
  padding: 0 14px 8px;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.ai-drawer__convlist {
  display: flex;
  flex-direction: column;
  padding: 4px;
  width: 240px;
  max-height: 300px;
  overflow-y: auto;
}
.ai-drawer__conv {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  font-size: var(--is-text-sm);
  color: var(--is-text);
  text-align: left;
  cursor: pointer;
}
.ai-drawer__conv:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.ai-drawer__conv--on {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.ai-drawer__conv span {
  flex: 1;
  min-width: 0;
}
.ai-drawer__conv-del {
  border: none;
  background: transparent;
  color: var(--is-text-tertiary);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  opacity: 0;
}
.ai-drawer__conv:hover .ai-drawer__conv-del {
  opacity: 1;
}
.ai-drawer__conv-del:hover {
  color: var(--is-danger);
}

.ai-drawer-enter-active,
.ai-drawer-leave-active {
  transition:
    transform var(--is-dur) var(--is-ease),
    opacity var(--is-dur) var(--is-ease);
}
.ai-drawer-enter-from,
.ai-drawer-leave-to {
  transform: translateX(40px);
  opacity: 0;
}
</style>
