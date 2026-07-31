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
