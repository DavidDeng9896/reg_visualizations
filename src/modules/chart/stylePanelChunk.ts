/**
 * ChartEditDrawer STYLE panel chunk strategy (Round 32 / 38 re-eval).
 *
 * STYLE is still deeply two-way-bound to `draft` in ChartEditDrawer.vue.
 * Splitting into an async SFC would require lifting ~30+ draft.style fields
 * (or passing the whole draft + many emits). Round 28 already gates mount
 * with `v-if="tab === 'style'"` so STYLE DOM is deferred until the tab opens.
 * Round 32: ChartEditDrawer stays async at the workspace boundary; STYLE
 * remains sync-vif inside the drawer (no draft-binding split yet).
 *
 * Round 38: Create idle-warm + overlay focus-ring work does not change the
 * STYLE draft-binding cost. Keep sync `v-if` until a draft-binding split is
 * designed; record the deferral so builds/tests document the decision.
 */

export const STYLE_PANEL_CHUNK_DEFERRED = true

export type StylePanelMountMode = 'sync-vif' | 'async-chunk'

export type StylePanelRound38Decision = 'keep-sync-vif' | 'async-chunk'

export function stylePanelMountMode(): StylePanelMountMode {
  return STYLE_PANEL_CHUNK_DEFERRED ? 'sync-vif' : 'async-chunk'
}

export function stylePanelRound38Decision(): StylePanelRound38Decision {
  return STYLE_PANEL_CHUNK_DEFERRED ? 'keep-sync-vif' : 'async-chunk'
}
