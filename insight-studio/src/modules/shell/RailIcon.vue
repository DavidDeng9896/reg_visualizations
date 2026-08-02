<script setup lang="ts">
/**
 * 一级菜单 rail 专用图标：按需求参考图（docs/specs/insight_optimaztion_images/img1.png）
 * 描摹的内联 SVG，stroke=currentColor，24×24 viewBox。
 */
export type RailIconName =
  | 'register'
  | 'compound'
  | 'synthesis'
  | 'ip'
  | 'sequence'
  | 'product'
  | 'analysis'
  | 'settings'
  | 'audit'

withDefaults(defineProps<{ name: RailIconName; size?: number }>(), { size: 20 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- 注册 / IP路线：圆圈 R -->
    <template v-if="name === 'register' || name === 'ip'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 16.2V7.8h2.9a2.3 2.3 0 0 1 0 4.6H9.6" />
      <path d="M11.9 12.4l3 3.8" />
    </template>

    <!-- 化合物：锥形瓶 -->
    <template v-else-if="name === 'compound'">
      <path d="M9.8 3.5h4.4" />
      <path d="M10.4 3.5v5L5.6 17a2.1 2.1 0 0 0 1.9 3.1h9a2.1 2.1 0 0 0 1.9-3.1L13.6 8.5v-5" />
      <path d="M7.6 14.5h8.8" />
    </template>

    <!-- 合成路线：分子/分支 -->
    <template v-else-if="name === 'synthesis'">
      <circle cx="6" cy="6" r="2.6" />
      <circle cx="18" cy="7" r="2.6" />
      <circle cx="9.5" cy="18" r="2.6" />
      <path d="M8.3 7.2l7.2 0" />
      <path d="M7.1 8.4l1.4 7" />
      <path d="M16 9.2l-4.3 6.6" />
    </template>

    <!-- 序列：DNA 双螺旋 -->
    <template v-else-if="name === 'sequence'">
      <path d="M7 4c0 4.8 10 4.8 10 8S7 16.8 7 20" />
      <path d="M17 4c0 4.8-10 4.8-10 8s10 3.2 10 8" />
      <path d="M8.4 6.5h7.2" />
      <path d="M8.4 17.5h7.2" />
    </template>

    <!-- 产品：方块组合 -->
    <template v-else-if="name === 'product'">
      <rect x="9.8" y="3.6" width="4.4" height="4.4" rx="1" />
      <rect x="4" y="10.2" width="4.4" height="4.4" rx="1" />
      <rect x="15.6" y="10.2" width="4.4" height="4.4" rx="1" />
      <rect x="9.8" y="16" width="4.4" height="4.4" rx="1" />
    </template>

    <!-- 数据分析：方框折线图 -->
    <template v-else-if="name === 'analysis'">
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M7.5 15.8l3-4.4 2.4 2.2 3.6-5" />
    </template>

    <!-- 设置：齿轮 -->
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.9v2.7M12 18.4v2.7M2.9 12h2.7M18.4 12h2.7" />
      <path d="M5.6 5.6l1.9 1.9M16.5 16.5l1.9 1.9M18.4 5.6l-1.9 1.9M7.5 16.5l-1.9 1.9" />
    </template>

    <!-- 审计日志：剪贴板 -->
    <template v-else-if="name === 'audit'">
      <rect x="5.5" y="4.8" width="13" height="16.2" rx="2" />
      <rect x="9" y="2.9" width="6" height="3.8" rx="1" />
      <path d="M9 11.2h6M9 14.6h6" />
    </template>
  </svg>
</template>
