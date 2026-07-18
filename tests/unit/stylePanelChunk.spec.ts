import { describe, expect, it } from 'vitest'
import { STYLE_PANEL_CHUNK_DEFERRED, stylePanelMountMode } from '@/modules/chart/stylePanelChunk'

describe('stylePanelChunk', () => {
  it('keeps STYLE as sync v-if until draft binding is split', () => {
    expect(STYLE_PANEL_CHUNK_DEFERRED).toBe(true)
    expect(stylePanelMountMode()).toBe('sync-vif')
  })

  it('Round 38 re-eval still defers async STYLE chunk (draft binding)', async () => {
    const { stylePanelRound38Decision } = await import('@/modules/chart/stylePanelChunk')
    expect(stylePanelRound38Decision()).toBe('keep-sync-vif')
  })
})
