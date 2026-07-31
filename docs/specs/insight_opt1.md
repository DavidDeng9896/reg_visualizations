# insight\_optimaztion

要求：在原有基础上增加系统的head 和 菜单（这个部分不需要实现功能，做好占位就行），侧边栏定位至数据分析

head 和 一级菜单 html 参考见下文

```html
<!DOCTYPE html>
<!-- ============================================================
     template-html 入库 · 章节 11 · 元信息
     来源会话：当前对话
     源文件：../index.html（clade 命名空间业务页）
     入库规则（AGENTS.md §7.4）：
       1. --clade-* → --mingdu-*；data-clade-theme → data-mingdu-theme
       2. clade.css → 9 份 mingdu 模块 CSS + mingdu.js（与 01–10 展台同顺序）
       3. 全面复用 mingdu 标准组件，去除全部 app-/entity-/related-/sub-sider-/icon-rail-/page-tab-/section-/prop-table/file-link/link-with-icon/empty-state/status-active/meta-desc/content-split/detail-panel 业务自定义类
       4. 唯一不可替代的样式（K 浮动按钮 + 按下脉冲）抽到 partials/11-scientific-data-detail.custom.css
     复用组件清单（与 component-inventory.md 一一对应）：
       mingdu-header / mingdu-app-shell / mingdu-sidebar-backdrop
       mingdu-rail-nav / mingdu-sidebar-nav / mingdu-nav-group / mingdu-nav-item
       mingdu-detail-split / mingdu-detail-meta / mingdu-detail-panels
       mingdu-meta-grid / mingdu-meta-field
       mingdu-section-card / mingdu-inner-tabs / mingdu-inner-tab-body
       mingdu-table / mingdu-entity-link / mingdu-status-tag / mingdu-tag
       mingdu-empty / mingdu-btn / mingdu-link / mingdu-avatar
     ============================================================ -->
<html lang="zh-CN" data-mingdu-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mingdu Design — 11. 科学数据管理 实体详情（template-html 入库示例）</title>
<style>
/* === fonts.css === */
/* ============================================================
   Mingdu Design — Font Loading & Stacks v1.0
   Load this file before variables.css in every HTML template.
   ============================================================ */

/* --- Optional web fonts (Latin). Falls back to system UI if offline. --- */




:root {
  /*
   * Sans (UI): Latin brand face → system UI → CJK system faces → generic.
   * Per-glyph fallback: CJK uses PingFang / YaHei when Inter has no glyph.
   */
  --mingdu-font-sans-latin: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  --mingdu-font-sans-cjk: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", sans-serif;
  --mingdu-font: var(--mingdu-font-sans-latin), var(--mingdu-font-sans-cjk);

  /*
   * Mono (code): Latin mono → system mono → CJK mono → generic monospace.
   */
  --mingdu-font-mono-latin: "JetBrains Mono", "SF Mono", "Fira Code", "Cascadia Code", Consolas;
  --mingdu-font-mono-cjk: "SF Mono", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", monospace;
  --mingdu-font-mono: var(--mingdu-font-mono-latin), var(--mingdu-font-mono-cjk);

  /* Icon font — only for .iconfont-MSP (see assets/icons/iconfont.css) */
  --mingdu-font-icon: "iconfont-MSP";
}

/* Ensure body text never inherits icon font from stray rules */
html {
  font-family: var(--mingdu-font);
  text-rendering: optimizeLegibility;
}

body,
input,
button,
textarea,
select {
  font-family: inherit;
}

code,
pre,
kbd,
samp,
.mingdu-code {
  font-family: var(--mingdu-font-mono);
}

[class^="MSP-"],
[class*=" MSP-"],
.iconfont-MSP {
  font-family: var(--mingdu-font-icon) !important;
}


/* === variables.css === */
/* ============================================================
   Mingdu Design — Design Tokens v1.0
   CSS Custom Properties for the entire design system
   ============================================================ */

:root{
  /* Seed — Brand */
  --mingdu-primary:#4c7ff0;
  --mingdu-primary-hover:#6a95f3;
  --mingdu-primary-active:#3a6cd9;
  --mingdu-primary-bg:#edf1fe;
  --mingdu-primary-bg-hover:#dbe4fc;
  --mingdu-primary-border:#b4c6f8;
  --mingdu-success:#10B981;
  --mingdu-success-bg:#ECFDF5;
  --mingdu-success-border:#6EE7B7;
  --mingdu-warning:#F59E0B;
  --mingdu-warning-bg:#FFFBEB;
  --mingdu-warning-border:#FCD34D;
  --mingdu-error:#EF4444;
  --mingdu-error-bg:#FEF2F2;
  --mingdu-error-border:#FCA5A5;
  --mingdu-info:#4c7ff0;

  /* Seed — Neutral */
  --mingdu-text:#1E293B;
  --mingdu-text-secondary:#475569;
  --mingdu-text-tertiary:#94A3B8;
  --mingdu-text-quaternary:#CBD5E1;
  --mingdu-text-heading:#0F172A;
  --mingdu-text-inverse:#FFFFFF;
  --mingdu-bg:#FFFFFF;
  --mingdu-bg-elevated:#FFFFFF;
  --mingdu-bg-layout:#F8FAFC;
  --mingdu-bg-mask:rgba(15,23,42,0.45);
  --mingdu-border:#E2E8F0;
  --mingdu-border-secondary:#F1F5F9;
  --mingdu-fill:rgba(15,23,42,0.06);
  --mingdu-fill-secondary:rgba(15,23,42,0.04);

  /* Seed — Typography (stacks defined in fonts.css) */
  --mingdu-font-size:14px;
  --mingdu-font-size-sm:12px;
  --mingdu-font-size-lg:16px;
  --mingdu-font-size-xl:20px;
  --mingdu-font-size-h1:38px;
  --mingdu-font-size-h2:30px;
  --mingdu-font-size-h3:24px;
  --mingdu-font-size-h4:20px;
  --mingdu-font-size-h5:16px;
  --mingdu-line-height:1.5714;

  /* Seed — Spacing (4px grid) */
  --mingdu-space-xxs:4px;
  --mingdu-space-xs:8px;
  --mingdu-space-sm:12px;
  --mingdu-space:16px;
  --mingdu-space-md:24px;
  --mingdu-space-lg:32px;
  --mingdu-space-xl:48px;

  /* Seed — Shape */
  --mingdu-radius-xs:2px;
  --mingdu-radius-sm:4px;
  --mingdu-radius:6px;
  --mingdu-radius-lg:8px;
  --mingdu-radius-xl:12px;
  --mingdu-radius-full:9999px;

  /* Seed — Control */
  --mingdu-ctrl-h:36px;
  --mingdu-ctrl-h-sm:28px;
  --mingdu-ctrl-h-lg:44px;

  /* Seed — Motion */
  --mingdu-ease-out:cubic-bezier(0.12,0.4,0.12,1);
  --mingdu-ease-in:cubic-bezier(0.32,0,0.67,0);
  --mingdu-ease-in-out:cubic-bezier(0.65,0,0.35,1);
  --mingdu-fast:140ms;
  --mingdu-normal:240ms;
  --mingdu-slow:300ms;

  /* Seed — Shadow */
  --mingdu-shadow-sm:0 1px 2px rgba(0,0,0,0.04);
  --mingdu-shadow:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
  --mingdu-shadow-md:0 4px 6px -1px rgba(0,0,0,0.06),0 2px 4px -2px rgba(0,0,0,0.05);
  --mingdu-shadow-lg:0 10px 15px -3px rgba(0,0,0,0.08),0 4px 6px -4px rgba(0,0,0,0.04);
  --mingdu-shadow-xl:0 20px 25px -5px rgba(0,0,0,0.08),0 8px 10px -6px rgba(0,0,0,0.04);

  /* Seed — Z-Index */
  --mingdu-z-base:0;
  --mingdu-z-dropdown:1000;
  --mingdu-z-sticky:1020;
  --mingdu-z-modal:1050;
  --mingdu-z-tooltip:1100;

  /* Layout measures */
  --mingdu-header-height:48px;
  --mingdu-sidebar-width:220px;

  /* Responsive breakpoints */
  --mingdu-bp-xl:1400px;
  --mingdu-bp-lg:1200px;
  --mingdu-bp-md:992px;
  --mingdu-bp-sm:768px;
  --mingdu-bp-xs:480px;

  /* Apply global */
  font-family:var(--mingdu-font);
  font-size:var(--mingdu-font-size);
  color:var(--mingdu-text);
  background:var(--mingdu-bg-layout);

  /* Alias tokens (docs / Ant Design–style names → implementation) */
  --mingdu-color-primary:var(--mingdu-primary);
  --mingdu-color-text:var(--mingdu-text);
  --mingdu-color-text-secondary:var(--mingdu-text-secondary);
  --mingdu-color-bg-container:var(--mingdu-bg);
  --mingdu-color-border:var(--mingdu-border);
  --mingdu-border-radius:var(--mingdu-radius);
  --mingdu-control-height:var(--mingdu-ctrl-h);
}

/* Dark Theme */
[data-mingdu-theme="dark"]{
  --mingdu-primary:#80a8f5;
  --mingdu-primary-hover:#9dbef8;
  --mingdu-primary-active:#6692ed;
  --mingdu-primary-bg:rgba(128,168,245,0.15);
  --mingdu-primary-bg-hover:rgba(128,168,245,0.25);
  --mingdu-primary-border:rgba(128,168,245,0.3);
  --mingdu-text:#F1F5F9;
  --mingdu-text-secondary:#94A3B8;
  --mingdu-text-tertiary:#64748B;
  --mingdu-text-quaternary:#475569;
  --mingdu-text-heading:#FFFFFF;
  --mingdu-text-inverse:#0F172A;
  --mingdu-bg:#1E293B;
  --mingdu-bg-elevated:#1E293B;
  --mingdu-bg-layout:#0F172A;
  --mingdu-bg-mask:rgba(0,0,0,0.7);
  --mingdu-border:#334155;
  --mingdu-border-secondary:#1E293B;
  --mingdu-fill:rgba(255,255,255,0.06);
  --mingdu-fill-secondary:rgba(255,255,255,0.04);
  --mingdu-color-primary:var(--mingdu-primary);
  --mingdu-color-text:var(--mingdu-text);
  --mingdu-color-text-secondary:var(--mingdu-text-secondary);
  --mingdu-color-bg-container:var(--mingdu-bg);
  --mingdu-color-border:var(--mingdu-border);
}

/* Compact theme — tighter spacing and control heights */
[data-mingdu-theme="compact"]{
  --mingdu-font-size:13px;
  --mingdu-font-size-sm:11px;
  --mingdu-space-xxs:2px;
  --mingdu-space-xs:6px;
  --mingdu-space-sm:8px;
  --mingdu-space:12px;
  --mingdu-space-md:16px;
  --mingdu-space-lg:24px;
  --mingdu-space-xl:36px;
  --mingdu-ctrl-h:28px;
  --mingdu-ctrl-h-sm:24px;
  --mingdu-ctrl-h-lg:36px;
  --mingdu-control-height:var(--mingdu-ctrl-h);
}


/* === reset.css === */
/* ============================================================
   Mingdu Design — CSS Reset v1.0
   ============================================================ */

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{min-height:100vh;line-height:1.5714}
img,svg{display:block;max-width:100%}
input,button,textarea,select{font:inherit;color:inherit}
button{cursor:pointer}
a{color:inherit;text-decoration:none}
ul,ol{list-style:none}
table{border-collapse:collapse;border-spacing:0}


/* === components.css === */
/* ============================================================
   Mingdu Design 鈥?Components v1.0
   All component styles: Typography, Button, Input, Checkbox,
   Switch, Tag, Badge, Avatar, Alert, Modal, Table, Card,
   Breadcrumb, Pagination, Steps, Tabs, Menu, Dropdown, Progress,
   Spin, Skeleton, Empty, Result, Divider, Collapse, Timeline,
   Tooltip, Descriptions, Statistic, Notification, Drawer,
   Segmented, Carousel, Popconfirm, Demo helpers
   ============================================================ */

/* ---------- Typography ---------- */
h1,.mingdu-h1{font-size:var(--mingdu-font-size-h1);font-weight:700;line-height:1.2;color:var(--mingdu-text-heading);margin-bottom:var(--mingdu-space-md)}
h2,.mingdu-h2{font-size:var(--mingdu-font-size-h2);font-weight:600;line-height:1.25;color:var(--mingdu-text-heading);margin-bottom:var(--mingdu-space)}
h3,.mingdu-h3{font-size:var(--mingdu-font-size-h3);font-weight:600;line-height:1.3;color:var(--mingdu-text-heading);margin-bottom:var(--mingdu-space)}
h4,.mingdu-h4{font-size:var(--mingdu-font-size-h4);font-weight:600;line-height:1.4;color:var(--mingdu-text-heading);margin-bottom:var(--mingdu-space-sm)}
h5,.mingdu-h5{font-size:var(--mingdu-font-size-h5);font-weight:600;line-height:1.5;color:var(--mingdu-text-heading);margin-bottom:var(--mingdu-space-sm)}
p{margin-bottom:var(--mingdu-space);color:var(--mingdu-text)}
.text-sm{font-size:var(--mingdu-font-size-sm)}
.text-secondary{color:var(--mingdu-text-secondary)}
.text-tertiary{color:var(--mingdu-text-tertiary)}
.text-center{text-align:center}
code,.mingdu-code{padding:2px 8px;font-family:var(--mingdu-font-mono);font-size:0.9em;background:var(--mingdu-fill);border:1px solid var(--mingdu-border-secondary);border-radius:var(--mingdu-radius-sm)}
a,.mingdu-link{color:var(--mingdu-primary);text-decoration:none}
a:hover,.mingdu-link:hover{color:var(--mingdu-primary-hover)}

/* ---------- Button ---------- */
.mingdu-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:var(--mingdu-space-xs);
  height:var(--mingdu-ctrl-h);padding:0 var(--mingdu-space);
  font-family:var(--mingdu-font);font-size:var(--mingdu-font-size);font-weight:500;line-height:1;
  white-space:nowrap;cursor:pointer;user-select:none;
  border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius);
  background:var(--mingdu-bg);color:var(--mingdu-text);
  outline:none;transition:all var(--mingdu-fast) var(--mingdu-ease-out);
}
.mingdu-btn:hover{color:var(--mingdu-primary);border-color:var(--mingdu-primary-border)}
.mingdu-btn:active{color:var(--mingdu-primary-active);border-color:var(--mingdu-primary-active)}
.mingdu-btn:focus-visible{box-shadow:0 0 0 3px var(--mingdu-primary-bg)}
.mingdu-btn-primary{
  color:#fff;background:var(--mingdu-primary);border-color:var(--mingdu-primary);
  box-shadow:0 1px 2px rgba(76,127,240,0.3);
}
.mingdu-btn-primary:hover{color:#fff;background:var(--mingdu-primary-hover);border-color:var(--mingdu-primary-hover);box-shadow:0 2px 4px rgba(76,127,240,0.35)}
.mingdu-btn-primary:active{color:#fff;background:var(--mingdu-primary-active);border-color:var(--mingdu-primary-active);box-shadow:none}
.mingdu-btn-primary:focus-visible{box-shadow:0 0 0 3px var(--mingdu-primary-bg),0 1px 2px rgba(76,127,240,0.3)}
.mingdu-btn-dashed{border-style:dashed}
.mingdu-btn-dashed:hover{border-color:var(--mingdu-primary)}
.mingdu-btn-text{border-color:transparent;background:transparent;color:var(--mingdu-text)}
.mingdu-btn-text:hover{color:var(--mingdu-primary);background:var(--mingdu-fill);border-color:transparent}
.mingdu-btn-text:active{background:var(--mingdu-primary-bg)}
.mingdu-btn-link{border-color:transparent;background:transparent;color:var(--mingdu-primary)}
.mingdu-btn-link:hover{color:var(--mingdu-primary-hover);background:transparent;border-color:transparent}
.mingdu-btn-sm{height:var(--mingdu-ctrl-h-sm);padding:0 var(--mingdu-space-sm);font-size:var(--mingdu-font-size-sm);border-radius:var(--mingdu-radius-sm)}
.mingdu-btn-lg{height:var(--mingdu-ctrl-h-lg);padding:0 var(--mingdu-space-md);font-size:var(--mingdu-font-size-lg);border-radius:var(--mingdu-radius-lg)}
.mingdu-btn-circle{width:var(--mingdu-ctrl-h);padding:0;border-radius:50%}
.mingdu-btn-circle.mingdu-btn-sm{width:var(--mingdu-ctrl-h-sm)}
.mingdu-btn-circle.mingdu-btn-lg{width:var(--mingdu-ctrl-h-lg)}
.mingdu-btn-round{border-radius:var(--mingdu-radius-full)}
.mingdu-btn-danger{color:var(--mingdu-error);border-color:var(--mingdu-error)}
.mingdu-btn-danger:hover{color:#fff;background:var(--mingdu-error);border-color:var(--mingdu-error)}
.mingdu-btn-danger.mingdu-btn-primary{color:#fff;background:var(--mingdu-error);border-color:var(--mingdu-error);box-shadow:0 1px 2px rgba(239,68,68,0.3)}
.mingdu-btn-danger.mingdu-btn-primary:hover{background:#F87171;border-color:#F87171}
.mingdu-btn-block{width:100%}
.mingdu-btn:disabled,.mingdu-btn[aria-disabled="true"]{opacity:0.45;cursor:not-allowed;pointer-events:none}
.mingdu-btn[aria-busy="true"]{pointer-events:none}
.mingdu-btn-spinner{display:inline-block;width:1em;height:1em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:mingdu-spin .4s linear infinite}

/* ---------- Input / Form Controls ---------- */
.mingdu-input{
  display:block;width:100%;height:var(--mingdu-ctrl-h);padding:0 var(--mingdu-space-sm);
  font-family:var(--mingdu-font);font-size:var(--mingdu-font-size);
  color:var(--mingdu-text);background:var(--mingdu-bg);
  border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius);
  outline:none;transition:border-color var(--mingdu-fast),box-shadow var(--mingdu-fast);
}
.mingdu-input::placeholder{color:var(--mingdu-text-tertiary)}
.mingdu-input:hover{border-color:var(--mingdu-primary-border)}
.mingdu-input:focus{border-color:var(--mingdu-primary);box-shadow:0 0 0 3px var(--mingdu-primary-bg)}
.mingdu-input:disabled{background:var(--mingdu-fill-secondary);color:var(--mingdu-text-quaternary);cursor:not-allowed;border-color:var(--mingdu-border)}
.mingdu-input-error{border-color:var(--mingdu-error)}
.mingdu-input-error:focus{box-shadow:0 0 0 3px var(--mingdu-error-bg)}
.mingdu-input-sm{height:var(--mingdu-ctrl-h-sm);padding:0 var(--mingdu-space-xs);font-size:var(--mingdu-font-size-sm)}
.mingdu-input-lg{height:var(--mingdu-ctrl-h-lg);padding:0 var(--mingdu-space);font-size:var(--mingdu-font-size-lg)}
textarea.mingdu-input{height:auto;padding:var(--mingdu-space-sm);line-height:var(--mingdu-line-height);resize:vertical;min-height:80px}
textarea.mingdu-input:focus{box-shadow:0 0 0 3px var(--mingdu-primary-bg)}
.mingdu-select{
  display:block;width:100%;height:var(--mingdu-ctrl-h);padding:0 var(--mingdu-space-lg) 0 var(--mingdu-space-sm);
  font-family:var(--mingdu-font);font-size:var(--mingdu-font-size);
  color:var(--mingdu-text);background:var(--mingdu-bg);
  border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius);
  outline:none;cursor:pointer;appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2394A3B8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 10px center;
  transition:border-color var(--mingdu-fast),box-shadow var(--mingdu-fast);
}
.mingdu-select:hover{border-color:var(--mingdu-primary-border)}
.mingdu-select:focus{border-color:var(--mingdu-primary);box-shadow:0 0 0 3px var(--mingdu-primary-bg)}
.mingdu-select:disabled{opacity:0.45;cursor:not-allowed;pointer-events:none}

/* ---------- Custom Select (non-native dropdown) ---------- */
.mingdu-select-custom{position:relative;max-width:360px;font-size:var(--mingdu-font-size)}
.mingdu-select-trigger{
  display:flex;align-items:center;gap:var(--mingdu-space-xs);
  min-height:var(--mingdu-ctrl-h);padding:0 var(--mingdu-space-lg) 0 var(--mingdu-space-sm);
  width:100%;border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius);
  background:var(--mingdu-bg);cursor:pointer;font-size:var(--mingdu-font-size);text-align:left;
  color:var(--mingdu-text);outline:none;position:relative;overflow:hidden;
  transition:border-color var(--mingdu-fast),box-shadow var(--mingdu-fast);
}
.mingdu-select-trigger.mingdu-input-sm{
  min-height:var(--mingdu-ctrl-h-sm);
  height:var(--mingdu-ctrl-h-sm);
  padding:0 28px 0 8px;
  font-size:var(--mingdu-font-size-sm);
  border-radius:var(--mingdu-radius-sm);
}
.mingdu-select-trigger:hover{border-color:var(--mingdu-primary-border)}
.mingdu-select--open .mingdu-select-trigger{border-color:var(--mingdu-primary);box-shadow:0 0 0 3px var(--mingdu-primary-bg)}
.mingdu-select-value{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.mingdu-select-value--placeholder{color:var(--mingdu-text-tertiary)}
.mingdu-select-arrow{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--mingdu-text-tertiary);transition:transform var(--mingdu-fast)}
.mingdu-select--open .mingdu-select-arrow{transform:translateY(-50%);color:var(--mingdu-primary)}
.mingdu-select-dropdown{
  position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:var(--mingdu-z-dropdown);
  background:var(--mingdu-bg-elevated);border:1px solid var(--mingdu-border);
  border-radius:var(--mingdu-radius-lg);box-shadow:var(--mingdu-shadow-lg);
  padding:var(--mingdu-space-xs);overflow:hidden;
}
.mingdu-select-dropdown[hidden]{display:none}
.mingdu-select-search{
  display:flex;align-items:center;gap:6px;padding:6px 8px;
  border-bottom:1px solid var(--mingdu-border-secondary);margin-bottom:4px;
}
.mingdu-select-search input{
  flex:1;border:none;outline:none;font-size:13px;color:var(--mingdu-text);background:transparent;
}
.mingdu-select-search input::placeholder{color:var(--mingdu-text-tertiary)}
.mingdu-select-list{max-height:240px;overflow-y:auto;list-style:none;margin:0;padding:0}
.mingdu-select-option{
  display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:var(--mingdu-radius-sm);
  cursor:pointer;font-size:13px;color:var(--mingdu-text);transition:background var(--mingdu-fast);
}
.mingdu-select-option:hover{background:var(--mingdu-fill)}
.mingdu-select-option--selected{background:var(--mingdu-primary-bg);color:var(--mingdu-primary);font-weight:500}
.mingdu-select-option-icon{display:flex;align-items:center;justify-content:center;width:20px;height:20px;font-size:16px}
.mingdu-select-option-label{flex:1;line-height:1.4}
.mingdu-select-empty{text-align:center;padding:var(--mingdu-space);font-size:13px;color:var(--mingdu-text-tertiary)}
.mingdu-select-tags{display:flex;flex-wrap:wrap;gap:4px;flex:1;min-width:0;padding-right:6px;overflow:hidden}
.mingdu-select-tag{
  display:inline-flex;align-items:center;gap:2px;padding:2px 6px;
  font-size:12px;background:var(--mingdu-primary-bg);border:1px solid var(--mingdu-primary-border);
  border-radius:var(--mingdu-radius-sm);color:var(--mingdu-primary);
}
.mingdu-select-tag-text{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mingdu-select-tag-remove{
  display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;
  border:none;border-radius:50%;background:transparent;cursor:pointer;color:inherit;font-size:12px;opacity:0.6;
}
.mingdu-select-tag-remove:hover{opacity:1;background:rgba(0,0,0,0.06)}
.mingdu-select-placeholder{color:var(--mingdu-text-tertiary);min-width:60px}
.mingdu-select--disabled .mingdu-select-trigger{background:var(--mingdu-fill-secondary);color:var(--mingdu-text-quaternary);cursor:not-allowed}
.mingdu-select--error .mingdu-select-trigger{border-color:var(--mingdu-error);box-shadow:0 0 0 3px var(--mingdu-error-bg)}

/* ---------- InputNumber ---------- */
.mingdu-input-number{
  display:inline-flex;align-items:center;height:var(--mingdu-ctrl-h);
  border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius);
  background:var(--mingdu-bg);overflow:hidden;
  transition:border-color var(--mingdu-fast),box-shadow var(--mingdu-fast);
}
.mingdu-input-number:focus-within{border-color:var(--mingdu-primary);box-shadow:0 0 0 3px var(--mingdu-primary-bg)}
.mingdu-input-number__btn{
  width:34px;height:100%;border:none;background:var(--mingdu-fill-secondary);
  color:var(--mingdu-text-secondary);font-size:16px;line-height:1;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;transition:all var(--mingdu-fast);
}
.mingdu-input-number__btn:hover:not(:disabled){background:var(--mingdu-fill);color:var(--mingdu-text)}
.mingdu-input-number__btn:disabled{cursor:not-allowed;color:var(--mingdu-text-quaternary);background:var(--mingdu-fill-secondary)}
.mingdu-input-number__input{
  width:72px;height:100%;border:none;border-left:1px solid var(--mingdu-border-secondary);
  border-right:1px solid var(--mingdu-border-secondary);text-align:center;font-size:13px;
  color:var(--mingdu-text);background:var(--mingdu-bg);outline:none;padding:0 6px;
}
.mingdu-input-number__input:disabled{background:var(--mingdu-fill-secondary);color:var(--mingdu-text-quaternary)}
.mingdu-input-number__input::-webkit-outer-spin-button,
.mingdu-input-number__input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.mingdu-input-number__input[type=number]{-moz-appearance:textfield}
.mingdu-input-number--disabled{opacity:0.6}

/* ---------- Slider ---------- */
.mingdu-slider{display:flex;align-items:center;gap:12px}
.mingdu-slider__rail{position:relative;flex:1;height:6px;border-radius:3px;background:var(--mingdu-fill);cursor:pointer}
.mingdu-slider__track{position:absolute;left:0;top:0;height:100%;width:50%;border-radius:3px;background:var(--mingdu-primary)}
.mingdu-slider__thumb{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:16px;height:16px;border-radius:50%;border:2px solid var(--mingdu-primary);background:#fff;cursor:pointer;
  box-shadow:0 1px 4px rgba(15,23,42,0.16);
}
.mingdu-slider__value{width:36px;text-align:right;font-size:12px;color:var(--mingdu-text-secondary)}

/* ---------- Checkbox / Radio ---------- */
.mingdu-checkbox,.mingdu-radio{display:inline-flex;align-items:center;gap:var(--mingdu-space-xs);cursor:pointer;font-size:var(--mingdu-font-size);color:var(--mingdu-text);user-select:none}
.mingdu-checkbox input,.mingdu-radio input{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.mingdu-checkbox-icon{
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  width:16px;height:16px;border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-xs);
  background:var(--mingdu-bg);transition:all var(--mingdu-fast);
  font-size:11px;color:transparent;
}
.mingdu-checkbox input:checked+.mingdu-checkbox-icon{background:var(--mingdu-primary);border-color:var(--mingdu-primary);color:#fff}
.mingdu-checkbox input:focus-visible+.mingdu-checkbox-icon{box-shadow:0 0 0 3px var(--mingdu-primary-bg)}
.mingdu-checkbox:hover .mingdu-checkbox-icon{border-color:var(--mingdu-primary)}
.mingdu-checkbox-disabled{opacity:0.45;cursor:not-allowed}
.mingdu-radio-icon{
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  width:16px;height:16px;border:1px solid var(--mingdu-border);border-radius:50%;
  background:var(--mingdu-bg);transition:all var(--mingdu-fast);
}
.mingdu-radio input:checked+.mingdu-radio-icon{border-color:var(--mingdu-primary);border-width:5px}
.mingdu-radio input:focus-visible+.mingdu-radio-icon{box-shadow:0 0 0 3px var(--mingdu-primary-bg)}
.mingdu-radio:hover .mingdu-radio-icon{border-color:var(--mingdu-primary)}
.mingdu-checkbox-group,.mingdu-radio-group{display:flex;gap:var(--mingdu-space);flex-wrap:wrap}
.mingdu-radio-group[role=radiogroup],.mingdu-checkbox-group[role=group]{gap:0}

/* ---------- Switch ---------- */
.mingdu-switch{
  display:inline-flex;align-items:center;width:44px;height:24px;padding:2px;
  border:none;border-radius:12px;background:rgba(15,23,42,0.16);
  cursor:pointer;position:relative;transition:background var(--mingdu-fast);
  flex-shrink:0;
}
.mingdu-switch::after{
  content:'';width:20px;height:20px;border-radius:50%;background:#fff;
  box-shadow:0 1px 3px rgba(0,0,0,0.12);transition:transform var(--mingdu-fast) var(--mingdu-ease-out);
}
.mingdu-switch[aria-checked="true"]{background:var(--mingdu-primary)}
.mingdu-switch[aria-checked="true"]::after{transform:translateX(20px)}
.mingdu-switch:focus-visible{box-shadow:0 0 0 3px var(--mingdu-primary-bg)}

/* ---------- Tag ---------- */
.mingdu-tag{
  display:inline-flex;align-items:center;justify-content:center;gap:0;
  padding:2px 5px;font-size:var(--mingdu-font-size-sm);font-weight:500;line-height:1.5;
  border-radius:var(--mingdu-radius-sm);white-space:nowrap;
}
.mingdu-tag-default{color:var(--mingdu-text-secondary);background:var(--mingdu-fill);border:1px solid var(--mingdu-border-secondary)}
.mingdu-tag-primary{color:var(--mingdu-primary);background:var(--mingdu-primary-bg);border:1px solid var(--mingdu-primary-border)}
.mingdu-tag-success{color:#059669;background:var(--mingdu-success-bg);border:1px solid var(--mingdu-success-border)}
.mingdu-tag-warning{color:#B45309;background:var(--mingdu-warning-bg);border:1px solid var(--mingdu-warning-border)}
.mingdu-tag-error{color:#DC2626;background:var(--mingdu-error-bg);border:1px solid var(--mingdu-error-border)}
.mingdu-tag-close{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border:none;background:none;cursor:pointer;color:inherit;opacity:0.6;border-radius:50%;padding:0;margin-left:0}
.mingdu-tag-close:hover{opacity:1;background:rgba(0,0,0,0.06)}

/* ---------- Badge ---------- */
.mingdu-badge{position:relative;display:inline-flex}
.mingdu-badge-count{
  position:absolute;top:-6px;right:-10px;min-width:20px;height:20px;
  padding:0 6px;border-radius:10px;background:var(--mingdu-error);
  color:#fff;font-size:11px;font-weight:600;line-height:20px;text-align:center;
  box-shadow:0 0 0 2px var(--mingdu-bg);z-index:1;
}
.mingdu-badge-dot{
  position:absolute;top:-2px;right:-4px;width:8px;height:8px;
  border-radius:50%;background:var(--mingdu-error);
  box-shadow:0 0 0 2px var(--mingdu-bg);z-index:1;
}

/* ---------- Avatar ---------- */
.mingdu-avatar{
  display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;
  width:var(--mingdu-ctrl-h-lg);height:var(--mingdu-ctrl-h-lg);border-radius:50%;
  background:var(--mingdu-primary-bg);color:var(--mingdu-primary);
  font-weight:600;font-size:var(--mingdu-font-size-lg);overflow:hidden;
}
.mingdu-avatar-sm{width:28px;height:28px;font-size:var(--mingdu-font-size-sm)}
.mingdu-avatar-lg{width:56px;height:56px;font-size:var(--mingdu-font-size-xl)}
.mingdu-avatar-square{border-radius:var(--mingdu-radius)}
.mingdu-avatar img{width:100%;height:100%;object-fit:cover}

/* ---------- Alert ---------- */
.mingdu-alert{
  display:flex;align-items:flex-start;gap:var(--mingdu-space-sm);
  padding:var(--mingdu-space-sm) var(--mingdu-space);border-radius:var(--mingdu-radius);
  font-size:var(--mingdu-font-size);line-height:var(--mingdu-line-height);
}
.mingdu-alert-icon{flex-shrink:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;margin-top:1px}
.mingdu-alert-body{flex:1;min-width:0}
.mingdu-alert-title{font-weight:600;color:var(--mingdu-text-heading);margin-bottom:2px}
.mingdu-alert-desc{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary)}
.mingdu-alert-close{flex-shrink:0;border:none;background:none;cursor:pointer;padding:2px;color:var(--mingdu-text-tertiary);border-radius:var(--mingdu-radius-sm);line-height:1;transition:all var(--mingdu-fast)}
.mingdu-alert-close:hover{color:var(--mingdu-text);background:var(--mingdu-fill)}
.mingdu-alert-info{background:var(--mingdu-primary-bg);border:1px solid var(--mingdu-primary-border)}
.mingdu-alert-info .mingdu-alert-icon{color:var(--mingdu-primary)}
.mingdu-alert-success{background:var(--mingdu-success-bg);border:1px solid var(--mingdu-success-border)}
.mingdu-alert-success .mingdu-alert-icon{color:var(--mingdu-success)}
.mingdu-alert-warning{background:var(--mingdu-warning-bg);border:1px solid var(--mingdu-warning-border)}
.mingdu-alert-warning .mingdu-alert-icon{color:var(--mingdu-warning)}
.mingdu-alert-error{background:var(--mingdu-error-bg);border:1px solid var(--mingdu-error-border)}
.mingdu-alert-error .mingdu-alert-icon{color:var(--mingdu-error)}

/* ---------- Modal ---------- */
.mingdu-modal-overlay{
  position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
  background:var(--mingdu-bg-mask);z-index:var(--mingdu-z-modal);padding:var(--mingdu-space-md);
}
.mingdu-modal-overlay[hidden]{display:none}
.mingdu-modal{
  width:520px;max-width:100%;max-height:calc(100vh - 2*var(--mingdu-space-md));
  display:flex;flex-direction:column;background:var(--mingdu-bg-elevated);
  border-radius:var(--mingdu-radius-xl);box-shadow:var(--mingdu-shadow-xl);
}
.mingdu-modal--sm{width:480px}
.mingdu-modal--lg{width:720px}
.mingdu-modal-header{
  display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
  padding:var(--mingdu-space) var(--mingdu-space-md);
  border-bottom:1px solid var(--mingdu-border-secondary);
}
.mingdu-modal-header-main{display:flex;align-items:center;gap:10px}
.mingdu-modal-header-icon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:var(--mingdu-radius);background:var(--mingdu-primary-bg);color:var(--mingdu-primary)}
.mingdu-modal-header-text{min-width:0}
.mingdu-modal-title{font-size:var(--mingdu-font-size-lg);font-weight:600;color:var(--mingdu-text-heading)}
.mingdu-modal-subtitle{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary)}
.mingdu-modal-close{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:none;border-radius:var(--mingdu-radius);background:none;cursor:pointer;color:var(--mingdu-text-tertiary);font-size:18px;transition:all var(--mingdu-fast)}
.mingdu-modal-close:hover{background:var(--mingdu-fill);color:var(--mingdu-text)}
.mingdu-modal-body{flex:1;overflow-y:auto;padding:var(--mingdu-space-md);font-size:var(--mingdu-font-size);color:var(--mingdu-text);line-height:var(--mingdu-line-height)}
.mingdu-modal-footer{display:flex;justify-content:flex-end;gap:var(--mingdu-space-sm);flex-shrink:0;padding:var(--mingdu-space) var(--mingdu-space-md);border-top:1px solid var(--mingdu-border-secondary)}
.mingdu-modal-footer--between{justify-content:space-between}
.mingdu-modal-footer-hint{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary)}
.mingdu-modal-footer-actions{display:flex;gap:var(--mingdu-space-xs)}

/* ---------- Table ---------- */
/* ---------- Table 鍩虹锛堝彧璇伙級 ---------- */
.mingdu-table-wrap{border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);overflow:hidden;background:var(--mingdu-bg)}
.mingdu-table{width:100%;border-collapse:collapse}
.mingdu-table th{
  padding:var(--mingdu-space-sm) var(--mingdu-space);text-align:start;
  font-weight:600;font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary);
  background:var(--mingdu-fill-secondary);border-bottom:1px solid var(--mingdu-border);
  white-space:nowrap;text-transform:uppercase;letter-spacing:0.025em;
}
.mingdu-table td{padding:var(--mingdu-space-sm) var(--mingdu-space);font-size:var(--mingdu-font-size);color:var(--mingdu-text);border-bottom:1px solid var(--mingdu-border-secondary);vertical-align:middle}
.mingdu-table tbody tr{transition:background var(--mingdu-fast)}
.mingdu-table tbody tr:hover{background:var(--mingdu-fill)}
.mingdu-table tbody tr:last-child td{border-bottom:none}
.mingdu-table__link{color:var(--mingdu-primary);cursor:pointer}
.mingdu-table__link:hover{color:var(--mingdu-primary-hover)}
.mingdu-table--compact td,.mingdu-table--compact th{padding:10px 12px}
.mingdu-table--bordered td,.mingdu-table--bordered th{border:1px solid var(--mingdu-border-secondary)}
.mingdu-table--striped tbody tr:nth-child(even){background:var(--mingdu-fill-secondary)}
.mingdu-table--striped tbody tr:nth-child(even):hover{background:var(--mingdu-fill)}
.mingdu-table-footer{display:flex;align-items:center;justify-content:space-between;padding:var(--mingdu-space-sm) var(--mingdu-space);border-top:1px solid var(--mingdu-border-secondary);background:var(--mingdu-bg)}
.table-container{overflow-x:auto;-webkit-overflow-scrolling:touch}
.mingdu-table-caption{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}

/* ---------- 鐘舵€佹爣绛撅紙涓氬姟鍒楋級 ---------- */
.mingdu-status-tag{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:var(--mingdu-radius-full);font-size:var(--mingdu-font-size-sm);font-weight:500;line-height:1.6}
.mingdu-status-tag::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;opacity:0.7;flex-shrink:0}
.mingdu-status-tag--success{color:var(--mingdu-success);background:var(--mingdu-success-bg)}
.mingdu-status-tag--warning{color:var(--mingdu-warning);background:var(--mingdu-warning-bg)}
.mingdu-status-tag--error{color:var(--mingdu-error);background:var(--mingdu-error-bg)}
.mingdu-status-tag--info{color:var(--mingdu-primary);background:var(--mingdu-primary-bg)}
.mingdu-status-tag--default{color:var(--mingdu-text-secondary);background:var(--mingdu-fill)}

/* ---------- 瀹炰綋閾炬帴 + 娴眰棰勮 ---------- */
.mingdu-entity-link{color:var(--mingdu-primary);cursor:pointer}
.mingdu-entity-link:hover{color:var(--mingdu-primary-hover);text-decoration:underline}
[data-mingdu-entity-tag]{position:relative;display:inline-flex;align-items:center;gap:4px}
.mingdu-entity-preview{
  position:absolute;top:calc(100% + 6px);left:0;z-index:var(--mingdu-z-tooltip);
  min-width:160px;padding:var(--mingdu-space-sm) var(--mingdu-space);background:var(--mingdu-bg-elevated);
  border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);box-shadow:var(--mingdu-shadow-lg);
  font-size:13px;line-height:1.5;
}
.mingdu-entity-preview[hidden]{display:none}
.mingdu-entity-preview__name{font-weight:600;color:var(--mingdu-text-heading);margin-bottom:2px}
.mingdu-entity-preview__id{font-size:12px;color:var(--mingdu-text-secondary)}

/* ---------- Card ---------- */
.mingdu-card{background:var(--mingdu-bg);border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-xl);overflow:hidden}
.mingdu-card-header{display:flex;align-items:center;justify-content:space-between;padding:var(--mingdu-space) var(--mingdu-space-md);border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-card-title{font-size:var(--mingdu-font-size-lg);font-weight:600;color:var(--mingdu-text-heading)}
.mingdu-card-body{padding:var(--mingdu-space-md)}
.mingdu-card-actions{display:flex;align-items:center;border-top:1px solid var(--mingdu-border-secondary)}
.mingdu-card-actions>button{flex:1;padding:var(--mingdu-space-sm);border:none;background:none;cursor:pointer;font-size:var(--mingdu-font-size);color:var(--mingdu-text-secondary);transition:all var(--mingdu-fast)}
.mingdu-card-actions>button:not(:last-child){border-right:1px solid var(--mingdu-border-secondary)}
.mingdu-card-actions>button:hover{color:var(--mingdu-primary);background:var(--mingdu-fill)}

/* ---------- Breadcrumb ---------- */
.mingdu-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;font-size:var(--mingdu-font-size)}
.mingdu-breadcrumb ol{display:flex;align-items:center;list-style:none;margin:0;padding:0}
.mingdu-breadcrumb li{display:inline-flex;align-items:center;color:var(--mingdu-text-secondary)}
.mingdu-breadcrumb li:last-child{color:var(--mingdu-text);font-weight:500}
.mingdu-breadcrumb a{color:var(--mingdu-text-secondary);text-decoration:none;transition:color var(--mingdu-fast)}
.mingdu-breadcrumb a:hover{color:var(--mingdu-primary)}
.mingdu-breadcrumb-sep{margin:0 var(--mingdu-space-xs);color:var(--mingdu-text-quaternary);user-select:none}

/* ---------- Pagination ---------- */
.mingdu-pagination{display:flex;align-items:center;gap:var(--mingdu-space-xs)}
.mingdu-pagination ul{display:flex;align-items:center;list-style:none;gap:var(--mingdu-space-xxs)}
.mingdu-pagination-btn{display:inline-flex;align-items:center;justify-content:center;min-width:var(--mingdu-ctrl-h);height:var(--mingdu-ctrl-h);padding:0 var(--mingdu-space-sm);border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius);background:var(--mingdu-bg);font-size:var(--mingdu-font-size);color:var(--mingdu-text);cursor:pointer;transition:all var(--mingdu-fast);user-select:none}
.mingdu-pagination-btn:hover{color:var(--mingdu-primary);border-color:var(--mingdu-primary-border)}
.mingdu-pagination-btn-active{color:#fff;background:var(--mingdu-primary);border-color:var(--mingdu-primary);font-weight:500}
.mingdu-pagination-btn-active:hover{color:#fff;background:var(--mingdu-primary-hover);border-color:var(--mingdu-primary-hover)}
.mingdu-pagination-btn:disabled{color:var(--mingdu-text-quaternary);cursor:not-allowed;pointer-events:none;background:var(--mingdu-fill-secondary)}
.mingdu-pagination-total{font-size:var(--mingdu-font-size);color:var(--mingdu-text-secondary);margin-right:var(--mingdu-space)}
.mingdu-pagination-info{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary)}

/* ---------- Steps ---------- */
.mingdu-steps{display:flex}
.mingdu-steps ol{display:flex;list-style:none;width:100%}
.mingdu-step{display:flex;flex:1;position:relative;overflow:hidden}
.mingdu-step:last-child{flex:0 0 auto}
.mingdu-step-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:32px;height:32px;border-radius:50%;border:2px solid var(--mingdu-border);background:var(--mingdu-bg);font-size:var(--mingdu-font-size);font-weight:600;color:var(--mingdu-text-secondary);z-index:1;transition:all var(--mingdu-normal)}
.mingdu-step-body{flex:1;min-width:0;margin-left:var(--mingdu-space-sm);padding-right:var(--mingdu-space);position:relative;z-index:1}
.mingdu-step-title{font-size:var(--mingdu-font-size);font-weight:500;color:var(--mingdu-text);line-height:32px}
.mingdu-step-desc{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary);margin-top:2px}
.mingdu-step-tail{position:absolute;top:16px;left:0;right:0;height:2px;background:var(--mingdu-border);margin-left:48px;z-index:0}
.mingdu-step:last-child .mingdu-step-tail{display:none}
.mingdu-step-finish .mingdu-step-icon{background:var(--mingdu-primary);border-color:var(--mingdu-primary);color:#fff}
.mingdu-step-finish .mingdu-step-tail{background:var(--mingdu-primary)}
.mingdu-step-process .mingdu-step-icon{border-color:var(--mingdu-primary);color:var(--mingdu-primary)}
.mingdu-step-wait .mingdu-step-title,.mingdu-step-wait .mingdu-step-desc{color:var(--mingdu-text-tertiary)}

/* ---------- Tabs ---------- */
.mingdu-tabs-nav{display:flex;border-bottom:1px solid var(--mingdu-border);gap:0}
.mingdu-tabs-tab{display:inline-flex;align-items:center;gap:var(--mingdu-space-xs);padding:var(--mingdu-space-sm) var(--mingdu-space);font-size:var(--mingdu-font-size);font-weight:500;color:var(--mingdu-text-secondary);background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;transition:all var(--mingdu-fast);margin-bottom:-1px;position:relative}
.mingdu-tabs-tab:hover{color:var(--mingdu-primary)}
.mingdu-tabs-tab[aria-selected="true"]{color:var(--mingdu-primary);border-bottom-color:var(--mingdu-primary)}
.mingdu-tabs-panel{padding:var(--mingdu-space) 0}
.mingdu-tabs-panel[hidden]{display:none}
.tabs-scroll{overflow-x:auto;scrollbar-width:thin}
.tabs-scroll>*{flex-shrink:0}

/* ---------- Menu ---------- */
.mingdu-menu{background:var(--mingdu-bg);padding:var(--mingdu-space-xs);min-width:200px}
.mingdu-menu-inline{border-right:1px solid var(--mingdu-border);width:240px}
.mingdu-menu-horizontal{display:flex;border-bottom:1px solid var(--mingdu-border)}
.mingdu-menu-item{display:flex;align-items:center;gap:var(--mingdu-space-sm);padding:var(--mingdu-space-xs) var(--mingdu-space-sm);height:var(--mingdu-ctrl-h-lg);border-radius:var(--mingdu-radius);cursor:pointer;font-size:var(--mingdu-font-size);color:var(--mingdu-text);transition:all var(--mingdu-fast);position:relative}
.mingdu-menu-item:hover{background:var(--mingdu-fill)}
.mingdu-menu-item-selected{color:var(--mingdu-primary);background:var(--mingdu-primary-bg)}
.mingdu-menu-item-selected:hover{background:var(--mingdu-primary-bg-hover)}
.mingdu-menu-item-danger{color:var(--mingdu-error)}
.mingdu-menu-item-danger:hover{background:var(--mingdu-error-bg)}
.mingdu-menu-divider{height:1px;background:var(--mingdu-border-secondary);margin:var(--mingdu-space-xs) var(--mingdu-space-sm)}
.mingdu-menu-group-title{padding:var(--mingdu-space-xs) var(--mingdu-space-sm);font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-tertiary);font-weight:600;text-transform:uppercase}

/* ---------- Dropdown ---------- */
.mingdu-dropdown{position:relative;display:inline-block}
.mingdu-dropdown-menu{position:absolute;top:calc(100% + 4px);left:0;min-width:180px;padding:var(--mingdu-space-xs);background:var(--mingdu-bg-elevated);border-radius:var(--mingdu-radius-lg);box-shadow:var(--mingdu-shadow-lg);border:1px solid var(--mingdu-border);z-index:var(--mingdu-z-dropdown)}
.mingdu-dropdown-item{display:flex;align-items:center;gap:var(--mingdu-space-sm);padding:var(--mingdu-space-xs) var(--mingdu-space-sm);height:var(--mingdu-ctrl-h);border-radius:var(--mingdu-radius-sm);cursor:pointer;font-size:var(--mingdu-font-size);color:var(--mingdu-text);transition:background var(--mingdu-fast)}
.mingdu-dropdown-item:hover{background:var(--mingdu-fill)}
.mingdu-dropdown-item-danger{color:var(--mingdu-error)}
.mingdu-dropdown-item-danger:hover{background:var(--mingdu-error-bg)}
.mingdu-dropdown-sep{height:1px;background:var(--mingdu-border-secondary);margin:var(--mingdu-space-xs) 0}

/* ---------- Progress ---------- */
.mingdu-progress{display:flex;align-items:center;gap:var(--mingdu-space-sm)}
.mingdu-progress-track{flex:1;height:8px;background:var(--mingdu-fill);border-radius:4px;overflow:hidden}
.mingdu-progress-bar{height:100%;background:var(--mingdu-primary);border-radius:4px;transition:width var(--mingdu-slow) var(--mingdu-ease-out)}
.mingdu-progress-success .mingdu-progress-bar{background:var(--mingdu-success)}
.mingdu-progress-exception .mingdu-progress-bar{background:var(--mingdu-error)}
.mingdu-progress-text{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary);min-width:40px;text-align:right}

/* ---------- Spin ---------- */
.mingdu-spin{display:inline-flex;flex-direction:column;align-items:center;gap:var(--mingdu-space-sm)}
.mingdu-spin-icon{width:28px;height:28px;border:3px solid var(--mingdu-border);border-top-color:var(--mingdu-primary);border-radius:50%;animation:mingdu-spin .75s linear infinite}
.mingdu-spin-sm .mingdu-spin-icon{width:18px;height:18px;border-width:2px}
.mingdu-spin-lg .mingdu-spin-icon{width:40px;height:40px;border-width:4px}
.mingdu-spin-tip{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary)}

/* ---------- Skeleton ---------- */
.mingdu-skeleton{background:linear-gradient(90deg,var(--mingdu-fill) 25%,var(--mingdu-fill-secondary) 50%,var(--mingdu-fill) 75%);background-size:200% 100%;animation:mingdu-skeleton-shimmer 1.5s ease-in-out infinite;border-radius:var(--mingdu-radius)}
.mingdu-skeleton-text{height:16px;margin-bottom:var(--mingdu-space-sm);width:100%}
.mingdu-skeleton-title{height:24px;width:40%;margin-bottom:var(--mingdu-space)}
.mingdu-skeleton-avatar{width:44px;height:44px;border-radius:50%}
.mingdu-skeleton-block{height:160px}

/* ---------- Empty ---------- */
.mingdu-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--mingdu-space-xl) var(--mingdu-space);text-align:center}
.mingdu-empty-img{margin-bottom:var(--mingdu-space-md);color:var(--mingdu-text-quaternary);opacity:0.6}
.mingdu-empty-desc{font-size:var(--mingdu-font-size);color:var(--mingdu-text-secondary);margin-bottom:var(--mingdu-space)}

/* ---------- Result ---------- */
.mingdu-result{display:flex;flex-direction:column;align-items:center;padding:var(--mingdu-space-xl);text-align:center}
.mingdu-result-icon{width:80px;height:80px;display:flex;align-items:center;justify-content:center;border-radius:50%;margin-bottom:var(--mingdu-space-md);font-size:36px;font-weight:700}
.mingdu-result-success .mingdu-result-icon{color:var(--mingdu-success);background:var(--mingdu-success-bg)}
.mingdu-result-error .mingdu-result-icon{color:var(--mingdu-error);background:var(--mingdu-error-bg)}
.mingdu-result-info .mingdu-result-icon{color:var(--mingdu-primary);background:var(--mingdu-primary-bg)}
.mingdu-result-title{font-size:var(--mingdu-font-size-h3);font-weight:600;color:var(--mingdu-text-heading);margin-bottom:var(--mingdu-space-sm)}
.mingdu-result-desc{font-size:var(--mingdu-font-size);color:var(--mingdu-text-secondary);max-width:480px;margin-bottom:var(--mingdu-space-md)}

/* ---------- Divider ---------- */
.mingdu-divider{display:flex;align-items:center;margin:var(--mingdu-space) 0;color:var(--mingdu-text-secondary);font-size:var(--mingdu-font-size-sm);border:0;background:transparent}
.mingdu-divider::before,.mingdu-divider::after{content:'';flex:1;border-top:1px solid var(--mingdu-border)}
.mingdu-divider-text{gap:var(--mingdu-space);white-space:nowrap}
.mingdu-divider-text::before,.mingdu-divider-text::after{flex:1;min-width:auto;margin:0}
.mingdu-divider-vertical{display:inline-flex;align-self:stretch;flex:none;width:0;vertical-align:middle;height:1em;min-height:12px;margin:0 var(--mingdu-space-xs);padding:0;border-left:1px solid var(--mingdu-border)}
.mingdu-divider-vertical::before,.mingdu-divider-vertical::after{display:none}

/* ---------- Collapse ---------- */
.mingdu-collapse{border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);background:var(--mingdu-bg);overflow:hidden}
.mingdu-collapse-panel:not(:last-child){border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-collapse-header{display:flex;align-items:center;gap:var(--mingdu-space-sm);width:100%;padding:var(--mingdu-space) var(--mingdu-space-md);border:none;background:none;cursor:pointer;font-size:var(--mingdu-font-size);font-weight:500;color:var(--mingdu-text-heading);text-align:start;transition:background var(--mingdu-fast)}
.mingdu-collapse-header:hover{background:var(--mingdu-fill)}
.mingdu-collapse-arrow{font-size:12px;color:var(--mingdu-text-tertiary);transition:transform var(--mingdu-fast)}
.mingdu-collapse-header[aria-expanded="true"] .mingdu-collapse-arrow{transform:rotate(90deg)}
.mingdu-collapse-body{padding:0 var(--mingdu-space-md) var(--mingdu-space-md);font-size:var(--mingdu-font-size);color:var(--mingdu-text);line-height:var(--mingdu-line-height)}

/* ---------- Timeline ---------- */
.mingdu-timeline{padding:var(--mingdu-space-xs) 0}
.mingdu-timeline-item{display:flex;gap:var(--mingdu-space-sm);padding-bottom:var(--mingdu-space-md);position:relative}
.mingdu-timeline-item:last-child{padding-bottom:0}
.mingdu-timeline-dot-wrap{display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:14px}
.mingdu-timeline-dot{width:10px;height:10px;border-radius:50%;border:2px solid var(--mingdu-primary);background:var(--mingdu-bg);flex-shrink:0}
.mingdu-timeline-dot-active{background:var(--mingdu-primary)}
.mingdu-timeline-dot-success{background:var(--mingdu-success);border-color:var(--mingdu-success)}
.mingdu-timeline-line{flex:1;width:2px;background:var(--mingdu-border);margin:4px 0}
.mingdu-timeline-item:last-child .mingdu-timeline-line{display:none}
.mingdu-timeline-content{flex:1;padding-bottom:2px}
.mingdu-timeline-title{font-size:var(--mingdu-font-size);font-weight:500;color:var(--mingdu-text)}
.mingdu-timeline-time{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-tertiary);margin-top:2px}

/* ---------- Tooltip ---------- */
.mingdu-tooltip-wrap{position:relative;display:inline-flex}
.mingdu-tooltip-box{
  padding:var(--mingdu-space-xs) var(--mingdu-space-sm);max-width:280px;
  background:var(--mingdu-text);color:var(--mingdu-text-inverse);
  font-size:var(--mingdu-font-size-sm);border-radius:var(--mingdu-radius);
  white-space:normal;word-wrap:break-word;pointer-events:none;
  box-shadow:var(--mingdu-shadow-md);z-index:var(--mingdu-z-tooltip);
}
.mingdu-tooltip-box::after{
  content:'';position:absolute;left:50%;transform:translateX(-50%);
  border:5px solid transparent;
}
.mingdu-tooltip-box:not(.mingdu-float--below)::after{
  top:100%;border-top-color:var(--mingdu-text);
}
.mingdu-tooltip-box.mingdu-float--below::after{
  bottom:100%;border-bottom-color:var(--mingdu-text);
}
.mingdu-tooltip-trigger{border-bottom:1px dashed var(--mingdu-text-tertiary);cursor:help}

/* ---------- Descriptions ---------- */
.mingdu-desc{border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);overflow:hidden;background:var(--mingdu-bg)}
.mingdu-desc-header{padding:var(--mingdu-space) var(--mingdu-space-md);border-bottom:1px solid var(--mingdu-border-secondary);font-weight:600;font-size:var(--mingdu-font-size-lg);color:var(--mingdu-text-heading)}
.mingdu-desc dl{display:grid;grid-template-columns:1fr 1fr;padding:var(--mingdu-space-md);gap:var(--mingdu-space) 0}
.mingdu-desc dt{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary);margin-bottom:var(--mingdu-space-xxs)}
.mingdu-desc dd{font-size:var(--mingdu-font-size);color:var(--mingdu-text)}

/* ---------- Statistic ---------- */
.mingdu-stat-title{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary);margin-bottom:var(--mingdu-space-xxs)}
.mingdu-stat-value{font-size:var(--mingdu-font-size-h2);font-weight:700;color:var(--mingdu-text-heading);font-variant-numeric:tabular-nums}

/* ---------- Notification ---------- */
.mingdu-notification{width:360px;padding:var(--mingdu-space);background:var(--mingdu-bg-elevated);border-radius:var(--mingdu-radius-lg);box-shadow:var(--mingdu-shadow-lg);border:1px solid var(--mingdu-border)}
.mingdu-notification-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--mingdu-space-xs)}
.mingdu-notification-title{font-weight:600;font-size:var(--mingdu-font-size-lg);color:var(--mingdu-text-heading)}
.mingdu-notification-body{font-size:var(--mingdu-font-size);color:var(--mingdu-text-secondary);line-height:var(--mingdu-line-height)}

/* ---------- Drawer ---------- */
.mingdu-drawer-overlay{position:fixed;inset:0;background:var(--mingdu-bg-mask);z-index:var(--mingdu-z-modal)}
.mingdu-drawer{position:fixed;top:0;right:0;bottom:0;width:400px;max-width:100vw;display:flex;flex-direction:column;background:var(--mingdu-bg-elevated);box-shadow:var(--mingdu-shadow-xl);z-index:var(--mingdu-z-modal)}
.mingdu-drawer--closed{display:none}
.mingdu-drawer-header{display:flex;align-items:center;justify-content:space-between;padding:var(--mingdu-space) var(--mingdu-space-md);border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-drawer-header-left{display:flex;align-items:center;gap:var(--mingdu-space-sm)}
.mingdu-drawer-object-icon{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:var(--mingdu-radius);background:var(--mingdu-primary-bg);color:var(--mingdu-primary);font-size:20px}
.mingdu-drawer-object-info{display:flex;flex-direction:column}
.mingdu-drawer-object-name{font-size:18px;font-weight:600;color:var(--mingdu-text-heading)}
.mingdu-drawer-object-meta{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary)}
.mingdu-drawer-tabs{display:flex;gap:0;border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-drawer-tab{padding:var(--mingdu-space-sm) var(--mingdu-space);font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary);border:none;border-bottom:2px solid transparent;background:none;cursor:pointer;transition:all var(--mingdu-fast)}
.mingdu-drawer-tab--active{color:var(--mingdu-primary);border-bottom-color:var(--mingdu-primary)}
.mingdu-drawer-body{flex:1;overflow-y:auto;padding:var(--mingdu-space-md)}
.mingdu-drawer-content{display:flex;flex:1;overflow:hidden}
.mingdu-drawer-footer{display:flex;justify-content:flex-end;gap:var(--mingdu-space-sm);padding:var(--mingdu-space) var(--mingdu-space-md);border-top:1px solid var(--mingdu-border-secondary)}

/* ---------- Segmented ---------- */
.mingdu-segmented{display:inline-flex;padding:3px;background:var(--mingdu-fill);border-radius:var(--mingdu-radius);gap:2px}
.mingdu-segmented-item{padding:var(--mingdu-space-xxs) var(--mingdu-space-sm);height:var(--mingdu-ctrl-h-sm);border:none;border-radius:var(--mingdu-radius-sm);background:transparent;cursor:pointer;font-size:var(--mingdu-font-size);font-weight:500;color:var(--mingdu-text-secondary);transition:all var(--mingdu-fast);display:inline-flex;align-items:center;justify-content:center}
.mingdu-segmented-item:hover{color:var(--mingdu-text)}
.mingdu-segmented-item[aria-checked="true"]{background:var(--mingdu-bg);color:var(--mingdu-text);box-shadow:var(--mingdu-shadow-sm)}

/* ---------- Carousel ---------- */
.mingdu-carousel{position:relative;overflow:hidden;border-radius:var(--mingdu-radius-xl);background:var(--mingdu-fill-secondary)}
.mingdu-carousel-track{display:flex;transition:transform var(--mingdu-slow) var(--mingdu-ease-out)}
.mingdu-carousel-slide{flex:0 0 100%;padding:var(--mingdu-space-md) var(--mingdu-space-xl);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px}
.mingdu-carousel-dots{position:absolute;bottom:var(--mingdu-space);left:50%;transform:translateX(-50%);display:flex;gap:var(--mingdu-space-xs)}
.mingdu-carousel-dot{width:8px;height:8px;border-radius:50%;border:none;background:rgba(0,0,0,0.15);cursor:pointer;transition:all var(--mingdu-fast)}
.mingdu-carousel-dot.active{width:24px;border-radius:4px;background:var(--mingdu-primary)}

/* ---------- Popconfirm ---------- */
.mingdu-popconfirm{position:relative;display:inline-block}
.mingdu-popconfirm-box{
  width:260px;padding:var(--mingdu-space);
  background:var(--mingdu-bg-elevated);border-radius:var(--mingdu-radius-lg);
  box-shadow:var(--mingdu-shadow-lg);border:1px solid var(--mingdu-border);
  z-index:var(--mingdu-z-dropdown);
}
.mingdu-popconfirm-msg{display:flex;gap:var(--mingdu-space-sm);margin-bottom:var(--mingdu-space);font-size:var(--mingdu-font-size);color:var(--mingdu-text)}
.mingdu-popconfirm-actions{display:flex;justify-content:flex-end;gap:var(--mingdu-space-sm)}
.mingdu-popconfirm-msg .mingdu-icon-warn{color:var(--mingdu-warning);font-size:18px;flex-shrink:0;margin-top:1px}

/* ---------- Demo helpers ---------- */
.mingdu-demo-section{margin-bottom:var(--mingdu-space-lg)}
.mingdu-demo-title{font-size:var(--mingdu-font-size-h5);font-weight:600;color:var(--mingdu-text-heading);margin-bottom:var(--mingdu-space)}
.mingdu-demo-subtitle{font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary);margin-bottom:var(--mingdu-space-sm)}
.mingdu-demo-row{display:flex;gap:var(--mingdu-space-sm);align-items:center;flex-wrap:wrap;margin-bottom:var(--mingdu-space-sm)}
.mingdu-demo-box{padding:var(--mingdu-space-sm) var(--mingdu-space);background:var(--mingdu-primary-bg);color:var(--mingdu-primary);border-radius:var(--mingdu-radius-sm);font-size:var(--mingdu-font-size-sm);font-weight:500;border:1px dashed var(--mingdu-primary-border);text-align:center}

/* ---------- Keyframes ---------- */
@keyframes mingdu-spin{to{transform:rotate(360deg)}}
@keyframes mingdu-skeleton-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ---------- Date panel / Calendar ---------- */
.mingdu-date-panel{border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);background:var(--mingdu-bg);width:280px;box-shadow:var(--mingdu-shadow-md);padding:8px 8px 12px}
.mingdu-date-panel__header{display:flex;align-items:center;justify-content:space-between;padding:4px 4px 8px;font-weight:600;font-size:14px;color:var(--mingdu-text-heading)}
.mingdu-date-panel__nav{display:flex;gap:4px}
.mingdu-date-panel__prev,.mingdu-date-panel__next{border:none;background:transparent;width:28px;height:28px;border-radius:var(--mingdu-radius-sm);cursor:pointer;color:var(--mingdu-text-secondary);display:inline-flex;align-items:center;justify-content:center}
.mingdu-date-panel__prev:hover,.mingdu-date-panel__next:hover{background:var(--mingdu-fill);color:var(--mingdu-text)}
.mingdu-date-panel__week{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:12px;color:var(--mingdu-text-tertiary);padding:0 0 4px}
.mingdu-date-panel__week span{padding:4px 0}
.mingdu-date-panel__grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.mingdu-date-panel__cell{border:none;background:transparent;border-radius:var(--mingdu-radius-sm);min-height:32px;height:32px;font-size:13px;color:var(--mingdu-text);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;gap:2px}
.mingdu-date-panel__cell:hover:not(:disabled){background:var(--mingdu-fill)}
.mingdu-date-panel__cell--selected,.mingdu-date-panel__cell--selected:hover{background:var(--mingdu-primary);color:#fff}
.mingdu-date-panel__cell--today{font-weight:600;color:var(--mingdu-primary)}
.mingdu-date-panel__cell--selected.mingdu-date-panel__cell--today{color:#fff}
.mingdu-date-panel__cell--muted{color:var(--mingdu-text-quaternary)}
.mingdu-date-panel__cell--disabled{color:var(--mingdu-text-quaternary);cursor:not-allowed;opacity:0.5}
.mingdu-date-panel__cell--in-range{background:var(--mingdu-primary-bg);border-radius:0}
.mingdu-date-panel__cell--range-start,.mingdu-date-panel__cell--range-end{background:var(--mingdu-primary);color:#fff}
.mingdu-date-panel__shortcuts{display:flex;gap:8px;padding:8px 4px 0;border-top:1px solid var(--mingdu-border-secondary);margin-top:8px;flex-wrap:wrap}
.mingdu-date-panel__shortcut{border:none;background:var(--mingdu-fill);padding:4px 10px;font-size:12px;border-radius:var(--mingdu-radius-sm);cursor:pointer;color:var(--mingdu-text)}
.mingdu-date-panel__shortcut:hover{background:var(--mingdu-primary-bg);color:var(--mingdu-primary)}
.mingdu-datepicker{position:relative;display:inline-block;max-width:100%}
.mingdu-datepicker__trigger{position:relative;display:flex;align-items:center;width:100%}
.mingdu-datepicker__input{width:100%;padding-right:32px;cursor:pointer}
.mingdu-datepicker__icon{position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--mingdu-text-tertiary);pointer-events:none;font-size:14px}
.mingdu-datepicker--open .mingdu-datepicker__icon .MSP-icon_down{transform:rotate(180deg)}
.mingdu-datepicker__panel{position:absolute;left:0;top:calc(100% + 4px);z-index:var(--mingdu-z-dropdown,1000)}
.mingdu-datepicker--disabled .mingdu-datepicker__input{cursor:not-allowed;opacity:0.6}
.mingdu-datepicker--disabled .mingdu-datepicker__icon{opacity:0.5}
.mingdu-calendar .mingdu-date-panel{width:100%;max-width:100%;box-shadow:none;border:none}
.mingdu-calendar-event-dot{display:inline-block;width:4px;height:4px;border-radius:50%;background:var(--mingdu-primary);margin-top:2px}
.mingdu-time-picker{position:relative;display:inline-block}
.mingdu-time-picker__panel{position:absolute;top:calc(100% + 4px);left:0;z-index:var(--mingdu-z-dropdown,1000);border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);background:var(--mingdu-bg);box-shadow:var(--mingdu-shadow-md);max-height:200px;overflow:auto;min-width:120px;padding:4px 0}
.mingdu-time-picker__option{display:block;width:100%;border:none;background:transparent;text-align:left;padding:6px 12px;font-size:13px;cursor:pointer;color:var(--mingdu-text)}
.mingdu-time-picker__option:hover,.mingdu-time-picker__option--active{background:var(--mingdu-fill);color:var(--mingdu-primary)}
.mingdu-time-picker--open .mingdu-time-picker__panel{display:block}

/* ---------- Tree ---------- */
.mingdu-tree{list-style:none;margin:0;padding:0;font-size:14px}
.mingdu-tree-node{list-style:none}
.mingdu-tree-node__expand{border:none;background:transparent;padding:0 4px;cursor:pointer;color:var(--mingdu-text-tertiary);vertical-align:middle}
.mingdu-tree-node__label{display:inline-block;padding:4px 8px;border-radius:var(--mingdu-radius-sm);cursor:pointer}
.mingdu-tree-node__label:hover{background:var(--mingdu-fill)}
.mingdu-tree-node__label--active{background:var(--mingdu-primary-bg);color:var(--mingdu-primary);font-weight:500}
.mingdu-tree-node__children{list-style:none;margin:0 0 0 20px;padding:0}
.mingdu-tree-select-dropdown{padding:8px;max-height:280px;overflow:auto}
.mingdu-tree-select-dropdown .mingdu-tree-node{margin:2px 0}

/* ---------- Transfer ---------- */
.mingdu-transfer{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.mingdu-transfer__list{width:220px;border:1px solid var(--mingdu-border);border-radius:8px;background:var(--mingdu-bg)}
.mingdu-transfer__head{padding:8px 12px;font-size:13px;font-weight:600;border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-transfer__body{padding:8px;display:flex;flex-direction:column;gap:6px;min-height:120px}
.mingdu-transfer__actions{display:flex;flex-direction:column;gap:8px}
.mingdu-transfer__empty{display:none;padding:8px;color:var(--mingdu-text-tertiary);font-size:12px}
.mingdu-transfer__list--empty .mingdu-transfer__empty{display:block}

/* ---------- Filter Bar ---------- */
.mingdu-filter-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;padding:16px;background:var(--mingdu-fill-secondary);border-radius:8px}
.mingdu-filter-item{display:flex;flex-direction:column;gap:6px;min-width:180px}
.mingdu-filter-item .mingdu-select-custom{width:100%}
.mingdu-filter-actions{display:flex;align-items:flex-end;min-height:58px}

/* ---------- Cascader ---------- */
.mingdu-cascader-panel{position:absolute;z-index:var(--mingdu-z-dropdown,1000);margin-top:4px;border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);background:var(--mingdu-bg);box-shadow:var(--mingdu-shadow-md)}
.mingdu-cascader-menus{display:flex}
.mingdu-cascader-menu{list-style:none;margin:0;padding:4px 0;min-width:120px;border-right:1px solid var(--mingdu-border-secondary)}
.mingdu-cascader-menu:last-child{border-right:none}
.mingdu-cascader-node{padding:6px 12px;font-size:13px;cursor:pointer;display:flex;justify-content:space-between;align-items:center}
.mingdu-cascader-node:hover,.mingdu-cascader-node--active{background:var(--mingdu-fill)}
.mingdu-cascader{position:relative;display:inline-block;width:100%;max-width:360px}
.mingdu-cascader.mingdu-cascader--open .mingdu-cascader-panel{display:flex}
.mingdu-cascader.mingdu-cascader--disabled{opacity:0.6;pointer-events:none}


/* === layout.css === */
/* ============================================================
   Mingdu Design — Layout v1.0
   Layout system: App shell, header, sidebar, workspace,
   grid, space, flex utilities
   ============================================================ */

/* ---------- App Shell ---------- */
.mingdu-layout{display:flex;flex-direction:column;min-height:100vh}
.mingdu-layout-header{
  height:var(--mingdu-header-height);padding:0 var(--mingdu-space-md);
  display:flex;align-items:center;background:var(--mingdu-primary);color:#fff;
  flex-shrink:0;gap:var(--mingdu-space-sm);
}
.mingdu-layout-header a{color:rgba(255,255,255,0.75);transition:color var(--mingdu-fast)}
.mingdu-layout-header a:hover{color:#fff}
.mingdu-layout-header a.active{color:#fff;font-weight:500}
.mingdu-layout-body{display:flex;flex:1;min-height:0}
.mingdu-layout-sider{width:240px;background:var(--mingdu-bg);border-right:1px solid var(--mingdu-border);padding:var(--mingdu-space-sm);overflow-y:auto;flex-shrink:0}
.mingdu-layout-content{flex:1;padding:var(--mingdu-space-md);background:var(--mingdu-bg-layout);overflow-y:auto;min-width:0}
.mingdu-layout-footer{padding:var(--mingdu-space) var(--mingdu-space-md);text-align:center;font-size:var(--mingdu-font-size-sm);color:var(--mingdu-text-secondary);background:var(--mingdu-bg);border-top:1px solid var(--mingdu-border);flex-shrink:0}

/* ---------- Header ---------- */
.mingdu-header{
  height:var(--mingdu-header-height);padding:0 var(--mingdu-space-md);
  display:flex;align-items:center;background:var(--mingdu-primary);color:#fff;
  flex-shrink:0;gap:var(--mingdu-space-sm);
}
.mingdu-header__menu-btn{
  display:none;align-items:center;justify-content:center;
  width:36px;height:36px;border:none;border-radius:var(--mingdu-radius);
  background:rgba(255,255,255,0.12);color:#fff;cursor:pointer;font-size:18px;
}
.mingdu-header__brand{display:flex;align-items:center;gap:var(--mingdu-space-sm);color:#fff;font-weight:600;font-size:16px;white-space:nowrap}
.mingdu-header__logo{width:24px;height:24px;border-radius:var(--mingdu-radius-sm);background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700}
.mingdu-header__logo-img{height:28px;max-width:160px;object-fit:contain}
.mingdu-header__brand-sub{font-size:13px;opacity:0.92;font-weight:400;padding-left:var(--mingdu-space-sm);border-left:1px solid rgba(255,255,255,0.3)}
.mingdu-header__search{display:flex;align-items:center;gap:var(--mingdu-space-xs);max-width:320px;flex:1;height:36px;padding:0 var(--mingdu-space-sm);border-radius:var(--mingdu-radius);background:rgba(255,255,255,0.12);transition:background var(--mingdu-fast)}
.mingdu-header__search input{flex:1;border:none;background:transparent;color:#fff;font-size:13px;outline:none}
.mingdu-header__search input::placeholder{color:rgba(255,255,255,0.55)}
.mingdu-header__right{display:flex;align-items:center;gap:var(--mingdu-space-xs);margin-left:auto}
.mingdu-header__icon-btn{
  display:flex;align-items:center;justify-content:center;
  width:36px;height:36px;border:none;border-radius:var(--mingdu-radius);
  background:transparent;color:#fff;cursor:pointer;font-size:18px;
  transition:background var(--mingdu-fast);
}
.mingdu-header__icon-btn:hover{background:rgba(255,255,255,0.12)}
.mingdu-header__user{display:flex;align-items:center;gap:var(--mingdu-space-xs);color:#fff;font-size:13px;cursor:pointer;padding:4px var(--mingdu-space-xs);border-radius:var(--mingdu-radius);transition:background var(--mingdu-fast)}
.mingdu-header__user:hover{background:rgba(255,255,255,0.12)}
.mingdu-header-demo{
  padding:0 12px;
  grid-template-columns:auto auto auto 1fr auto;
  align-items:center;
  column-gap:8px;
}
.mingdu-header-demo .mingdu-header__search{
  justify-self:center;
  width:min(320px,100%);
  margin:0 auto;
}
.mingdu-header-demo .mingdu-header__right{
  margin-left:0;
  gap:4px;
}
.mingdu-header-demo .mingdu-header__icon-btn{
  width:28px;
  height:28px;
}
.mingdu-header__text-btn{
  height:32px;padding:0 10px;border:none;border-radius:8px;background:transparent;color:#fff;
  display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:400;cursor:pointer;position:relative;
}
.mingdu-header__text-btn:hover{background:rgba(255,255,255,0.12)}
.mingdu-header__dot-btn{position:relative}
.mingdu-header__demo-badge{
  position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;
  background:#FF6B6B;color:#fff;font-size:11px;line-height:18px;text-align:center;font-weight:600;
}

/* ---------- Sidebar ---------- */
.mingdu-sidebar-nav{
  width:var(--mingdu-sidebar-width);background:var(--mingdu-bg);
  border-right:1px solid var(--mingdu-border);display:flex;flex-direction:column;
  flex-shrink:0;overflow-y:auto;
}
.mingdu-nav-header{display:flex;align-items:center;justify-content:space-between;padding:var(--mingdu-space) var(--mingdu-space-md);border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-nav-header__title{font-size:14px;font-weight:600;color:var(--mingdu-text-heading)}
.mingdu-nav-search{display:flex;align-items:center;gap:var(--mingdu-space-xs);margin:var(--mingdu-space-sm);padding:0 var(--mingdu-space-sm);height:32px;border-radius:var(--mingdu-radius);background:var(--mingdu-fill);font-size:13px;color:var(--mingdu-text-secondary)}
.mingdu-nav-search input{flex:1;border:none;background:transparent;outline:none;font-size:13px}
.mingdu-nav-group{padding:var(--mingdu-space-xs) 0}
.mingdu-nav-group__header{display:flex;align-items:center;justify-content:space-between;padding:var(--mingdu-space-xs) var(--mingdu-space) var(--mingdu-space-xs) var(--mingdu-space-sm);font-size:12px;font-weight:400;color:var(--mingdu-text-tertiary);text-transform:none}
.mingdu-nav-group__count{font-size:11px;color:var(--mingdu-text-tertiary);font-weight:400}
.mingdu-nav-item{
  display:flex;align-items:center;gap:var(--mingdu-space-sm);padding:8px var(--mingdu-space-sm);
  margin:0 var(--mingdu-space-xs);border-radius:var(--mingdu-radius);font-size:13px;
  color:var(--mingdu-text);cursor:pointer;transition:all var(--mingdu-fast);
}
.mingdu-nav-item:hover{background:var(--mingdu-fill)}
.mingdu-nav-item--active{color:var(--mingdu-primary);background:var(--mingdu-primary-bg);font-weight:500}
.mingdu-nav-item__icon{display:flex;align-items:center;justify-content:center;width:20px;height:20px;font-size:16px;color:var(--mingdu-text-secondary);flex-shrink:0}
.mingdu-nav-item--active .mingdu-nav-item__icon{color:var(--mingdu-primary)}
.mingdu-nav-item__badge{margin-left:auto;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--mingdu-error);color:#fff;font-size:11px;font-weight:600;line-height:18px;text-align:center}

/* ---------- Primary Sidebar (Config center level 1) ---------- */
.mingdu-primary-sidebar{
  width:168px;background:var(--mingdu-bg);border-right:1px solid var(--mingdu-border);
  display:flex;flex-direction:column;flex-shrink:0;font-size:13px;
}
.mingdu-primary-sidebar__item{
  display:flex;align-items:center;gap:var(--mingdu-space-sm);
  padding:10px var(--mingdu-space);border-left:3px solid transparent;
  color:var(--mingdu-text);cursor:pointer;transition:all var(--mingdu-fast);
}
.mingdu-primary-sidebar__item:hover{background:var(--mingdu-fill)}
.mingdu-primary-sidebar__item--active{
  color:var(--mingdu-primary);background:var(--mingdu-primary-bg);
  border-left-color:var(--mingdu-primary);
}
.mingdu-primary-sidebar__footer{margin-top:auto;padding:var(--mingdu-space-sm) var(--mingdu-space);border-top:1px solid var(--mingdu-border-secondary);font-size:12px;color:var(--mingdu-text-tertiary)}

/* ---------- Secondary Sidebar (Config center level 2) ---------- */
.mingdu-secondary-sidebar{
  width:200px;background:var(--mingdu-bg);border-right:1px solid var(--mingdu-border);
  display:flex;flex-direction:column;flex-shrink:0;padding:var(--mingdu-space-sm) 0;
  overflow-y:auto;
}
.mingdu-secondary-sidebar__title{font-size:14px;font-weight:600;color:var(--mingdu-text-heading);padding:0 var(--mingdu-space) var(--mingdu-space-sm)}
.mingdu-secondary-nav__group-title{font-size:12px;color:var(--mingdu-text-secondary);padding:var(--mingdu-space-sm) var(--mingdu-space) var(--mingdu-space-xs);font-weight:500}
.mingdu-secondary-nav__item{
  display:block;padding:6px var(--mingdu-space);padding-left:28px;font-size:13px;
  color:var(--mingdu-text);text-decoration:none;cursor:pointer;
  border-radius:var(--mingdu-radius);margin:0 var(--mingdu-space-xs);
  transition:all var(--mingdu-fast);
}
.mingdu-secondary-nav__item:hover{background:var(--mingdu-fill)}
.mingdu-secondary-nav__item--active{color:var(--mingdu-primary);background:var(--mingdu-primary-bg);font-weight:500}

/* ---------- Rail Nav ---------- */
.mingdu-rail-nav{
  width:60px;background:var(--mingdu-bg);border-right:1px solid var(--mingdu-border);
  display:flex;flex-direction:column;align-items:center;flex-shrink:0;
  padding:var(--mingdu-space-xs) 0;gap:2px;
}
.mingdu-rail-nav--wide{width:72px}
.mingdu-rail-nav__item{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  width:40px;height:40px;border-radius:var(--mingdu-radius);
  color:var(--mingdu-text-secondary);cursor:pointer;transition:all var(--mingdu-fast);
  font-size:20px;gap:0;
}
.mingdu-rail-nav--wide .mingdu-rail-nav__item{width:56px;height:56px;gap:2px}
.mingdu-rail-nav__item:hover{background:var(--mingdu-fill);color:var(--mingdu-text)}
.mingdu-rail-nav__item--active{color:var(--mingdu-primary);background:var(--mingdu-primary-bg)}
.mingdu-rail-nav__label{font-size:10px;line-height:1.2;color:inherit}

/* ---------- Workspace ---------- */
.mingdu-workspace{display:flex;flex-direction:column;flex:1;background:var(--mingdu-bg-layout);overflow:hidden}
.mingdu-workspace__title{font-size:18px;font-weight:600;color:var(--mingdu-text-heading);padding:10px var(--mingdu-space-md) 0}
.mingdu-workspace-toolbar{display:flex;align-items:center;gap:var(--mingdu-space-sm);padding:10px var(--mingdu-space-md);flex-wrap:wrap}
.mingdu-workspace-toolbar .mingdu-filter-bar{padding:0;background:unset;border-radius:0}

/* ---------- Page Header ---------- */
.mingdu-page-header{
  display:flex;align-items:center;justify-content:space-between;
  height:56px;padding:0 var(--mingdu-space-md);border-bottom:1px solid var(--mingdu-border-secondary);
  background:var(--mingdu-bg);flex-shrink:0;
}
.mingdu-page-header__left{display:flex;align-items:center;gap:var(--mingdu-space-sm)}
.mingdu-page-header__icon{
  display:flex;align-items:center;justify-content:center;
  width:32px;height:32px;border-radius:var(--mingdu-radius);
  background:var(--mingdu-primary-bg);color:var(--mingdu-primary);font-size:18px;
}
.mingdu-page-header__info{display:flex;flex-direction:column;min-width:0}
.mingdu-page-header__title{font-size:18px;font-weight:600;color:var(--mingdu-text-heading);line-height:1.3}
.mingdu-page-header__sub{font-size:12px;color:var(--mingdu-text-secondary)}
.mingdu-page-header__actions{display:flex;align-items:center;gap:var(--mingdu-space-xs)}

/* ---------- Filter Bar ---------- */
.mingdu-filter-bar{display:flex;align-items:center;gap:var(--mingdu-space-sm);flex-wrap:wrap}
.mingdu-filter-search{
  display:flex;align-items:center;gap:var(--mingdu-space-xs);
  width:280px;height:36px;padding:0 var(--mingdu-space-sm);
  background:var(--mingdu-bg);border:1px solid var(--mingdu-border);
  border-radius:var(--mingdu-radius);font-size:13px;
  transition:border-color var(--mingdu-fast),box-shadow var(--mingdu-fast);
}
.mingdu-filter-search:focus-within{border-color:var(--mingdu-primary);box-shadow:0 0 0 3px var(--mingdu-primary-bg)}
.mingdu-filter-search input{flex:1;border:none;background:transparent;outline:none;font-size:13px;color:var(--mingdu-text)}
.mingdu-filter-search input::placeholder{color:var(--mingdu-text-tertiary)}
.mingdu-filter-select{
  height:36px;padding:0 28px 0 var(--mingdu-space-sm);min-width:120px;
  background:var(--mingdu-bg);border:1px solid var(--mingdu-border);
  border-radius:var(--mingdu-radius);font-size:13px;color:var(--mingdu-text);
  cursor:pointer;appearance:none;outline:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2394A3B8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 8px center;
}
.mingdu-filter-tabs{display:flex;padding:2px;background:var(--mingdu-fill);border-radius:var(--mingdu-radius);gap:1px}
.mingdu-filter-tab{
  padding:4px var(--mingdu-space-sm);height:28px;border:none;border-radius:var(--mingdu-radius-sm);
  background:transparent;cursor:pointer;font-size:13px;color:var(--mingdu-text-secondary);
  transition:all var(--mingdu-fast);display:inline-flex;align-items:center;
}
.mingdu-filter-tab--active{background:var(--mingdu-bg);color:var(--mingdu-text);font-weight:500;box-shadow:var(--mingdu-shadow-sm)}

/* ---------- Detail Split / Detail Page ---------- */
.mingdu-detail-split{display:grid;grid-template-columns:1fr 1.15fr;flex:1;min-height:0}
.mingdu-detail-page{flex:1;min-height:0;background:var(--mingdu-bg);overflow:auto}
.mingdu-detail-meta{border-right:1px solid var(--mingdu-border);background:var(--mingdu-bg);overflow-y:auto}
.mingdu-detail-page .mingdu-detail-meta{border-right:none;overflow:visible}
.mingdu-detail-meta__scroll{
  padding:var(--mingdu-space-md);width:100%;box-sizing:border-box;
  container-type:inline-size;container-name:detail-meta;
}
.mingdu-detail-page .mingdu-detail-meta__scroll{max-width:1200px;min-width:640px;margin:0 auto}
.mingdu-detail-split .mingdu-detail-meta__scroll{min-width:0;max-width:none}
.mingdu-detail-meta__head{display:flex;align-items:center;gap:var(--mingdu-space-sm);margin-bottom:var(--mingdu-space-md)}
.mingdu-detail-meta__head--toolbar{justify-content:space-between;align-items:flex-start}
.mingdu-detail-meta__head-main{display:flex;align-items:center;gap:var(--mingdu-space-sm);min-width:0}
.mingdu-detail-meta__edit{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:500;flex-shrink:0}
.mingdu-detail-meta__icon{
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  width:48px;height:48px;border-radius:var(--mingdu-radius-lg);
  background:var(--mingdu-primary-bg);color:var(--mingdu-primary);font-size:24px;
}
.mingdu-detail-meta__icon--round{border-radius:50%}
.mingdu-detail-meta__name{font-size:20px;font-weight:700;color:var(--mingdu-text-heading)}
.mingdu-detail-meta__id{font-size:12px;font-weight:400;color:var(--mingdu-text-secondary);margin-top:2px}
.mingdu-detail-meta__sections{display:flex;flex-direction:column;gap:var(--mingdu-space-md)}
.mingdu-detail-panels{flex:1;background:var(--mingdu-bg);overflow-y:auto;min-width:0}
.mingdu-detail-split--stacked{grid-template-columns:1fr}
.mingdu-detail-split--stacked .mingdu-detail-meta--sidebar{display:none}
.mingdu-detail-split:not(.mingdu-detail-split--stacked) .mingdu-inner-tabs__item--meta-slot{display:none}
.mingdu-detail-meta__tab-body{padding:0;overflow:visible}
.mingdu-detail-meta__tab-body > .mingdu-detail-meta__scroll{padding:var(--mingdu-space-md)}
.mingdu-inner-tabs{display:flex;gap:20px;padding:0 var(--mingdu-space-md);border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-inner-tabs__item{
  padding:var(--mingdu-space-sm) 0;font-size:13px;color:var(--mingdu-text-secondary);
  border:none;border-bottom:2px solid transparent;background:none;cursor:pointer;
  transition:all var(--mingdu-fast);
}
.mingdu-inner-tabs__item--active{color:var(--mingdu-primary);border-bottom-color:var(--mingdu-primary)}
.mingdu-inner-tab-body{padding:var(--mingdu-space);overflow-y:auto}

/* ---------- Meta Grid ---------- */
.mingdu-meta-grid{display:grid;grid-template-columns:100px 1fr;gap:8px 12px;margin-bottom:var(--mingdu-space)}
.mingdu-meta-grid--dense{grid-template-columns:72px 1fr 72px 1fr}
.mingdu-meta-grid--cols3{
  grid-template-columns:1fr;
  gap:16px 20px;margin-bottom:var(--mingdu-space-lg);
}
@container detail-meta (min-width:420px){
  .mingdu-meta-grid--cols3{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@container detail-meta (min-width:620px){
  .mingdu-meta-grid--cols3{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px 24px}
}
.mingdu-meta-grid--cols3 .mingdu-meta-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.mingdu-meta-grid--cols3 .mingdu-meta-field > .mingdu-meta-field__label,
.mingdu-meta-grid--cols3 dt{
  font-size:12px;line-height:1.4;color:var(--mingdu-text-tertiary);font-weight:400;
}
.mingdu-meta-grid--cols3 .mingdu-meta-field > .mingdu-meta-field__value,
.mingdu-meta-grid--cols3 dd{
  font-size:var(--mingdu-font-size);line-height:1.5;color:var(--mingdu-text);font-weight:500;margin:0;
}
.mingdu-meta-field__label{
  font-size:12px;line-height:1.4;color:var(--mingdu-text-tertiary);font-weight:400;
}
.mingdu-meta-field__value{
  font-size:var(--mingdu-font-size);line-height:1.5;color:var(--mingdu-text);font-weight:500;
}
.mingdu-meta-field__value--tags{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.mingdu-meta-field__hint{
  display:block;width:100%;font-size:12px;color:var(--mingdu-text-tertiary);
  font-weight:400;line-height:1.4;margin:0;
}
.mingdu-text-success{color:#059669;font-weight:500}
.mingdu-meta-grid dt{font-size:12px;color:var(--mingdu-text-secondary)}
.mingdu-meta-grid dd{font-size:var(--mingdu-font-size);color:var(--mingdu-text);font-weight:500}

/* ---------- Attribute table (detail sections) ---------- */
.mingdu-detail-meta__sections .mingdu-section-card__head{
  background:var(--mingdu-bg);border-bottom:1px solid var(--mingdu-border-secondary);
}
.mingdu-detail-meta__sections .mingdu-section-card__title{
  font-size:var(--mingdu-font-size);font-weight:700;color:var(--mingdu-text-heading);
}
.mingdu-attr-table th:first-child,.mingdu-attr-table td:first-child{
  width:200px;color:var(--mingdu-text-secondary);font-weight:400;background:var(--mingdu-bg);
}
.mingdu-attr-table thead th{
  background:var(--mingdu-fill-secondary)!important;
  color:var(--mingdu-text-secondary);font-weight:500;
  text-transform:none;letter-spacing:normal;
}
.mingdu-attr-table td .mingdu-entity-link{margin-right:8px}
.mingdu-section-card__body{padding:0}
.mingdu-section-card__body .mingdu-table-wrap{border:none;border-radius:0}
.mingdu-section-card + .mingdu-section-card{margin-top:0}
.mingdu-detail-meta__sections > .mingdu-section-card + .mingdu-section-card{margin-top:0}

/* ---------- Detail Rows ---------- */
.mingdu-detail-row{display:flex;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-detail-row:last-child{border-bottom:none}
.mingdu-detail-row__label{width:100px;flex-shrink:0;font-size:13px;color:var(--mingdu-text-secondary)}
.mingdu-detail-row__value{flex:1;font-size:13px;color:var(--mingdu-text);font-weight:500}
.mingdu-detail-row__actions{display:flex;gap:var(--mingdu-space-sm);flex-shrink:0}

/* ---------- Entity Link ---------- */
.mingdu-entity-link{display:inline-flex;align-items:center;gap:2px;color:var(--mingdu-primary);cursor:pointer;font-size:13px;font-weight:500}
.mingdu-entity-link:hover{color:var(--mingdu-primary-hover);text-decoration:underline}
.mingdu-entity-preview{
  position:absolute;z-index:var(--mingdu-z-dropdown);padding:var(--mingdu-space-sm);
  background:var(--mingdu-bg-elevated);border:1px solid var(--mingdu-border);
  border-radius:var(--mingdu-radius-lg);box-shadow:var(--mingdu-shadow-lg);
  min-width:200px;font-size:13px;
}
.mingdu-entity-preview__name{font-weight:600;color:var(--mingdu-text-heading);margin-bottom:4px}
.mingdu-entity-preview__id{font-size:12px;color:var(--mingdu-text-secondary)}

/* ---------- Popover Panel ---------- */
.mingdu-popover-panel{
  position:absolute;z-index:30;min-width:240px;
  padding:var(--mingdu-space-sm);background:var(--mingdu-bg-elevated);
  border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);
  box-shadow:var(--mingdu-shadow-lg);
}
.mingdu-popover-panel__title{font-size:13px;font-weight:600;color:var(--mingdu-text-heading);margin-bottom:var(--mingdu-space-sm)}
.mingdu-popover-panel__footer{display:flex;justify-content:flex-end;gap:var(--mingdu-space-xs);margin-top:var(--mingdu-space-sm);padding-top:var(--mingdu-space-sm);border-top:1px solid var(--mingdu-border-secondary)}

/* ---------- Form Group ---------- */
.mingdu-form-group{display:flex;flex-direction:column;gap:6px}
.mingdu-form-label{font-size:13px;color:var(--mingdu-text);font-weight:500}
.mingdu-form-label__required{color:var(--mingdu-error);margin-left:2px}
.mingdu-form-hint{font-size:12px;color:var(--mingdu-text-secondary)}
.mingdu-form-hint--error{color:var(--mingdu-error)}
.mingdu-form-row{display:flex;gap:var(--mingdu-space)}
.mingdu-form-textarea{width:100%;min-height:72px;padding:var(--mingdu-space-xs) var(--mingdu-space-sm);font-size:13px;font-family:var(--mingdu-font);color:var(--mingdu-text);background:var(--mingdu-bg);border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius);resize:vertical;outline:none;transition:border-color var(--mingdu-fast),box-shadow var(--mingdu-fast)}
.mingdu-form-textarea:focus{border-color:var(--mingdu-primary);box-shadow:0 0 0 3px var(--mingdu-primary-bg)}
.mingdu-form-input--error{border-color:var(--mingdu-error)!important}
.mingdu-form-input--error:focus{box-shadow:0 0 0 3px var(--mingdu-error-bg)!important}
.mingdu-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px}
.mingdu-form-group--full{grid-column:1/-1}
.mingdu-form-panel{background:var(--mingdu-bg);border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);padding:20px}
.mingdu-form-panel h3{font-size:14px;font-weight:600;margin-bottom:var(--mingdu-space)}
.mingdu-form-sections{overflow-y:auto;padding:var(--mingdu-space-md);display:flex;flex-direction:column;gap:var(--mingdu-space-md)}

/* ---------- Tag Input ---------- */
.mingdu-tag-input{display:flex;flex-wrap:wrap;gap:4px;padding:4px 8px;min-height:36px;border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius);background:var(--mingdu-bg);align-items:center;cursor:text;transition:border-color var(--mingdu-fast),box-shadow var(--mingdu-fast)}
.mingdu-tag-input:focus-within{border-color:var(--mingdu-primary);box-shadow:0 0 0 3px var(--mingdu-primary-bg)}
.mingdu-tag-input input{flex:1;min-width:60px;border:none;outline:none;font-size:13px;background:transparent}
.mingdu-tag-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;font-size:12px;background:var(--mingdu-fill);border-radius:var(--mingdu-radius-sm);color:var(--mingdu-text)}
.mingdu-tag-chip__close{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border:none;border-radius:50%;background:transparent;cursor:pointer;color:var(--mingdu-text-tertiary);font-size:12px}
.mingdu-tag-chip__close:hover{background:rgba(0,0,0,0.08);color:var(--mingdu-text)}

/* ---------- Alias Group ---------- */
.mingdu-alias-group{display:flex;flex-wrap:wrap;gap:8px}
.mingdu-alias-chip{
  display:inline-flex;align-items:center;gap:4px;
  padding:2px 8px;font-size:12px;border:1px solid var(--mingdu-primary-border);
  border-radius:var(--mingdu-radius-full);background:var(--mingdu-primary-bg);
  color:var(--mingdu-primary);
}
.mingdu-alias-chip__close{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border:none;border-radius:50%;background:transparent;cursor:pointer;color:inherit;opacity:0.6}
.mingdu-alias-chip__close:hover{opacity:1;background:rgba(0,0,0,0.06)}

/* ---------- App Shell ---------- */
.mingdu-app-shell{display:flex;flex:1;overflow:hidden}
.mingdu-page-registry{display:flex;flex:1;overflow:hidden}
.mingdu-layout-fill{flex:1;min-height:0}
.mingdu-main-content{display:flex;flex-direction:column;flex:1;overflow:hidden}

/* ---------- Grid System ---------- */
.mingdu-row{display:flex;flex-wrap:wrap;margin-inline:-8px}
.mingdu-row-gutter-sm{margin-inline:-4px}.mingdu-row-gutter-sm>.mingdu-col{padding-inline:4px}
.mingdu-row-gutter-lg{margin-inline:-12px}.mingdu-row-gutter-lg>.mingdu-col{padding-inline:12px}
.mingdu-col{padding-inline:8px;flex:0 0 auto}
.mingdu-col-24{flex:0 0 100%;max-width:100%}
.mingdu-col-12{flex:0 0 50%;max-width:50%}
.mingdu-col-8{flex:0 0 33.333%;max-width:33.333%}
.mingdu-col-6{flex:0 0 25%;max-width:25%}
.mingdu-col-16{flex:0 0 66.666%;max-width:66.666%}
.mingdu-col-4{flex:0 0 16.666%;max-width:16.666%}

/* ---------- Space Utilities ---------- */
.mingdu-space{display:inline-flex;gap:var(--mingdu-space-sm);align-items:center}
.mingdu-space-vertical{flex-direction:column}
.mingdu-space-lg{gap:var(--mingdu-space)}
.mingdu-space-wrap{flex-wrap:wrap}

/* ---------- Flex Utilities ---------- */
.mingdu-flex{display:flex}
.mingdu-flex-col{flex-direction:column}
.mingdu-flex-between{justify-content:space-between;align-items:center}
.mingdu-flex-center{justify-content:center;align-items:center}
.mingdu-flex-wrap{flex-wrap:wrap}
.mingdu-gap-sm{gap:var(--mingdu-space-sm)}
.mingdu-gap{gap:var(--mingdu-space)}
.mingdu-gap-lg{gap:var(--mingdu-space-lg)}


/* === pages.css === */
/* ============================================================
   Mingdu Design — Pages v1.0
   Page-level patterns: form pages, config hub, import/export,
   analysis cards, topology diagram, PDB viewer
   ============================================================ */

/* ---------- Form Page ---------- */
.mingdu-form-page .mingdu-main-content{display:flex;flex-direction:column;background:var(--mingdu-bg-layout)}

/* ---------- Config Hub ---------- */
.mingdu-config-hub{padding:48px 64px;margin:0 auto;max-width:1200px}
.mingdu-config-hub h1{font-size:28px}
.mingdu-hub-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.mingdu-hub-card{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:var(--mingdu-space-lg) var(--mingdu-space);text-align:center;
  border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-xl);
  background:var(--mingdu-bg);cursor:pointer;transition:all var(--mingdu-fast);
}
.mingdu-hub-card:hover{border-color:var(--mingdu-primary);box-shadow:0 4px 12px rgba(76,127,240,0.12)}

/* ---------- Config Layout ---------- */
.mingdu-config-layout{display:flex;flex:1}
.mingdu-config-layout .mingdu-main-content{position:relative}
.mingdu-config-sidebar{width:200px;background:var(--mingdu-bg);border-right:1px solid var(--mingdu-border);flex-shrink:0}
.mingdu-config-sidebar__title{font-size:15px;font-weight:600;padding:var(--mingdu-space) var(--mingdu-space-md)}
.mingdu-config-sidebar__sub{font-size:12px;color:var(--mingdu-text-secondary);padding:0 var(--mingdu-space-md)}
.mingdu-config-nav{display:flex;flex-direction:column;padding:var(--mingdu-space-sm)}
.mingdu-config-nav__item{
  padding:8px var(--mingdu-space-sm);font-size:13px;color:var(--mingdu-text);
  border-radius:var(--mingdu-radius);cursor:pointer;transition:all var(--mingdu-fast);
}
.mingdu-config-nav__item:hover{background:var(--mingdu-fill)}
.mingdu-config-nav__item--active{color:var(--mingdu-primary);background:var(--mingdu-primary-bg)}

/* ---------- Import Steps ---------- */
.mingdu-import-steps{display:flex;gap:8px}
.mingdu-import-step{
  padding:4px 12px;border-radius:var(--mingdu-radius-full);
  background:var(--mingdu-fill);font-size:13px;color:var(--mingdu-text-secondary);
}
.mingdu-import-step--done{background:rgba(16,185,129,0.1);color:#059669}
.mingdu-import-step--active{background:var(--mingdu-primary-bg);color:var(--mingdu-primary);font-weight:500}
.mingdu-import-dropzone{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:var(--mingdu-space-xl);border:2px dashed var(--mingdu-border);
  border-radius:var(--mingdu-radius-lg);text-align:center;cursor:pointer;
  transition:border-color var(--mingdu-fast),background var(--mingdu-fast);
}
.mingdu-import-dropzone:hover{border-color:var(--mingdu-primary);background:var(--mingdu-primary-bg)}

/* ---------- Status Tag ---------- */
.mingdu-status-tag{display:inline-block;height:22px;line-height:22px;padding:0 8px;border-radius:var(--mingdu-radius-xs);font-size:12px;font-weight:500}
.mingdu-status-tag--success{background:rgba(16,185,129,0.1);color:#059669}
.mingdu-status-tag--warning{background:var(--mingdu-warning-bg);color:#B45309}
.mingdu-status-tag--error{background:var(--mingdu-error-bg);color:#DC2626}

/* ---------- Analysis Page ---------- */
.mingdu-analysis-page{display:flex;flex-direction:column}
.mingdu-analysis-cards{display:flex;flex-wrap:wrap;gap:16px}
.mingdu-analysis-card{
  flex:1 1 calc(33.33% - 11px);min-width:280px;background:var(--mingdu-bg);
  border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);padding:16px;
}
.mingdu-analysis-card__header{display:flex;justify-content:space-between;margin-bottom:12px}
.mingdu-analysis-card__title{font-size:14px;font-weight:600}
.mingdu-analysis-card__category{font-size:11px;text-transform:uppercase;color:var(--mingdu-text-secondary)}
.mingdu-analysis-item{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-analysis-item:last-child{border-bottom:none}
.mingdu-analysis-item__badge{padding:1px 6px;border-radius:var(--mingdu-radius-full);font-size:11px;font-weight:500}
.mingdu-analysis-item__badge--pending{background:var(--mingdu-warning-bg);color:#B45309}
.mingdu-analysis-item__badge--done{background:var(--mingdu-success-bg);color:#059669}
.mingdu-analysis-item__badge--value{background:var(--mingdu-primary-bg);color:var(--mingdu-primary)}

/* ---------- Progress Bar (inline) ---------- */
.mingdu-progress-bar-track{width:80px;height:6px;background:var(--mingdu-fill);border-radius:3px;overflow:hidden;flex-shrink:0}
.mingdu-progress-bar-fill{height:100%;background:var(--mingdu-primary);border-radius:3px}

/* ---------- Topology ---------- */
.mingdu-topology-section{padding:var(--mingdu-space)}
.mingdu-topology-diagram{display:flex;align-items:center;justify-content:center;gap:24px}
.mingdu-topo-chain{display:flex;flex-direction:column;align-items:center;gap:4px}
.mingdu-topo-chain__label{font-size:11px;color:var(--mingdu-text-secondary)}
.mingdu-topo-block{width:72px;padding:4px 8px;border-radius:var(--mingdu-radius-sm);font-size:12px;font-weight:600;text-align:center}
.mingdu-topo-block--var{background:#e6f4ff;color:#0958d9}
.mingdu-topo-block--hinge{background:#fffbe6;color:#ad6800}
.mingdu-topo-block--linker{background:#f5f5f5;color:var(--mingdu-text)}
.mingdu-topo-connector{width:2px;height:12px;background:var(--mingdu-border)}
.mingdu-topo-bridge{width:40px;height:2px;border-top:2px dashed var(--mingdu-error)}

/* ---------- Graph Flow ---------- */
.mingdu-graph-canvas{display:flex;align-items:center;justify-content:center;padding:var(--mingdu-space-md);border-radius:var(--mingdu-radius-xl)}
.mingdu-graph-flow{display:flex;align-items:center;gap:16px;padding:40px}
.mingdu-graph-node{min-width:140px;padding:12px 16px;border-radius:var(--mingdu-radius-xl);text-align:center;font-size:13px;font-weight:500}
.mingdu-graph-node--dna{background:#dcfce7;color:#16a34a}
.mingdu-graph-node--flask{background:#e0e7ff;color:#4338ca}
.mingdu-graph-node--ab{background:var(--mingdu-primary-bg);color:var(--mingdu-primary)}
.mingdu-graph-node--current{border:2px solid var(--mingdu-primary);box-shadow:0 0 0 4px var(--mingdu-primary-bg)}
.mingdu-graph-node--result{background:#fef3c7;color:#b45309}
.mingdu-graph-arrow{font-size:28px;color:var(--mingdu-text-tertiary)}

/* ---------- PDB Viewer ---------- */
.mingdu-pdb-viewport{display:flex;gap:16px;padding-bottom:var(--mingdu-space-md)}
.mingdu-pdb-placeholder{
  flex:1;min-height:400px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:var(--mingdu-radius-lg);
  color:rgba(255,255,255,0.3);font-size:24px;font-weight:600;
}
.mingdu-pdb-sidebar{width:220px;background:var(--mingdu-bg);border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);padding:var(--mingdu-space-sm)}

/* ---------- Right Panel / Insights ---------- */
.mingdu-right-panel{width:280px;flex-shrink:0;overflow-y:auto;padding:var(--mingdu-space)}
.mingdu-right-section__title{font-size:14px;font-weight:600;color:var(--mingdu-text-heading);margin-bottom:var(--mingdu-space-sm)}
.mingdu-insight-card{background:var(--mingdu-fill);padding:var(--mingdu-space-sm);border-radius:var(--mingdu-radius-lg);margin-bottom:var(--mingdu-space-sm);font-size:12px}

/* ---------- Sidebar Backdrop ---------- */
.mingdu-sidebar-backdrop{
  position:fixed;inset:0;z-index:200;background:rgba(15,23,42,0.45);
  display:none;
}

/* ---------- Section Card ---------- */
.mingdu-section-card{border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);overflow:hidden}
.mingdu-section-card__head{display:flex;justify-content:space-between;align-items:center;padding:var(--mingdu-space-sm) var(--mingdu-space);background:var(--mingdu-fill-secondary);border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-section-card__title{font-size:var(--mingdu-font-size);font-weight:600}

/* ---------- Options Section ---------- */
.mingdu-options-section{border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);overflow:hidden}
.mingdu-options-header{display:flex;justify-content:space-between;align-items:center;padding:var(--mingdu-space-sm) var(--mingdu-space);background:var(--mingdu-fill-secondary);border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-option-row{display:flex;align-items:center;gap:var(--mingdu-space-sm);padding:var(--mingdu-space-sm) var(--mingdu-space);border-bottom:1px solid var(--mingdu-border-secondary)}
.mingdu-option-row:last-child{border-bottom:none}
.mingdu-option-row--add{border:1px dashed var(--mingdu-border);margin:var(--mingdu-space-sm);border-radius:var(--mingdu-radius)}

/* ---------- Object Create ---------- */
.mingdu-object-create__layout{display:grid;grid-template-columns:80px 1fr;gap:16px}
.mingdu-object-create__icon{width:72px;height:72px;display:flex;align-items:center;justify-content:center;border:1px solid var(--mingdu-border);border-radius:var(--mingdu-radius-lg);background:var(--mingdu-bg);font-size:32px;color:var(--mingdu-text-secondary);position:relative}
.mingdu-object-create__icon-edit{position:absolute;bottom:-6px;right:-6px;width:24px;height:24px;border-radius:50%;background:var(--mingdu-bg);border:1px solid var(--mingdu-border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;color:var(--mingdu-text-secondary)}


/* === responsive.css === */
/* ============================================================
   Mingdu Design — Responsive v1.0
   Breakpoints: 1200 / 992 / 768 / 480
   ============================================================ */

/* ---------- ≥1200px: Desktop ---------- */
/* (default styles — no overrides needed) */

/* ---------- ≤1199px: Tablet Landscape ---------- */
@media (max-width: 1199px){
  .mingdu-header__menu-btn{display:flex}
  .mingdu-primary-sidebar,
  .mingdu-rail-nav{display:none}

  .mingdu-secondary-sidebar,
  .mingdu-sidebar-nav,
  .mingdu-config-sidebar{
    position:fixed;top:var(--mingdu-header-height);left:0;bottom:0;
    width:min(280px,86vw);z-index:210;
    transform:translateX(-105%);transition:transform var(--mingdu-normal) var(--mingdu-ease-out);
    box-shadow:var(--mingdu-shadow-xl);
  }

  .mingdu-app-shell--nav-open .mingdu-secondary-sidebar,
  .mingdu-app-shell--nav-open .mingdu-sidebar-nav,
  .mingdu-app-shell--nav-open .mingdu-config-sidebar{
    transform:translateX(0);
  }

  .mingdu-app-shell--nav-open .mingdu-sidebar-backdrop{display:block}

  .mingdu-detail-split:not(.mingdu-detail-split--stacked){grid-template-columns:1fr}
  .mingdu-detail-split--stacked .mingdu-detail-meta--sidebar{display:none}

  .mingdu-hub-cards{grid-template-columns:repeat(2,1fr)}

  .mingdu-pdb-viewport{flex-direction:column}
  .mingdu-pdb-sidebar{width:100%}

  .mingdu-config-layout{flex-direction:column}
}

/* ---------- ≤991px: Tablet Portrait ---------- */
@media (max-width: 991px){
  .mingdu-header__brand-sub{display:none}
  .mingdu-header__search{max-width:220px}

  .mingdu-form-grid{grid-template-columns:1fr}
  .mingdu-object-create__layout{grid-template-columns:1fr}

  .mingdu-graph-flow{flex-direction:column;padding:var(--mingdu-space-md)}
  .mingdu-config-hub{padding:var(--mingdu-space-md) var(--mingdu-space)}

  .mingdu-modal-overlay{
    align-items:flex-end;padding:var(--mingdu-space);
  }
  .mingdu-modal{
    width:100%;max-width:520px;max-height:calc(100vh - 32px);
    border-radius:var(--mingdu-radius-xl) var(--mingdu-radius-xl) 0 0;
  }

  .mingdu-topology-diagram{flex-direction:column}
}

/* ---------- ≤767px: Mobile ---------- */
@media (max-width: 767px){
  .mingdu-layout-header,
  .mingdu-header{padding:0 var(--mingdu-space-sm);gap:var(--mingdu-space-xs)}
  .mingdu-header__brand{font-size:14px}
  .mingdu-header__brand-sub{display:none}
  .mingdu-header__search{max-width:none;flex:1}
  .mingdu-header__user span{display:none}

  .mingdu-workspace__title{font-size:16px;padding:var(--mingdu-space-sm) var(--mingdu-space-sm) 0}
  .mingdu-workspace-toolbar{padding:var(--mingdu-space-sm)}

  .mingdu-tabs-tab{padding:var(--mingdu-space-sm);font-size:13px;white-space:nowrap;flex-shrink:0}

  .mingdu-hub-cards{grid-template-columns:1fr}

  .mingdu-meta-grid,
  .mingdu-meta-grid--dense{grid-template-columns:1fr}

  .mingdu-detail-meta__head{flex-wrap:wrap}
  .mingdu-detail-meta__head--toolbar .mingdu-detail-meta__edit{margin-left:auto}
  .mingdu-detail-meta__head .mingdu-btn{width:100%}

  .mingdu-filter-bar{flex-direction:column;align-items:stretch}
  .mingdu-filter-search{width:100%}

  .mingdu-page-header{flex-direction:column;align-items:flex-start;height:auto;padding:var(--mingdu-space-sm);gap:var(--mingdu-space-sm)}
  .mingdu-page-header__actions{width:100%;flex-wrap:wrap}

  .mingdu-import-steps{flex-wrap:wrap}

  .table-container .mingdu-table{min-width:720px}
  .mingdu-modal{max-width:100%}
}

/* ---------- ≤479px: Small Mobile ---------- */
@media (max-width: 479px){
  .mingdu-header__icon-btn:first-child{display:none}
  .table-container .mingdu-table{min-width:520px}
  .mingdu-page-header{flex-direction:column;align-items:flex-start}
  .mingdu-page-header__actions{width:100%;flex-wrap:wrap}
}


/* === icons.css === */
/* ============================================================
   Mingdu Design — Icon System v1.0
   MSP iconfont sizing & context rules
   Font definition loaded from assets/icons/iconfont.css
   ============================================================ */



/* Base icon class */
.icon,
.iconfont-MSP{
  display:inline-flex;align-items:center;justify-content:center;
  font-family:"iconfont-MSP" !important;
  font-size:16px;font-style:normal;flex-shrink:0;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
  line-height:1;vertical-align:-0.15em;
}

/* Size utilities */
.icon--xs{font-size:10px}
.icon--sm{font-size:14px}
.icon--md{font-size:18px}
.icon--lg{font-size:22px}
.icon--xl{font-size:28px}
.icon--2xl{font-size:36px}

/* Header context */
.mingdu-header .iconfont-MSP{font-size:18px;color:#fff}
.mingdu-header__search .iconfont-MSP{font-size:15px;color:#fff;opacity:0.92}
.mingdu-header__menu-btn .iconfont-MSP{font-size:20px}

/* Search & filter context */
.mingdu-nav-search .iconfont-MSP,
.mingdu-filter-search .iconfont-MSP{font-size:15px;color:var(--mingdu-text-tertiary)}

/* Rail nav context */
.mingdu-rail-nav__item .iconfont-MSP{font-size:22px}
.mingdu-rail-nav--wide .mingdu-rail-nav__item .iconfont-MSP{font-size:20px}

/* Nav item context */
.mingdu-nav-item .iconfont-MSP{font-size:16px;color:var(--mingdu-text-secondary)}
.mingdu-nav-item--active .iconfont-MSP{color:var(--mingdu-primary)}
.mingdu-nav-group__header .iconfont-MSP{font-size:14px;color:var(--mingdu-text-tertiary)}

/* Button context */
.mingdu-btn .iconfont-MSP{font-size:16px}
.mingdu-btn--icon .iconfont-MSP{margin:0}
.mingdu-btn--sm .iconfont-MSP{font-size:14px}
.mingdu-btn--lg .iconfont-MSP{font-size:18px}

/* Modal context */
.mingdu-modal-close .iconfont-MSP{font-size:18px}
.mingdu-modal-header-icon .iconfont-MSP{font-size:20px;color:var(--mingdu-primary)}

/* Page header context */
.mingdu-page-header__icon .iconfont-MSP{font-size:18px;color:var(--mingdu-primary)}

/* Entity link context */
.mingdu-entity-link .iconfont-MSP{font-size:14px;color:var(--mingdu-primary);margin-right:2px}

/* Detail meta context */
.mingdu-detail-meta__icon .iconfont-MSP,
.mingdu-drawer-object-icon .iconfont-MSP{font-size:24px;color:var(--mingdu-primary)}

/* Alert context */
.mingdu-alert-icon .iconfont-MSP{font-size:16px;color:inherit}

/* Progress/Analysis context */
.mingdu-analysis-item__badge .iconfont-MSP{font-size:14px;margin-right:4px}

/* Tag context */
.mingdu-tag-close .iconfont-MSP{font-size:10px}
.mingdu-select-tag-remove .iconfont-MSP{font-size:10px}
.mingdu-alias-chip__close .iconfont-MSP{font-size:10px}

/* Select arrow */
.mingdu-select-arrow.iconfont-MSP,
.mingdu-select-arrow .iconfont-MSP{font-size:12px;color:var(--mingdu-text-tertiary)}
.mingdu-select--open .mingdu-select-arrow.iconfont-MSP,
.mingdu-select--open .mingdu-select-arrow .iconfont-MSP{color:var(--mingdu-primary)}

/* Custom select options */
.mingdu-select-option-icon .iconfont-MSP{font-size:16px;color:var(--mingdu-text-secondary)}
.mingdu-select-option--selected .mingdu-select-option-icon .iconfont-MSP{color:var(--mingdu-primary)}

/* Empty state */
.mingdu-empty-img .iconfont-MSP{font-size:48px;color:var(--mingdu-text-quaternary);opacity:0.6}

/* Result */
.mingdu-result-icon .iconfont-MSP{font-size:36px}

/* Collapse arrow */
.mingdu-collapse-arrow .iconfont-MSP{font-size:12px}

/* Steps */
.mingdu-step-finish .mingdu-step-icon .iconfont-MSP{color:#fff;font-size:14px}

/* Dropdown/Popover */
.mingdu-dropdown-item .iconfont-MSP,
.mingdu-popover-panel .iconfont-MSP{font-size:16px;color:var(--mingdu-text-secondary)}

/* Tooltip */
.mingdu-tooltip-wrap .iconfont-MSP{font-size:14px}

/* Notification */
.mingdu-notification-header .iconfont-MSP{font-size:18px}

/* Drawer */
.mingdu-drawer-tab .iconfont-MSP{font-size:14px;margin-right:4px}

/* Pagination */
.mingdu-pagination-btn .iconfont-MSP{font-size:12px}


/* === iconfont.aliases.css === */
/* ============================================================
   Mingdu Design — MSP icon semantic aliases
   模板历史类名 → iconfont 官方 font_class；同步时勿覆盖
   ============================================================ */

.MSP-search:before,
.MSP-sousuo:before {
  content: "\e660";
}

.MSP-chevron-down:before,
.MSP-icon_down:before {
  content: "\edb1";
}

.MSP-expand-down:before,
.MSP-icon_down:before {
  content: "\edb1";
}

.MSP-chevron-up:before,
.MSP-icon_up:before {
  content: "\e72a";
}

.MSP-expand-up:before,
.MSP-icon_up:before {
  content: "\e72a";
}

.MSP-chevron-right:before,
.MSP-icon_right:before {
  content: "\e728";
}

.MSP-icon-down:before,
.MSP-icon_down:before {
  content: "\edb1";
}

.MSP-icon-left:before,
.MSP-icon_left:before {
  content: "\edb0";
}

.MSP-compound:before,
.MSP-huahewu1:before {
  content: "\e880";
}

.MSP-antibody:before,
.MSP-a-kangti2:before {
  content: "\e667";
}

.MSP-dna-sequence:before,
.MSP-a-DNAsequence:before {
  content: "\e651";
}

.MSP-aa-sequence:before,
.MSP-a-AAsequence:before {
  content: "\e652";
}

.MSP-plasmid:before,
.MSP-zhili:before {
  content: "\e845";
}

.MSP-cells:before,
.MSP-xibaocells:before {
  content: "\e634";
}

.MSP-oligo:before,
.MSP-Oligo:before {
  content: "\e653";
}

.MSP-edit:before,
.MSP-edit1:before {
  content: "\e7e2";
}

.MSP-delete:before,
.MSP-delete-row:before,
.MSP-deleterow:before,
.MSP-shanchu:before {
  content: "\e816";
}

.MSP-close:before,
.MSP-guanbi:before {
  content: "\e642";
}

.MSP-arrow-go-back:before,
.MSP-arrow-go-back-fill:before {
  content: "\e74d";
}

.MSP-icon-off:before,
.MSP-icon_off:before {
  content: "\e729";
}

.MSP-star:before,
.MSP-gold:before {
  content: "\e7df";
}

.MSP-history:before,
.MSP-reloadtime:before {
  content: "\e789";
}

.MSP-copy:before,
.MSP-filesync:before {
  content: "\e7b6";
}

.MSP-order:before,
.MSP-carryout:before {
  content: "\e7d3";
}

.MSP-protein:before,
.MSP-experiment:before {
  content: "\e7c4";
}

.MSP-icon-down:before,
.MSP-icon_down:before {
  content: "\edb1";
}

.MSP-icon-left:before,
.MSP-icon_left:before {
  content: "\edb0";
}



/* === iconfont.css === */
@font-face {
  font-family: "iconfont-MSP";
  src: url("data:font/woff2;charset=utf-8;base64,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") format("woff2");
}
