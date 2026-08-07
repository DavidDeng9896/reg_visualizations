/**
 * 图标体系：统一使用 Lucide（lucide-vue-next，24×24 viewBox，stroke=currentColor）。
 * `IconName` 是项目语义名（保持稳定，调用方不用改），此处做语义名 → Lucide 组件的映射。
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
  History,
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
  Sparkles,
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
  Bell,
  CircleHelp,
  LayoutGrid,
  ClipboardList,
  Send,
  UserRound,
  SquareChartGantt,
  ArrowUp,
  ShieldCheck,
  CircleAlert,
  Paperclip,
  File,
  FileText,
  Image,
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
  | 'bignumber'
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
  | 'arrow-up'
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
  | 'bell'
  | 'help'
  | 'apps'
  | 'approval'
  | 'send'
  | 'user'
  | 'grid'
  | 'sparkle'
  | 'history'
  | 'shield-check'
  | 'circle-alert'
  | 'paperclip'
  | 'file'
  | 'file-text'
  | 'image'

export const ICONS: Record<IconName, FunctionalComponent> = {
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
  bignumber: Hash,
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
  'arrow-up': ArrowUp,
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
  bell: Bell,
  help: CircleHelp,
  apps: LayoutGrid,
  approval: ClipboardList,
  send: Send,
  user: UserRound,
  grid: SquareChartGantt,
  sparkle: Sparkles,
  history: History,
  'shield-check': ShieldCheck,
  'circle-alert': CircleAlert,
  paperclip: Paperclip,
  file: File,
  'file-text': FileText,
  image: Image,
}
