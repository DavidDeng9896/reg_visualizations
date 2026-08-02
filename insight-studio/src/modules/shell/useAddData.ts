import { ref } from 'vue'

/**
 * Add data 菜单的全局开关：二级侧栏「+」锚点弹出，
 * 流程图空态等处的 Add data 按钮也可触发同一菜单。
 */
const open = ref(false)

export function useAddData() {
  function openMenu() {
    open.value = true
  }
  function closeMenu() {
    open.value = false
  }
  return { open, openMenu, closeMenu }
}
