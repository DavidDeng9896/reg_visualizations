<script setup lang="ts">
import { ref } from 'vue'
import { toast } from '../../ui'
import { IIcon } from '../../ui'
import { useAiStore } from '../ai/aiStore'
import logoUrl from '../../assets/mingdu-logo.png'

/**
 * 全局头部（明度风格）：logo + 「科学数据管理」、居中搜索、右侧 AI 助手/通知/全屏/用户。
 * 除 AI 助手外均为占位控件——点击仅提示「即将上线」，不绑定真实业务。
 */
const ai = useAiStore()
const query = ref('')

function placeholder(label: string) {
  toast.info(`「${label}」为占位功能，即将上线`, { title: '占位' })
}

function onSearch() {
  const q = query.value.trim()
  if (q) toast.info(`搜索「${q}」为占位功能，即将上线`, { title: '占位' })
}
</script>

<template>
  <header class="app-header" role="banner">
    <div class="app-header__brand">
      <img class="app-header__logo" :src="logoUrl" alt="明度智云" />
      <span class="app-header__brand-sub">科学数据管理</span>
    </div>

    <div class="app-header__search" role="search">
      <input
        v-model="query"
        type="search"
        class="app-header__search-input"
        placeholder="请输入搜索内容"
        aria-label="搜索"
        @keydown.enter="onSearch"
      />
      <IIcon name="search" :size="14" class="app-header__search-icon" />
    </div>

    <div class="app-header__right">
      <button
        type="button"
        class="app-header__icon-btn app-header__icon-btn--ai"
        aria-label="AI 助手"
        title="AI 助手"
        data-testid="ai-entry"
        @click="ai.toggleDrawer()"
      >
        <IIcon name="sparkle" :size="17" />
      </button>
      <button
        type="button"
        class="app-header__icon-btn"
        aria-label="通知"
        title="通知"
        @click="placeholder('通知')"
      >
        <IIcon name="bell" :size="17" />
      </button>
      <button
        type="button"
        class="app-header__icon-btn"
        aria-label="全屏"
        title="全屏"
        @click="placeholder('全屏')"
      >
        <IIcon name="expand" :size="16" />
      </button>

      <button type="button" class="app-header__user" @click="placeholder('用户菜单')">
        <span class="app-header__avatar" aria-hidden="true" />
        <span class="app-header__user-name">David</span>
        <IIcon name="chevron-down" :size="13" class="app-header__user-caret" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: linear-gradient(90deg, var(--is-header-from) 0%, var(--is-header-to) 100%);
  color: var(--is-text-inverse);
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  white-space: nowrap;
}
.app-header__logo {
  height: 26px;
  max-width: 160px;
  object-fit: contain;
  display: block;
}
.app-header__brand-sub {
  font-size: 15px;
  font-weight: 500;
  padding-left: 12px;
  border-left: 1px solid rgba(255, 255, 255, 0.35);
  letter-spacing: 0.01em;
}

/* 居中搜索 */
.app-header__search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  flex: 0 1 320px;
  margin: 0 auto;
  padding: 0 12px;
  border-radius: var(--is-radius-sm);
  background: rgba(255, 255, 255, 0.14);
  transition: background var(--is-dur-fast) var(--is-ease);
}
.app-header__search:focus-within {
  background: rgba(255, 255, 255, 0.2);
}
.app-header__search-icon {
  opacity: 0.85;
  flex-shrink: 0;
}
.app-header__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--is-text-inverse);
  font-size: 13px;
  outline: none;
}
.app-header__search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.app-header__right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

.app-header__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text-inverse);
  cursor: pointer;
  transition: background var(--is-dur-fast) var(--is-ease);
}
.app-header__icon-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.app-header__user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 6px;
  padding: 4px 6px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text-inverse);
  font-size: 13px;
  cursor: pointer;
  transition: background var(--is-dur-fast) var(--is-ease);
}
.app-header__user:hover {
  background: rgba(255, 255, 255, 0.14);
}
.app-header__avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--is-radius-full);
  background: var(--is-text-inverse);
  flex-shrink: 0;
}
.app-header__user-name {
  white-space: nowrap;
}
.app-header__user-caret {
  opacity: 0.85;
}

/* 窄屏隐藏次要元素 */
@media (max-width: 900px) {
  .app-header__brand-sub,
  .app-header__user-name {
    display: none;
  }
}
@media (max-width: 720px) {
  .app-header__search {
    display: none;
  }
}
</style>
