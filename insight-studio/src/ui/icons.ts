/**
 * 图标体系：优先 iconfont-MSP（本地字体包），无合适字形时回退 Lucide。
 * `IconName` 是项目语义名（保持稳定，调用方不用改）。
 */
import type { FunctionalComponent } from 'vue'
import {
  ArrowDownWideNarrow,
  AlignStartHorizontal,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpNarrowWide,
  ArrowUpToLine,
  Calendar,
  ChartCandlestick,
  ChartColumnBig,
  ChartLine,
  ChartPie,
  ChartScatter,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Combine,
  Columns3,
  Database,
  Dot,
  Download,
  Ellipsis,
  ExternalLink,
  Eye,
  EyeOff,
  Flag,
  Folder,
  Funnel,
  Grid3X3,
  Grip,
  GripVertical,
  Hash,
  Hexagon,
  Info,
  Link2,
  LoaderCircle,
  Maximize2,
  Minus,
  PanelBottom,
  PanelRight,
  Pencil,
  PictureInPicture2,
  Play,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Table2,
  Trash2,
  TriangleAlert,
  Type,
  Undo2,
  Redo2,
  RefreshCw,
  Upload,
  Workflow,
  X,
} from 'lucide-vue-next'

export type IconName =
  | 'type-text'
  | 'type-number'
  | 'type-structure'
  | 'table'
  | 'bar'
  | 'line'
  | 'scatter'
  | 'box'
  | 'pie'
  | 'heatmap'
  | 'gear'
  | 'sliders'
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
  | 'refresh'
  | 'eye'
  | 'eye-off'
  | 'sort-asc'
  | 'sort-desc'
  | 'level-up'
  | 'calendar'
  | 'columns'
  | 'flag'
  | 'expand'
  | 'arrange'
  | 'minus'
  | 'spinner'
  | 'play'
  | 'overlay'
  | 'panel-right'
  | 'panel-bottom'

/** iconfont-MSP 的 class（不含通用 `iconfont-MSP` 基类）。 */
export type MspIconClass = `MSP-${string}`

/**
 * 语义名 → MSP 字形。有映射则 IIcon 渲染字体图标；
 * 未映射（或显式 undefined）则走 Lucide 兜底。
 */
export const MSP_ICONS: Partial<Record<IconName, MspIconClass>> = {
  'type-text': 'MSP-Field-String',
  'type-number': 'MSP-Field-number',
  'type-structure': 'MSP-huahewu1',
  table: 'MSP-table',
  bar: 'MSP-barchart',
  line: 'MSP-linechart',
  scatter: 'MSP-pointmap',
  box: 'MSP-boxplot',
  pie: 'MSP-piechart',
  // heatmap：库内无热力图字形 → Lucide
  gear: 'MSP-setting',
  sliders: 'MSP-sliders',
  close: 'MSP-guanbi',
  plus: 'MSP-plus',
  check: 'MSP-check',
  warning: 'MSP-danger_or_warning',
  info: 'MSP-info-circle',
  'chevron-down': 'MSP-icon_down',
  'chevron-up': 'MSP-icon_up',
  'chevron-left': 'MSP-icon_left',
  'chevron-right': 'MSP-icon_right',
  'arrow-right': 'MSP-jiantou',
  swap: 'MSP-swap',
  filter: 'MSP-biaoge-shaixuan',
  // download：无专用下载 → Lucide
  upload: 'MSP-cloud-upload',
  // drag：无拖拽把手 → Lucide
  search: 'MSP-search',
  more: 'MSP-ellipsis',
  flowchart: 'MSP-branches',
  combine: 'MSP-merge-cells',
  database: 'MSP-database',
  plate: 'MSP-shiyanwuliao-kongbanlei',
  trash: 'MSP-delete',
  edit: 'MSP-edit-square',
  external: 'MSP-share',
  // dot：过细，保留 Lucide
  folder: 'MSP-folder1',
  link: 'MSP-link',
  undo: 'MSP-rollback',
  redo: 'MSP-rotate-right',
  refresh: 'MSP-sync',
  eye: 'MSP-View',
  'eye-off': 'MSP-icon_off',
  'sort-asc': 'MSP-biaoge-paixushengxu',
  'sort-desc': 'MSP-biaoge-paixujiangxu',
  'level-up': 'MSP-totop',
  calendar: 'MSP-calendar',
  columns: 'MSP-column-width',
  flag: 'MSP-flag',
  expand: 'MSP-expand',
  arrange: 'MSP-orderedlist',
  minus: 'MSP-minus-square',
  // spinner：旋转动画 Lucide 更合适
  play: 'MSP-bofang1',
  // overlay / panel-*：无对应布局面板字形 → Lucide
}

/** Lucide 兜底（含全部 IconName，保证未映射也能渲染）。 */
export const LUCIDE_ICONS: Record<IconName, FunctionalComponent> = {
  'type-text': Type,
  'type-number': Hash,
  'type-structure': Hexagon,
  table: Table2,
  bar: ChartColumnBig,
  line: ChartLine,
  scatter: ChartScatter,
  box: ChartCandlestick,
  pie: ChartPie,
  heatmap: Grid3X3,
  gear: Settings,
  sliders: SlidersHorizontal,
  close: X,
  plus: Plus,
  check: Check,
  warning: TriangleAlert,
  info: Info,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'arrow-right': ArrowRight,
  swap: ArrowLeftRight,
  filter: Funnel,
  download: Download,
  upload: Upload,
  drag: GripVertical,
  search: Search,
  more: Ellipsis,
  flowchart: Workflow,
  combine: Combine,
  database: Database,
  plate: Grip,
  trash: Trash2,
  edit: Pencil,
  external: ExternalLink,
  dot: Dot,
  folder: Folder,
  link: Link2,
  undo: Undo2,
  redo: Redo2,
  refresh: RefreshCw,
  eye: Eye,
  'eye-off': EyeOff,
  'sort-asc': ArrowUpNarrowWide,
  'sort-desc': ArrowDownWideNarrow,
  'level-up': ArrowUpToLine,
  calendar: Calendar,
  columns: Columns3,
  flag: Flag,
  expand: Maximize2,
  arrange: AlignStartHorizontal,
  minus: Minus,
  spinner: LoaderCircle,
  play: Play,
  overlay: PictureInPicture2,
  'panel-right': PanelRight,
  'panel-bottom': PanelBottom,
}

/** @deprecated 兼容旧引用；请优先用 resolveIcon() / IIcon。 */
export const ICONS = LUCIDE_ICONS

export function resolveMspClass(name: IconName): MspIconClass | undefined {
  return MSP_ICONS[name]
}

export function resolveLucide(name: IconName): FunctionalComponent {
  return LUCIDE_ICONS[name]
}
