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

