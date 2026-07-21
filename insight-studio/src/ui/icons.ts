/**
 * 内联 SVG 图标库（24×24 viewBox，stroke=currentColor）。
 * 每个条目为 <svg> 内部内容；`text` 类型用 fill 渲染字符（Aa / #）。
 */
export type IconName =
  | 'type-text'
  | 'type-number'
  | 'table'
  | 'bar'
  | 'line'
  | 'scatter'
  | 'box'
  | 'pie'
  | 'heatmap'
  | 'gear'
  | 'close'
  | 'plus'
  | 'check'
  | 'warning'
  | 'info'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'arrow-right'
  | 'swap'
  | 'filter'
  | 'download'
  | 'upload'
  | 'drag'
  | 'search'
  | 'more'
  | 'flowchart'
  | 'combine'
  | 'database'
  | 'plate'
  | 'trash'
  | 'edit'
  | 'external'
  | 'dot'
  | 'folder'
  | 'link'
  | 'undo'
  | 'redo'
  | 'eye'
  | 'eye-off'
  | 'sort-asc'
  | 'sort-desc'
  | 'level-up'
  | 'calendar'
  | 'columns'
  | 'flag'
  | 'expand'
  | 'minus'

interface IconDef {
  /** stroke 图标（默认）或 text 图标。 */
  kind: 'stroke' | 'text' | 'fill'
  content: string
  text?: string
}

const S = (content: string): IconDef => ({ kind: 'stroke', content })
const T = (text: string): IconDef => ({ kind: 'text', content: '', text })
const F = (content: string): IconDef => ({ kind: 'fill', content })

export const ICONS: Record<IconName, IconDef> = {
  'type-text': T('Aa'),
  'type-number': T('#'),
  table: S('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M10 10v10"/>'),
  bar: S('<path d="M5 20v-7"/><path d="M10 20V5"/><path d="M15 20v-10"/><path d="M20 20v-14"/><path d="M3 20h18"/>'),
  line: S('<path d="M3 17l5-6 4 3 6-8"/><circle cx="8" cy="11" r="1.2"/><circle cx="12" cy="14" r="1.2"/><circle cx="18" cy="6" r="1.2"/>'),
  scatter: F('<circle cx="7" cy="17" r="1.8"/><circle cx="11" cy="9" r="1.8"/><circle cx="15" cy="14" r="1.8"/><circle cx="18" cy="6" r="1.8"/><circle cx="6" cy="7" r="1.8"/>'),
  box: S('<rect x="7" y="8" width="10" height="8" rx="1"/><path d="M12 4v4"/><path d="M12 16v4"/><path d="M4 12h3"/><path d="M17 12h3"/><path d="M9 4h6"/><path d="M9 20h6"/>'),
  pie: S('<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/><path d="M12 12l6.5 6.2"/>'),
  heatmap: F('<rect x="3" y="3" width="5" height="5" rx="1" opacity=".35"/><rect x="9.5" y="3" width="5" height="5" rx="1" opacity=".7"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="9.5" width="5" height="5" rx="1" opacity=".7"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><rect x="16" y="9.5" width="5" height="5" rx="1" opacity=".35"/><rect x="3" y="16" width="5" height="5" rx="1"/><rect x="9.5" y="16" width="5" height="5" rx="1" opacity=".35"/><rect x="16" y="16" width="5" height="5" rx="1" opacity=".7"/>'),
  gear: S('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  check: S('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  warning: S('<path d="M12 3.5l9.5 16.5H2.5z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".4"/>'),
  info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".4"/>'),
  'chevron-down': S('<path d="M6 9l6 6 6-6"/>'),
  'chevron-up': S('<path d="M6 15l6-6 6 6"/>'),
  'chevron-left': S('<path d="M15 6l-6 6 6 6"/>'),
  'chevron-right': S('<path d="M9 6l6 6-6 6"/>'),
  'arrow-right': S('<path d="M4 12h16"/><path d="M14 6l6 6-6 6"/>'),
  swap: S('<path d="M7 4L3 8l4 4"/><path d="M3 8h14"/><path d="M17 12l4 4-4 4"/><path d="M21 16H7"/>'),
  filter: S('<path d="M3 5h18l-7 8v5.5L10 21v-8z"/>'),
  download: S('<path d="M12 3v11"/><path d="M8 10l4 4 4-4"/><path d="M4 20h16"/>'),
  upload: S('<path d="M12 14V3"/><path d="M8 7l4-4 4 4"/><path d="M4 20h16"/>'),
  drag: F('<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>'),
  search: S('<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5L16 16"/>'),
  more: F('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
  flowchart: S('<rect x="3" y="3" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/><path d="M10 6h4a2 2 0 012 2v7"/>'),
  combine: S('<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>'),
  database: S('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'),
  plate: S('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r=".8"/><circle cx="12" cy="10" r=".8"/><circle cx="16" cy="10" r=".8"/><circle cx="8" cy="14" r=".8"/><circle cx="12" cy="14" r=".8"/><circle cx="16" cy="14" r=".8"/>'),
  trash: S('<path d="M4 7h16"/><path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>'),
  edit: S('<path d="M4 20l.9-3.9L16.6 4.4a2.1 2.1 0 013 3L7.9 19.1z"/>'),
  external: S('<path d="M10 5H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4"/><path d="M14 4h6v6"/><path d="M20 4L11 13"/>'),
  dot: F('<circle cx="12" cy="12" r="4"/>'),
  folder: S('<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>'),
  link: S('<path d="M10 14a5 5 0 007.5.5l2-2a5 5 0 00-7-7l-1.2 1.1"/><path d="M14 10a5 5 0 00-7.5-.5l-2 2a5 5 0 007 7l1.2-1.1"/>'),
  undo: S('<path d="M4 7v6h6"/><path d="M4 13a9 9 0 109-9 9.4 9.4 0 00-6.7 2.8L4 9"/>'),
  redo: S('<path d="M20 7v6h-6"/><path d="M20 13a9 9 0 10-9-9 9.4 9.4 0 016.7 2.8L20 9"/>'),
  eye: S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  'eye-off': S('<path d="M4 4l16 16"/><path d="M9.9 5.9A9.8 9.8 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-3.2 3.9M6.1 6.6A16.6 16.6 0 002.5 12S6 18.5 12 18.5c1.1 0 2.2-.2 3.1-.5"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>'),
  'sort-asc': S('<path d="M7 4v16"/><path d="M3.5 7.5L7 4l3.5 3.5"/><path d="M13 6h8M13 11h6M13 16h4"/>'),
  'sort-desc': S('<path d="M7 4v16"/><path d="M3.5 16.5L7 20l3.5-3.5"/><path d="M13 6h8M13 11h6M13 16h4"/>'),
  'level-up': S('<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/><path d="M5 21h14"/>'),
  calendar: S('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>'),
  columns: S('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>'),
  flag: S('<path d="M5 21V4"/><path d="M5 5h12l-2.5 3.5L17 12H5"/>'),
  expand: S('<path d="M9 4H4v5"/><path d="M4 4l6 6"/><path d="M15 20h5v-5"/><path d="M20 20l-6-6"/>'),
  minus: S('<path d="M5 12h14"/>'),
}
