import type { App } from 'vue'
import { VxeTable, VxeColumn } from 'vxe-table'
import 'vxe-table/es/ui/style.css'
import 'vxe-table/es/table/style.css'
import 'vxe-table/es/column/style.css'

/** 仅注册表格用到的 Vxe 组件 + 局部样式，避免全量 vxe-pc-ui */
export function setupVxe(app: App) {
  app.use(VxeTable)
  app.use(VxeColumn)
}
