<script setup lang="ts">
import { computed } from 'vue'
import { getBezierPath } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'
import { IIcon } from '../../ui'
import type { IconName } from '../../ui'
import { portTypeIcon } from '../steps/registry'
import type { PortType } from '../../shared/types'

/**
 * 自定义连线：贝塞尔路径 + 中点数据类型图标（对齐 Benchling 截图：
 * 连线中点渲染白底圆角小方块，图标指示流动的数据类型）。
 * 样式（描边/激活态）沿用 FlowchartCanvas 全局 .vue-flow__edge 规则。
 */
const props = defineProps<EdgeProps>()

const bezier = computed(() =>
  getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  }),
)

const typeIcon = computed<IconName>(
  () => portTypeIcon(((props.data as { portType?: PortType } | undefined)?.portType ?? 'table') as PortType) as IconName,
)
</script>

<template>
  <path :id="String(id)" class="vue-flow__edge-path" :d="bezier[0]" />
  <foreignObject
    :x="bezier[1] - 9"
    :y="bezier[2] - 9"
    :width="18"
    :height="18"
    class="flow-edge-icon"
    style="overflow: visible; pointer-events: none"
  >
    <div class="flow-edge-icon__box" :title="`数据类型：${(props.data as { portType?: string } | undefined)?.portType ?? 'table'}`">
      <IIcon :name="typeIcon" :size="10" />
    </div>
  </foreignObject>
</template>
