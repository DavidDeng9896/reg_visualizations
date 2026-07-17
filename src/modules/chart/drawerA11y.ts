/** Native ChartEditDrawer tablist keyboard helpers (Round 21). */

export type DrawerTab = 'configure' | 'style'

/** Resolve next CONFIGURE/STYLE tab from Home/End/Arrow keys. */
export function nextDrawerTab(current: DrawerTab, key: string): DrawerTab {
  if (key === 'Home') return 'configure'
  if (key === 'End') return 'style'
  if (key === 'ArrowRight' || key === 'ArrowLeft') {
    return current === 'configure' ? 'style' : 'configure'
  }
  return current
}
