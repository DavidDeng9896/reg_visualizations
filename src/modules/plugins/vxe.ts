import type { App } from 'vue'
import { VxeTable, VxeColumn } from 'vxe-table'
import { VxeTooltip } from 'vxe-pc-ui'
import 'vxe-table/es/ui/style.css'
import 'vxe-table/es/table/style.css'
import 'vxe-table/es/column/style.css'
import 'vxe-pc-ui/es/tooltip/style.css'

/** 仅注册表格相关组件 + 局部样式，避免全量 vxe-pc-ui */
export function setupVxe(app: App) {
  app.use(VxeTooltip)
  app.use(VxeTable)
  app.use(VxeColumn)
}
