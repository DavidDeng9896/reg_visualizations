# Theme — 设计令牌与全局样式

> **无 Tailwind**。样式方案 = 两个全局 CSS 文件 + 各组件 `<style scoped>`（BEM 风格 `is-*` 类名）。
> 所有设计 token 定义为 CSS 变量（`--is-*`，`is` = Insight Studio），集中维护于 `src/styles/tokens.css`。
> 加载顺序（`src/app/main.ts`）：`tokens.css` → `base.css`。

## Token 速查

- **颜色**：品牌主色 `--is-primary: #1e2a78`（深蓝，主按钮）；强调蓝 `--is-accent: #2e5bff`（链接/聚焦/选中）；成功 `#1f9d66`；危险 `#d92d20`；警告条 `#fdf3d7`/`#8a6d1a`。中性：页面底 `#f7f8fa`，卡片 `#fff`，边框 `#e4e7ec`/`#d0d5dd`，三级文字 `#1d2939`/`#667085`/`#98a2b3`。
- **间距**：`--is-space-*` = 4/8/12/16/20/24/32/40px。
- **圆角**：`--is-radius-sm: 6px`（控件）、`--is-radius: 8px`（卡片/浮层）、`--is-radius-lg: 12px`（弹窗）、`--is-radius-full: 999px`（chip/开关）。
- **阴影**：`--is-shadow-sm/md/lg`（卡片→浮层→弹窗三级）；聚焦环 `--is-ring: 0 0 0 3px rgba(46,91,255,.22)`。
- **字号**：`--is-text-xs/sm/md/lg` = 12/13/14/16px（正文 13px）。
- **动效**：`--is-ease: cubic-bezier(0.33,1,0.68,1)`；时长 150/200/250ms。
- **层级**：popover 1200 / modal 1300 / dropdown 1350 / toast 1400。
- **字体**：系统栈（含 PingFang SC / 微软雅黑）；`--is-font-mono` 等宽栈。
- **控件高度约定**（散见于组件源码）：md = 32px、sm = 28px，按钮/输入框/下拉三者一致。
- **图表预设色板**：`src/ui/colors.ts` 的 `PRESET_COLORS`（16 色，Benchling 风格）。

## `insight-studio/src/styles/tokens.css`（完整内容）

```css
/* Insight Studio — 设计令牌（DESIGN.md §2 视觉语言） */
:root {
  /* 颜色 */
  --is-primary: #1e2a78;
  --is-primary-hover: #27359a;
  --is-primary-active: #182160;
  --is-accent: #2e5bff;
  --is-accent-hover: #1f49e0;
  --is-accent-soft: #eef2ff;
  --is-success: #1f9d66;
  --is-success-soft: #eefaf3;
  --is-danger: #d92d20;
  --is-danger-hover: #b42318;
  --is-danger-soft: #fef3f2;
  --is-warning-bg: #fdf3d7;
  --is-warning-text: #8a6d1a;
  --is-info: #2e5bff;

  --is-bg: #f7f8fa;
  --is-surface: #ffffff;
  --is-surface-hover: #f2f4f7;
  --is-border: #e4e7ec;
  --is-border-strong: #d0d5dd;

  --is-text: #1d2939;
  --is-text-secondary: #667085;
  --is-text-tertiary: #98a2b3;
  --is-text-inverse: #ffffff;

  --is-node-bg: #eefaf3;

  /* 间距 */
  --is-space-1: 4px;
  --is-space-2: 8px;
  --is-space-3: 12px;
  --is-space-4: 16px;
  --is-space-5: 20px;
  --is-space-6: 24px;
  --is-space-8: 32px;
  --is-space-10: 40px;

  /* 圆角 */
  --is-radius-sm: 6px;
  --is-radius: 8px;
  --is-radius-lg: 12px;
  --is-radius-full: 999px;

  /* 阴影 */
  --is-shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.05);
  --is-shadow-md: 0 4px 12px rgba(16, 24, 40, 0.1);
  --is-shadow-lg: 0 12px 32px rgba(16, 24, 40, 0.16);
  --is-ring: 0 0 0 3px rgba(46, 91, 255, 0.22);

  /* 字号 */
  --is-text-xs: 12px;
  --is-text-sm: 13px;
  --is-text-md: 14px;
  --is-text-lg: 16px;

  /* 动效 */
  --is-ease: cubic-bezier(0.33, 1, 0.68, 1);
  --is-dur-fast: 150ms;
  --is-dur: 200ms;
  --is-dur-slow: 250ms;

  /* 层级（teleport 到 body 后仍保持相对顺序；dropdown 高于 popover/modal 以便嵌套） */
  --is-z-popover: 1200;
  --is-z-modal: 1300;
  --is-z-dropdown: 1350;
  --is-z-toast: 1400;

  /* 字体 */
  --is-font:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --is-font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}
```

## `insight-studio/src/styles/base.css`（完整内容）

```css
/* reset + 基础排版 + 滚动条美化 */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
}

body {
  margin: 0;
  font-family: var(--is-font);
  font-size: var(--is-text-sm);
  line-height: 1.5;
  color: var(--is-text);
  background: var(--is-bg);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1,
h2,
h3,
h4,
p,
figure {
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}

a {
  color: var(--is-accent);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

/* 键盘焦点环（全局兜底，组件内部可覆盖） */
:focus-visible {
  outline: none;
  box-shadow: var(--is-ring);
  border-radius: var(--is-radius-sm);
}

/* 滚动条美化 */
*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
*::-webkit-scrollbar-track {
  background: transparent;
}
*::-webkit-scrollbar-thumb {
  background: rgba(16, 24, 40, 0.18);
  border-radius: var(--is-radius-full);
  border: 2px solid transparent;
  background-clip: padding-box;
}
*::-webkit-scrollbar-thumb:hover {
  background: rgba(16, 24, 40, 0.3);
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* 通用文本截断 */
.is-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

## 图表预设色板（`insight-studio/src/ui/colors.ts`，完整内容）

```ts
/** 预设色板（Benchling 风格科学图表配色）。 */
export const PRESET_COLORS = [
  '#2e5bff',
  '#1f9d66',
  '#f79009',
  '#d92d20',
  '#7a5af8',
  '#06aed4',
  '#e31c79',
  '#667085',
  '#1e2a78',
  '#84cc16',
  '#f04452',
  '#0e9384',
  '#b54708',
  '#4e5ba6',
  '#98a2b3',
  '#1d2939',
]
```

## 组件样式约定（从 `src/ui/*.vue` 归纳）

- 全部 scoped style，类名 `is-<组件>__<部位>--<修饰>` BEM。
- hover/focus 过渡统一 `var(--is-dur-fast) var(--is-ease)`（150ms）；浮层开合 200ms。
- 输入控件聚焦：`border-color: var(--is-accent)` + `box-shadow: 0 0 0 2px rgba(46,91,255,.14)`（比全局 `--is-ring` 更窄）。
- 浮层面板（popover/select/modal）统一：白底 + `1px var(--is-border)` + `var(--is-radius)` + `var(--is-shadow-md)`，teleport 到 body，`data-is-floating="1"` 标记。
- 菜单项模式 `.menu`/`.menu__item`（含 `--danger` 变体）在多处复用但样式各自重复定义（见「观察」）。
