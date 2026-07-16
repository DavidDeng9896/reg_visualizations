import type { App } from 'vue'
import { VxeTable, VxeColumn } from 'vxe-table'
import 'vxe-table/es/ui/style.css'
import 'vxe-table/es/table/style.css'
import 'vxe-table/es/column/style.css'

/**
 * 仅注册表格用到的 Vxe 组件 + 局部样式。
 * 溢出用 show-overflow="title"（原生 title），避免引入 vxe-pc-ui Tooltip 全量依赖。
 */
export function setupVxe(app: App) {
  app.use(VxeTable)
  app.use(VxeColumn)
}
