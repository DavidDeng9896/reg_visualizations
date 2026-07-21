/**
 * vxe-table 4.20 的 d.ts 转引自未安装的 vxe-pc-ui，具名组件导出在类型层不可见。
 * 这里按运行时实际导出（es/components.js）补充最小声明。
 */
declare module 'vxe-table' {
  import type { Component } from 'vue'
  export const VxeTable: Component
  export const VxeColumn: Component
  export const VxeColgroup: Component
  export const VxeGrid: Component
  export const VxeToolbar: Component
  export const VXETable: unknown
  export function install(app: unknown, options?: unknown): void
  const VxeUITable: { install(app: unknown, options?: unknown): void }
  export default VxeUITable
}
