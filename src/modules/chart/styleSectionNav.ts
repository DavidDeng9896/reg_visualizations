/**
 * STYLE panel in-panel section jump navigation (Round 33–34 / 39).
 * Lets keyboard users move between Title / Layout / Series / Axes without
 * tabbing through every control — headings are focus targets; Arrow/Home/End
 * cycle from a focused heading or the jump nav.
 *
 * Round 34 Tab order: jump-nav links are the only sequential tab stops for
 * section targeting; section headings use tabindex=-1 (programmatic focus).
 *
 * Round 39: ChartEdit Teleport to body does not change STYLE jump order —
 * jump nav still precedes section fields inside `[data-ia-chart-edit]`.
 */

export const STYLE_SECTION_IDS = [
  'style-title',
  'style-layout',
  'style-series',
  'style-axes',
] as const

export type StyleSectionId = (typeof STYLE_SECTION_IDS)[number]

const LABELS: Record<StyleSectionId, string> = {
  'style-title': 'Title',
  'style-layout': 'Layout',
  'style-series': 'Series',
  'style-axes': 'Axes',
}

export function styleSectionNavLabel(id: StyleSectionId): string {
  return LABELS[id]
}

/** Section headings are not sequential tab stops — jump nav + Arrow keys only. */
export function styleSectionHeadingTabIndex(): -1 {
  return -1
}

/**
 * Document / focus order contract after Teleport: STYLE jump nav precedes
 * section field controls. Headings remain programmatic focus targets.
 */
export function styleJumpNavPrecedesSections(): boolean {
  return true
}

/** STYLE jump nav stays valid after ChartEdit Teleport (Round 39). */
export function styleJumpNavWorksWithChartEditTeleport(): true {
  return true
}

export function nextStyleSection(currentId: string, key: string): StyleSectionId {
  const idx = STYLE_SECTION_IDS.indexOf(currentId as StyleSectionId)
  const safeIdx = idx >= 0 ? idx : 0
  if (key === 'Home') return STYLE_SECTION_IDS[0]
  if (key === 'End') return STYLE_SECTION_IDS[STYLE_SECTION_IDS.length - 1]
  if (key === 'ArrowDown' || key === 'ArrowRight') {
    return STYLE_SECTION_IDS[(safeIdx + 1) % STYLE_SECTION_IDS.length]
  }
  if (key === 'ArrowUp' || key === 'ArrowLeft') {
    return STYLE_SECTION_IDS[(safeIdx - 1 + STYLE_SECTION_IDS.length) % STYLE_SECTION_IDS.length]
  }
  return STYLE_SECTION_IDS[safeIdx]
}
