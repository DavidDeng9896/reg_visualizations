<script setup lang="ts">
import { ref } from 'vue'
import { toast } from '../../ui'
import { IIcon } from '../../ui'

/**
 * 全局头部（mingdu-header）：品牌、副标题、居中搜索、右侧审批/应用/帮助/通知/用户。
 * 全部为占位控件——点击仅提示「即将上线」，不绑定真实业务。
 */
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
    <RouterLink to="/" class="app-header__brand" aria-label="回到首页">
      <span class="app-header__logo">IS</span>
      <span class="app-header__brand-name">Insight Studio</span>
    </RouterLink>
    <span class="app-header__brand-sub">科学数据 · 数据分析</span>

    <div class="app-header__search" role="search">
      <IIcon name="search" :size="14" class="app-header__search-icon" />
      <input
        v-model="query"
        type="search"
        class="app-header__search-input"
        placeholder="搜索…"
        aria-label="搜索"
        @keydown.enter="onSearch"
      />
    </div>

    <div class="app-header__right">
      <button type="button" class="app-header__text-btn" @click="placeholder('审批')">
        审批
        <span class="app-header__badge">5</span>
      </button>
      <button type="button" class="app-header__text-btn" @click="placeholder('发起审批')">发起审批</button>

      <button
        type="button"
        class="app-header__icon-btn"
        aria-label="应用切换"
        title="应用切换"
        @click="placeholder('应用切换')"
      >
        <IIcon name="apps" :size="17" />
      </button>
      <button
        type="button"
        class="app-header__icon-btn"
        aria-label="帮助"
        title="帮助"
        @click="placeholder('帮助')"
      >
        <IIcon name="help" :size="17" />
      </button>
      <button
        type="button"
        class="app-header__icon-btn app-header__icon-btn--dot"
        aria-label="通知"
        title="通知"
        @click="placeholder('通知')"
      >
        <IIcon name="bell" :size="16" />
        <span class="app-header__badge app-header__badge--floating">567</span>
      </button>

      <button type="button" class="app-header__user" @click="placeholder('用户菜单')">
        <span class="app-header__avatar">郑</span>
        <span class="app-header__user-name">郑小伟</span>
        <IIcon name="chevron-down" :size="12" class="app-header__user-caret" />
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
  gap: 8px;
  padding: 0 12px;
  background: var(--is-primary);
  color: var(--is-text-inverse);
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--is-text-inverse);
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  text-decoration: none;
}
.app-header__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--is-radius-sm);
  background: rgba(255, 255, 255, 0.15);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.app-header__brand-name {
  font-size: 15px;
}
.app-header__brand-sub {
  font-size: 13px;
  font-weight: 400;
  opacity: 0.92;
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.3);
  white-space: nowrap;
}

/* 居中搜索 */
.app-header__search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  flex: 0 1 320px;
  margin: 0 auto;
  padding: 0 10px;
  border-radius: var(--is-radius);
  background: rgba(255, 255, 255, 0.12);
  transition: background var(--is-dur-fast) var(--is-ease);
}
.app-header__search:focus-within {
  background: rgba(255, 255, 255, 0.18);
}
.app-header__search-icon {
  opacity: 0.7;
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
  color: rgba(255, 255, 255, 0.55);
}

.app-header__right {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}

.app-header__text-btn {
  position: relative;
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: var(--is-radius);
  background: transparent;
  color: var(--is-text-inverse);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: background var(--is-dur-fast) var(--is-ease);
}
.app-header__text-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.app-header__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--is-radius);
  background: transparent;
  color: var(--is-text-inverse);
  cursor: pointer;
  transition: background var(--is-dur-fast) var(--is-ease);
}
.app-header__icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
.app-header__icon-btn--dot {
  position: relative;
}

.app-header__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 9px;
  background: #ff6b6b;
  color: #fff;
  font-size: 11px;
  line-height: 1;
  font-weight: 600;
}
.app-header__badge--floating {
  position: absolute;
  top: -2px;
  right: -3px;
}

.app-header__user {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
  padding: 3px 6px;
  border: none;
  border-radius: var(--is-radius);
  background: transparent;
  color: var(--is-text-inverse);
  font-size: 13px;
  cursor: pointer;
  transition: background var(--is-dur-fast) var(--is-ease);
}
.app-header__user:hover {
  background: rgba(255, 255, 255, 0.12);
}
.app-header__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--is-radius-full);
  background: rgba(255, 255, 255, 0.18);
  font-size: 12px;
  font-weight: 600;
}
.app-header__user-name {
  white-space: nowrap;
}
.app-header__user-caret {
  opacity: 0.75;
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
