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
  src: url("data:font/woff2;charset=utf-8;base64,d09GMgABAAAAAJmsAAsAAAABhHgAAJlYAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHFQGYACzHAqFkVyEmUcBNgIkA4woC4YWAAQgBYUXB6g7W4pEcQW5uQHq15tVSoim4TedjGMTsHEwY+zYqjrjexwQ9KqW/f//f35SkTHbdKRrJzBB1YNXflUUd+AVhDgiVeqWmMWoT0IfsQvVRDVTucwRoaLXc6ZmXbyqJrFeVJB5BTdFuRPQQFoeD11Z6mdTXLvsc1ejPOVZbMLEv/iFdnlTU7PYgWlfenSJSmYEqGMi2ndM7PhFuLB4w7T/vR3NBsKVsBFeCiZR/xdHHNxk3jiYg/iO9/HWRpCD5lbGy38gW5uozpL2oxwtnvpj+cKvcCBLKMd2lGho6ahnPnnof43ffTO7i6k1s0byRv6hI00sQcmE9k9HQyGK6Bwuaw9dgUeFJq9KSmt+MplJsimby8z+sqcQ/p3CKYxEVabyyW1h7NJWNkql0Pbz7hGTwIA8yUz2JdUngXOg6ABg97pbSfwFEKDZLAEuAkGgzwegm1gdS3vj7Ta+JwAgirG29+aoeSi0AKWZTScR+xIyw/Nz67G/IjZW5IgFMXpsY4zcX7HRAzYiR40SSSmDISjDBEUEUUHBAAyMRAXr9BRPtO9O7FMsxKjzzsHzcWqGxSIa0HRbqRVvgXte4IIWbBLu/14maPnn+4u9f88HaRZszVJqPJXFoPGM2oHt9o4ESLC2HdIgESshdloR35tgBgPAswm6ODDPkOMV0tMdmchJBz0i+O+t6VeV1J28VyVwZgHgBgxSyxDotsMOe7gXpDlKe/SPFxhvQKfPyCEz04RaPt87tTTx4chJuneC4GLCLQcKgV3OcmBGChQMSbx7OWL/WL/S172nGRkCbdcgy2nScsBQhIDg3VA69S7dd8m+4dG+PFb3/venhcQQCJBtFHBMHCW+DukLX4eZbIYEWWO/CwKMMbcQKyreoVPipY4HYH/vn9vatlTmEJcWouQE8Q361j6kgXkugU7QW4LdMLHOATwx1rUOPsABjgDiif3a/iulIyYnOmp4hXklMrm2ERI3fRPN1GZSIiFDQIy5X+gradfNhU4liSX8aAUQYMxtF+8BUS2FlMl1SGjglz99fxgfBCuv4AhYjDGu0e0tyVdeKTUEVlPrf4tLS7a1w/UZeJ7fzr3gHtASI3GskB6JGtuZ/9JZXSWCQ3fPjHsiM5ne6EnhnvN993KrH6rQryBRVSiUZIFKgKEksCkBNhLQLQrhUQAPCPCjcUf3pOB2TwpVAsYS2G4JnCeBJ0XPxhSue/Xe5rhvT3M67jXE822PczjucY/L//9zz1LZVm7P7jryyQOTBBPAIeDx/3+utERqT4TZQlRVzwhXFKZOdH7evDnJ3bsp8NtfopRhkSSpdZEl4YBAVZmu8LWyqsrX/2/508I3hiI8xgytOQtDqUX2vrz59c5eduklRcicuG5zfJyJMXE+QW0cgZShGAftj2kJcAglHfB4Jr/XsV1bMzPzTVVFRFT0cPr2I3P2viCOYu+kAUNECBHCsCw3qDjB+ce8bfpY3fDQCBYx5HWHy/aV+bH5/8dl6SoMVGxMQHK77/9D5qpHH683WRcROwKSQBIIqZOyvu3pfRbb33G7y7EIaRESEiISffy/90fDeFs9cv7wqw8/Tq6NgNaTGy7K1248e7aR6OHk6i7rGns2YzVD7zG71u4I4moccPv6oW9vtr9K6FM+JeGc1MrywKhG7+7nuls35AP3ekksHoAekICNzpqGunZrXzl5k40XN772z1WHChuuuJMB8aK9mPziQuRFUSyOluiK7jgd51+6IyeSaDLIpYlWVrKWLnrpZ/bld37zz5gZNzNhZr40nXXTQx95CgwyzBhTTTfHQnX22OsWj/hm5v3MR/83E17Na5iNazPcdfXJfdtw4G/wPF70L6baV2tr2+2s2vDSi2mmjTV00M0Whviw1P+V4+0nzSyUIaveW1/59SEqVD5kpnkucSMVyuzMBx7T3/TVgsa5WVW1/+8zimKEJ8qVS/DG6qHar+wfr/106TFOcR8P8Qofxc+jDouwXOqtwy6ctg+NsKKKqVeWWGr9vOpa9ZCdba6/wfrh9rQvJN8vxIN4G3Pp+TMdgvXsPv7XfaPULVvnh78n1tML560nkIh+thKFUqaSUip3kp3fFYHwxk6ldqLExip4qjNLvX3zzY8vnz68mwfgwtKflbWNt+Vvn5kaGZsYGOrraWnraDTLlWqtfv9w93xbAlfXXTuH21u/gAuwrTXXrXuPnv6J+/C5tX5br9ZCFl7TDBhIlyRZilRpjdtmYxmxbfGS85Z21n/+dOmLM2XIlCVbjlx58s1bsLhMcSvD/gcXK6byr8qrWn3BmrXr1m+Yk9e1bVMlc+d1vLBFtNKLAqvzlVtPvrg25RKVMzb2S1Vly3bfBV1y2sW3iW18G9Mu+RMMLNlxb9eefQcO22jO1eLEafso7c5duHS1lAPp9AZjjDXO+DaeNJmpiZpJbTRlKrwppoIQjKAYDk8gksgUKo3OYLL8OXG4vHa0VuDHXSSWSGVyhVKl1mh1eoPRZLZYbXYiYhJSPx0RNnOW7QtryCmEJzmJ3HSp/aJEixFLKW6zeAlU1BIlSZYiVZr0RTJkyqKRLWeLXHnyaRUoVKRYiXlKzVemXEX+bn84ns6X6+1eVFxSWjasvGL4iJGjRo8ZWzlu/IQqu/032/+XXQ7EIL9MgNnKj7gHKBzEeUCF2AqoElsANfirEysBDbihCXe0iEloE4kO0aELD/ShwQCeGEKLEWQYwwsT6DCFAjPoMYczFnDFEi5YQY01bLGBBNvTrgNK7M9XA1DhCClOIM5XawFyXOGE2+m1c+0Ozr4TROD5vHQBdng9unHjdedsegDiExJ8wQbfsMIPMRvwC3v8wRL/TLO+SfSeYuCHxPFFEvgkSXyQFN5JGnOSoYCSxYLksCR5/JECVqSINSlhQ8p4I5WjKpiRGqakjhFpYEyamJAWBqSNIemgT7rokR5apI82GaBDhmjICE0ZoywTVGSKqsxQkznqssC9LPEgK9zJGs+ywa1sUQKyw5XscS1HdMkZO3LBoVyxLTfYkjv8kgeKg7xT+PKBR/mkCOSLIpRvikh+KGL5xX/+cCT/OJdmdwg+URh+UTj+UAT+USTGFI0yxcAvioVvFA+vKAFtSoQXlAMDlIsO5cEg5cMQFcAwFcEIFcMolSBCpZhQGXyhCnSpEmGqQpNqcU51uKAGXFIjBtQEd6gZV9SCDWqFMWrHGXWgR50wTl0wQT0wSb0wRX0wTf0wQ8MwSyMwh0ZhHo3BAhqHRTSBa5qEJTSFEk0Pi2aA/2gWNzSHW5rHHS3gnhbxQEt4pGU80QqeaRUvtIZXWscbbWCPNrGiLYxoG1XaQYxCsIx2sU97OKB9tOgA73SIAh0hSMewgk7wQacIoHOwis7jkC7AGroI6+gScnQZn3QFR3QVebqGL7oOG+gGNukmvukW1ug2anQHNtFd2EL3YBvdx5we4JgeYkiPsKAz1OkxkvQEcXqKKD1DiJ7jB72AP+gl0vQKftBr2EFv4B69hV30DvbQR9hHn+AAfYZD9AUV+gpH6BuW9B2O0Q84Qb/gFP1Bg/7iUakWwING8CgCnkTBs2h4EQNJEAsp0HhIMmUQjkF4BpkziAAUQCLRSCKCZGIoZVhkAZRASwjQCsqgNeG1IUbaEmPtoALaQxV0gJqOUCcN6mVAg0xo1AmadIZmWdCiG7TqAW16Q7s+0KEvdMqBLrnQLQ965EOv/tCnAPoNggFD4NfQMUJCBsHAsCIYUUxYJWPMpAySAd+GwbgKmDAcJo2AKSNh2iiYMRpmjYE5lTBvHCwYD4smwJIqWFYNKybCqkmwZjKsmwIbpsKm6bBlJmybBTtqYNds2DMH9s2DA/PhUC38WwBHFsKxS4htG4kddfDlxoWkbojWHjixF07dAmceIR5wBs59BRe+JpJviCechR/fw6Uf4MqPcO0vuJEPWWBNVliXDe+zw4YcsCknbMkF23LDjjywKy/syQf78sOBgnCoEBwpjDdF4FhROFEMThWHMyXgXEm4UAofSsOlMnClLFwrBzfKw60KcKfi8FgJeFAZHlWBJ1XhWTV4UQNe1YQ3teBdAIYDMRKE0WCMhWA8FBNhmAzHVASmIzEThdlozMVgPhYLcViMx1IClhOxkoTVZKylYD0VG2nYTMdWBrYzsdMUu82w1xz7LXDQEoffFHzCT/vh72oE7n53D/+05/GRDiT9PT6BbzAMTkOvgx8fzptWt+k+jJAEnWa+6TeigaxlqfEFU8mUAilA4nTLCq3gIS2gyws+rFCJTJAfqUuNBl1iHpVArt5CwSyN9Ma65f0HzRoo1XV+oOLU/BcEYQC+HbD1kTB2g+2Y0jzJGR3aXA1RnIjrh6GU2lhO1ojizQloITwmHZdL29tJ6bV3OycUZ5cl2yCZk4EVIHOnzY6FLK7fy/HnDrYxQmUwgz/fXjYOXWfaj05IpqjTE3Vb2GRK8hUg3uWHFrk77Yiks1PUOlMJxcoqyDT03cmPdIlnjOLgDALrzkkGl992ANRyMp2rk59scO3qc8yN44qXhQZJQJfnmDy6B2CTf5rgUurc9YFsEwYbxnLbvwIJxWsD6NiFYBsADAQyofjn/dfDNGXyGE8BMEgJpXjoKUqQabgU2csk8ixR2wcG7HDCzowjyTAoIiSnODnihwcqtFTlgEx4fa1VMv3Pd9+jPuOibwFwV5mpL4JcicewiIVwfbCCG7uPmqb5P/2hPj8pn3qzTPWA43I461c6otntLbHZECSQwUh0zo02nS9GXctZIsln6Yt0YJD9WSYX35J296l1Sv0JxkOCq2qKEHwMtQ2LzDWTzvGkmcn2VAoLtyVQzTNpR+KR4QRDiWv5yj7m1Kz2uXDCZquU1rZlS5xtSngHPpdKQeL+BwEeXzKDt//GyHSkUi9i4sdtzK1MmnU2mtdEMwuw4GFp+CWRj9hMYibN7MyeXL5eJoPrve7TNxLwckSCwARFdnsul1Udn0v/oo1K9IS2xCoO1/HjTqTFQl2lHeBzzHdTo8HBTKB/mVWceJpZM6i3jmaAStiuKU0uok1r8Z2Ynow3mDXKNLTFYjl2MbCgf3gcBfVi82vwmWpf73cdHM7gepqbuccCgDevgYwMrQrrZi6JIejCT23bPNsHERAyNgn8V+HgwRSeNd5KKPC3rm2MOyEy+R7eCEGGS6uNl1K0advMJYyqpQty9xHzYMdL4u+3QUluxUvYToLbs+7z1KKV7gYgn0LoeIqMm0IHYse0iueACLCvaNZKEyQSuxAW3tdR/HPwCjLmR2YoS3K7E0wFljELLriKGV1PSrfA1MyGiCaM+tRvRrNMeFY5a33BebAIImWZQ7XrVFd6owl93zbMqG7lAbHn1dKykMnFy1FUyFRgGcPIBFSW2014ZMfjoHtVEfKuwQ3o9LYjuiL1o0AWPvIkNC1ZkoFsgtkzzh0fn54R5qWNChG+HNMIodewHbeSA7UT5+YFUDq/BmRwh24UlQCYBiN0kaKKTiFrHmUYgQpB6TNE0H1/juJ8JU2O3MxZVxb3y8P5xeNe1Ws1W1Y6+RFH2QP77IboW7DeUWXO0JWbsV60J2tbDW0diPWEKvvLan7WADSTuSvcMs9nAGYDoE/7WIuD3C5CJl0dnl3lkivKkEmnAEBwwr1XJb+RaxES69gUf90HaVGVYxLAbWQeRQ4lECTVmQm3NLIGMHqS9ia2TllsunRdoSx0JPCjwHHZZha6PE+Qj5KJkzE7cC/CSN4LMdvQ98RJTXco+yxo3ScguXriG72RB5vx4qhfLQ+dp4Vum56r3lkVcCj5ekBqVKvR52FtN8FEs9VjktLboGqShAaU/YYfl6tGKlsQw030I9vDmGh9n0me1+7pky+fAkRoFPnBhOfUqy4nkndHbatfd7thiKokoOtARELniMYjhgFlolog5Jt1AQop6xSDpBkjqpRDC6epDu5InW8mhBsiEwnmAt/6y3eM1g2BNQdeup+d1HV6COaOFXlB/PUgMfgRg7Ly4eTuRBGh98bP+l8s0Iwe/k9V2/JSKRCEllVkKxwpR+VU6fD94MU8r8eVkwzhm19T7L1DjCCEMh2/7mqQrFIA4A5UXi0shbBt/eK1+27/V0usLVO1IEdT8SXvlLBgCoPOiudjIivIM0OjlbxLpSv+VQs211mkcpqgcuStG1S4+YXd7eWrvTpS27o3OV2jU60838kq2ZmFyBA4KOn3qMb2hOn+Eaf8ciXIgQg0uyWygttRKphLCYDaM9K28mxapZgJxERODlBmAGir6FMZESZZFsTJhnUq6yoCiCV1IfmQ24HFKSH315SM/ByamOJA9eGnCng5PkjEsAHwqQHp57Ya6x5wCnXUskKxjtPgxaxH06sWVkpFSIlQSyWkXJbk1cDbklca1JGRwXoHDWGcoNLx2zViXNny0znHBJX8Dq/V1Ox1X/moLxrdvmGr50ZrZA2jeq62Jbj+bFJyjoWkXlQtJ3vZVa2b7WR71kS6PmSZsIt0OokU0KDacQvSZhuhtQ6pMRAtMpQgVQ8k+Q0IYKqYFl773UjVVuyhHAtPGBQ11zrwMcIn2HqlYUNh0U2mEWlmJbRM6/2g1Ik6rCCtpJ5r/vFXAO3VaFDyKcrjFzVyzJakSTFI+QlyFKaX2GIR1wHhlvpfZFutMP55bDMrDX8E2mddD5trmwJxMRcb1krYlkpzajka0wkJDRczMAf2XAhobYdcYNLx45Dq1hH/6MXy+cPeoXMC742oBQZtyqDakfHjbxjIIIMgZAuEL/Kdjp7dC4UWXiNjGbMaVKdQO4r5ch9nuNRrCeu6O/zcDj6Fyps2BGkV+qL6wP7QZa3B5DX0v7PyoOSNG8vfSzT33nICq5Nmz0L9933PMnZEr6hKkF68eZkMNSkXty1vXTkyvLK/nnTpHBqEsq6k7Fpo1WN0kBC+7TlsIkaNi1DV1S7ek3Xdltsndbmn1jQZRIZPSUP6lq/6V0qXBNFM4JQNjFOVwE8bu3IouqtpXN50RJFpS8yFVdsSjaABx9x8zgEYtpikEx0I+UXDOENZgMHLkqnNy3PRIXDh77Bv+V+G4lCYLJnaA96grSSkuKQsRIdVnGKkM8/WCX7DCrZE5YHXqw9R6mi+9G68bj7XfoctfK+Mo5KlTiIzNoVtkHddYhMX0dvVm9R1yValnmXJI+1vpPHcQhJWExGL8wHss4vO5bWZSEFZmI/M/TFXbjaUe+EvZzq3YRalwlsJSRYNyp4TtO6AmnWDiTzFiONnKh6VTxbt4Vkpct3rKHh1aNMlL9mvInxHy6y0jpRXci0YbRVIoFyeq2se9le0OLWLW/ycHvAkvGEGRBa/uxvQ+l/gdF+qlt8vh14wr1x/YHe+B/FenWNXve/OAz31l3oxCz7wwttbyWOG0+CHD1iwV2UiP8UE7QVmVgD/6O58DGPTnDMR9QlywwZlkqoDTwgfxqU8bjI2A6xRDYZZ6DdFKRmQ6qYDDxvxawbkmUJoiOokxAgOK4MNFXvuBTCXg5M+CN2lBkgfGuSOpEqOTleIPMm1TlU8wR47fz95ZSgy60cwkDTomOmooXMeR5Bqq6p6wKD5FKwdBldU9iwhUUpG2yTnc5/M2W7Co0WwWdRAgk1JcXiekeypNYHR7dATIZWaKVHRLyJfZFHdVUQ59EJrm02Ch4Emoj27tmGgXJGrIaQnJa44MD+inmPkeY8CMJ1nrzBr7QxE7ICKEW94iGJv1E+2cBRGz9mkosimG64cu4DtsmQeZ4NPgz6+RLbIciI7DMOyyhYf8BotROwJpI0v32DBgN9Mg2p7ZGCXER50EEmx4E1ll9KM2SjOexPvstRfBDDthaiLV+/R7Pmf/QiaGGFHDhbUCmR2vkle86we25ljRzRrIG6VTVcNNZQdMvKx4EUnI+JmWxJNMWoNRp6KqroZUT1w5WJ0yUwXjnn/uMHhUJmD8uphEh7IEF32WP7332t+Tl6UwXw94YmPEz7THd9yebYbN+zAoUTnIKSfcqtV7DNepF8RZjcpFIL/Kc4YtXZ4sRdLh5MCy9GO7CxcyjGp4Fi7R09+djiRLZQqDASFVEWg0eSSmzhCLpvsm+ih5cUItS4ArGYaE5ILr2KGIorVQRGllyEWVNjII46QcSRIkyCRSLEifAo/iByQ3DkW6DZYoJlp2MSmCj99nKQFghBLe7yCVvH/tLo6zLpVJpZSNJ3BqCz2dcgw9l9CRBgRWEGdntsM3FlRcrZm7GWRQG+Je0jQKzbQ4ICAv5R/o/lpofVcCPY6JFU3iIq0wacovA9Rk3AIKP7ta0CDYwVZkhwU6l45kObwbdJ71XAwhvb84yWYf77xQjouzQ7d6S6qk6bFg7pe4d4UajtKPedS0+pBs2MHAviaMwRF98LXeCzxK5D/WzVL3kThSOVEqrF0yJHxBM0/Wf47X38NVgwMK4oUXdARzMMl4fD60rQMJzzkzJMrPi2jriF2euGIEgXd2+qUHWlr10E0XhYowCgo7bAJ0nWWeYIuN2UoxyGHk4jQl3Cd+EAuCiz0Dl5U9l3q+rru2DRbSEr7PIW7IZY36ynbXUQml5+m3jvsNs38U4jtdtKNiUT9PXS+J9WYuWYzxx1ulNo67Eazp6UO+kPXlsuknnqpe1BQYOe8+jPvi5ABcqwhReAyG+G5bbSEHQRTfCGe3eYPM3H6iq2VJWrQ+R1rLt/O4dEyutMQCx9Og7QfL6p5mK04SUPcH/GceoYYyav2oG3182kqtE5QQFioqPJWl4HKFGIysLZUiklsA/kYBJaGO+VBC03Bp/TKsVyYSp5V6jRrozAQV7cBYIpOs3iMKXZlCMsQf0h5lVqsRgYNZg/XNU/sCBeWMF8po7xxyDt8HpfK8ApckvrotizEMRlhXmniso/8tmqIhMR0S1QH0FL4Ql4xIjDewWwbi0/QIwDOplBDl5J6SDx4XmQrKEDYAjBnx4OoI8Mn4X6bqQmIbUJuKF28nSQElpeFkCEQKB3w1dSJFms0ehHNL3XoSBnvBwqV1kcYbzuTY73GfZRjUSDfkftOxT71sldz3YBlzMUYuWsLEBnNbKPz/uhBDJVEWoIFOh/apwJQF/bsHEWqGI8HUvYofXJmkc5JWOvk3DpkRnGFFGnCbLqhmb51d/VqqjShkqJ1kzDy4TEQd90pS0qbgWHZ0DCqJ8e67h0LjMol6DVsUc3lnRrmXSyz42sMw6nCKgyRfeKvVzCU9pA1xLqPDBdnZxLNho/Us8jhvIqqDZlQpVDqL5dw2T7qH7mAcnHAz7BorQH+tsNeJcZEF2I6IrDunSnEeycD870KAcDNl14at0oUV4vkEQOZLZPM5RXtkwdx933beTfqunepoD3vo75fcUhEoAgU5o2BVk0vCqYKLpn857fLML0hv3Hs8n3i2V4pxYJ9n90qgfjSHv0FLyWZwrt3Q6eRWylwkGGuvW62vFhNot0pilvSdX5MhfS8lQilVlkPI8p3P5J3N1/PD3VC2d0zrL/BlYdkGHwaKpPXDJtrMTofIdOiZ+Ad/zJhpVZA5qBHzY7iyFPdk1RzYxxoy3f6kJlLlWluB1G2oEGLqj9coUn4fIRmkOZU00BRSAOi9pioskAtIXft3BAfi1hbXbZEBYA9klhf+itHms9NNORHfTRPMzISJjbg+aNiq1kGE6/cMUvWt21Z2uiW25RVXtsF8K3PWjPEaxUPkKf8Gvhm1DKRhr+UtENCAm5Lez17eLuKf1HZkyhltCsgcgI8pMO85h+1KASvNgGvF17y2jXa+PlqOwwgClgCLp0PqDdrqD7H3UjKtuM+jGjYklbdH1JWcFG1o7b8Zvni1ZZ1kOlyuLPPn6wEnbKha4klTsYJU3RYpPSHnAIo5xK8nI7fnG5yztiO1zv/mVQDcL+oNKfsqm2pet0TXjRM8dfL+Ba/SgL4JZOBXxmX/CDPCsuvebYjFGW/ZvASQXetlUbvEIZbptbJHNfwpxOGGyt+/sN1mMrEQqpJ4q8YEK+M/SwtyURw2R6u1X4uU4FpLa4Rb6VU8avbLfjgjF/IUsU7twbZFrURUBOQa/gu9lg4bgkKikMFhNYuXUjqYi0wWtxosO3QqBbapAb1HBaLp1NEfeR3WShAmFGLQ1dIoncQsgHcUGdHAzBowwygfNyBOUzaEAGrJdGXBb7Z5gUgn/SV/Kh9Ljo31XZJ7TNaCT7UrNm7rDZn9vwh2aMbae4oxmidx6kLb0maTTYq3j9hqWzX1BYLmVrpoxjhrAbSSAE2kHBy6zyGXwdfkyq86G0xTN7J51MuMKknaPrrwl95fyh1DnQhuWu4U0YDeFiKsBwH8zHXse/KDkxDFPIhnL6p2vDPlbd9c/9vAVX/bvwNl4S3P64xP+JirnsdpKHyONzIbG5BlUkQWUhvsYyfNR1s+xs2NxzweDWKDD0AjLs0z0ah8shsuSJ0LptrdmUd8hOre2FpCBs/ujzQOte0uvEQcei2a35JS2dt+U098FsaZGDFoXoTtXQOSVnVGhVSyRYhUd5Lq5G2YHTTN6Meyqw5lQqrVjOZIi/thdgWKN9WyMiqIoza1ozRVfKppIXY9Yxd5GXm0ISEKd9Sdw2zpi0ZjCvZWcOsPpTRu1Ys8jK9QKItGFRVsW5iWUY+NKKhE2SprhEtZoVfkuAGhgVLMS6SOjDxIqS3FRNrIyZO85jYqZkIDXhR6oLWJMwsjjDZQ7OTZlycF5fM2iKVyaxLcnJtkLf8xxS6nnHGBLSUeKlkZRppwDW/S08cVjmMhXXM5osGaWst3CSppDRID7EBLqTxM5LhxeTxh3GLopplVtP9poRRofpdt+dzUa4UE8U88aJB2lYLZs2I7sR8v4PPnqpLyyAvVjLeqFYir7B8USdI0O1D+d8932axGKz8lVDxzGzjnDZOMVRVuvW7XvxmRcFEUp+nf8YnX+673dSP6NiznRvCGxSt8/MUpEZDyArWdfjV9ZnCNi6bY4QnYq5dM9h1t//x2TM0bQwU7cz13/RKKl8YBgunzUrb6k6NCc9Lc8NCb75/9OrF8vnLf1iMYb1ErinCev41i/OiprZVrZ7q6/e1kmppTOX8yLiTGQ6UhFzQXY39H0tZdnhFYRzRYRFSI0K2y9B8odWfCZesihxKtE+uJ8upBXNp0AqzZf8gW+RPBIk0WkvXn5A8QXKxEjJbRlt5uwzbclgwVEQfQ0IaNTzEMSPGlgIwBUF03xegtl0bvTpeSE7CoSPokkmrD6fts+e9YFQ3b3a+we88SCpr/wbo+6xuM3xnhrhZYKkGPW6nNEFh0TYF2Ccxc6CeLsXAEr9a/uI49+mLs5pg5dAr9vrz05VodbeO/clzmMU6nwyFi3fB0loSSqytBqrLi/V4ba8eXvwkZ0PXlAi78sA/kK9DFHM+NOiC+0m98rHQoL5Xhq0uJSBIqolCsLl8VcXDzCRCjkWyMRE5m6GjvPEftoBSomkj2OtLII6+oo0h+Y7s7gtlF1o7Y++ChymEwuRQFY+ug1orDKpCiCahTCkeNjQaJAkgYry0xP+qFtJTgA9Ec0DSb+Bx+bOqINFks0sx4ROmqlp7qt02JQu9mVWzjKagEu2FxGPpGVXAB+7pEa9FrnutXQ555LgNsg2Li02fW3mIavjPCqZHn4kiH98+gwXP6Fw/T/37Pml8yekK2jz3ybfY8vWMDaNdeKOHO/709TP1brbNnRaGy8evgyR+vvKO3OZ5c/yFgOI01cmE31UjjvqCiXUXkrfP7RrEiVsX9w7J0pqfMMOmPDacpHDqzvndAyh+88KeYUlOAjozUiCL4/QHvYAF63fuyv7yRzORY0MRb0yHQjSX3wIH5qAaGr7u6+JRSR5DEwaWLGaD3AnnJiI92PT3Q/ILPYdGZlj12MYVahMk+D9xSZcEEfTygryabbSnNcWykQvrZFJPMwmtgfLpbfY1DmAP0OeHkavO8x1Xs4kb69K5FFNKW5g3oRYABqouk43LIF1lAlXWHL3taoR00K9wsRbTk5hkNk02R5KMVn9Hy+8OCAdD3NOHtpoM5adIPOgwYZquyEauXSfL/p0GF6PwDgh+FV2deT6xBEBjWhk2usWCyOrh8dZ0Re8AxbrVJphsSHbRrq6yy+6ZtaBf2YUI2LerQXkG2ub04FhgtuHV+Ox7X0Qmxkd/QNK/DKzfqAT5fX/uSV4vMdjh5OXhdwxKTqYf5vdRnR5KLA006UQWc628kyokG8WRyqXbhNEyfKKO04nLKBGsZJyQjGsyS4sMDASEhMRSSwMRM91tspL6F8kFA6HwgAzG6/WVP9VsrH4znQnfaQZLPYGbb4Pl0BGw3hvcbAKrp0Nbc/251adsfSScfJFDTUgWxnvyAvygbGibtUy91sagqc2And7+WPknVoTwF5g4w/qR7Prvcc49v4+k9s5LvnAkNtu+mOSaDZcdpB5k8BE2bADZvRLBmhHyRlj7DqTfGhXdcqqzL3C+imQAwn4w1FHPtJgG89dKv0vnZt+v5BEjlszqf3q729sHm7HXJjv6btuN+EN96fJp/jVe9x7xvPNsTwcmOWnDjV4VkrjvVXmz1/mLk+ZIugU0rqhDLDy51yDiNMW+CKBNj6J7zM5HMJaYVgP8kBgddpVY3vaYnLZSOEjyQER7NBB6TeQnkBmTK+hHOuchQSg4J27N6HZ5Y5GX1NZ/tN0swzxQZDh1r7PlXqBD79j5I84AY2pMdVfEdZAmqRrsDsv9Pa7WX0T+SYbBFPLWSOQ01cnVgaIDSnTI6freBaWxYCLiUO+fbpsNDfjRtL/5GjVYrrjB+WumyZekwSxQox4J9rgx9PG9fySJWgsNsJOEGy3bH7s6FoNTCtADQ0Aa0GjzgNnq1H/mPFhb24y4VFKY9j5N1WAXxSTDjYqX7pXIhZ+F/w/hn5tUwbaUQi2xGpwal7ItgfTt3hG4aElhhIlO1sOUy9IYigi+8i+awnCRnfT/kmsXljjNlnS9ET1/3shRB6VutmiuInrUAf183tixs05sHJsxQYu5FxSCCadB3Ui1ZLp2FXJL6x1By1UlmYk2pbMFH/np5Su3Fj5NoS37BFJV4E7KPqaMy2qihUj6Ly2Fbe1s7J7emdELqrkFuMLV2H6JpeBf6Nt1KsEwBVbrUGgcK8l5LymNnzKO6KTCk6IxeWge1fhOEiP2JNKhg6yQ3QKiZ4wT6oAtTdYtL3lPoBXkXLfszRR+OjBNhfKfhVq/KMoMwUyb8SqGDVHkCW810/UZ+Uf4tBDHjVsdyJcMbO9/fCsxuAEw7aVM4dLFhBbarcuwXFJcsRI9TqpjX7XVA7zU/TaBCI2iXVClWDKDsxNW8lYJ2DHQOWS1hPOeNYTpxkM3exy4DImr50oPvrJea92k8RfHSILtTXvXqYK5U2ZvAZIx9A+SsthJwEhCfzLFAVM68evkP6PH7blHS9j/QObpkjXwKAmNdi9j8F+kQfJ8+5PKoLM0W132iTci7oo67wRRgWIgOyfvCWKvroiAUJkgaSR8psJn4MCF7U4uAmFlKqMLyUJVW16tehXvHmRi1+s1tjD+hvz2LeJbwAiGV+5ijf0VvhNuXfZKZJ42Xb2VB7ol/pitehIQSPdhPGKKCVlJkMA5HFeRSH7kpNZWvqxPAfWb+AxhqbDYAcwuyeoGhU6cr3kFyHfLhS5QR5rM4E/8lK/Zincc399yxxc+ES/DjLBjccZba5w6zlRpGW01jCg/VWdJle5XIlGBZlsB2Kl1P2NEg+nwtNxCdvO6FgzEBMWZWxePZnNQo5xaOXIB7bAMsT0zhoQoOjtPVZs7A5gvgkk8KBGdLjVpJHsUlg0od0emyy+c+2YqW6vWOHnA40oCgGg5BOIzhIerMZbjpTs92O8L9CbRE3Rwdo6yZ2SQ5Pp+qrGdkqXSLwa5dt18yq6ZOQM1rxzA8tDUH2Cm70gKbPVk9CgOwt4hzIcY8efaCcymH+QJPYYweCScupkLxrGcQcrglRUl4EmyNbTvDb3+pF/9JloRdIoXf2UWOc8nJUNh8ibrjYB8+QI8skZTLrJx7CjBOuOtwF+0lYn4/bS6Zz/fHJ3c4B3QFVlRLsAHM+1hMRRsGNQB+QSLqtnKgPgREVf7q8JtoewalB+CSGjQNwEEQuSZcDmcm2ysbwihoBwO4HCU2SLs5ysCA4SVWK0RimNE8Tv7oJWmu6atlVqddvIVbbFfNlnGUJjyln8R8zIWlvmEq57gV7XU6vv7a73547ZB8zM74KiVN3iYeNEjig1B9JQOW8br1njzbImvNLhU7bLkdYiSpbTAE2pTc/nY5CAaMh8aWUI/wn525RiF2MiCoNhO2dzNu8ifbBfmPAJUji7MJTbf4fHbR7s+xCzyt+IFxAf8EENMhbNjmCztKtYuQ8kjM2fHC6fpMkmH+a9Wl7l5QEfKrTt36qDgNUPhrRgLXLSCq2tLYeg370TqM9ooKlvrM9CdiC2YLLXqnPm4d3v2pxxGMwzSrubi9VCknpe+2jC6YdKC7x+LLLZaWPJRakAZ7/iXlLfiEW5xpsgGUX41yB/csMN4+oSjW6M1SJ6835MnmCv8EGXa73iUtieARvxcxQNpDibVwgFLhvejUzqJj0o/vS8bKSaoNc6HZgkqfyVRyqDr4FIn6GmrRNOE25GEtCJ88T2kxynvTPEkw+XSl5iQpzojGsaWFx33zHFx/y9AUllqasKLB6WOjZ4edLNP6rt9ugutHZbfXn7nHWn9CO7e7u+X7/Ti3lunOuUrh1DISzuiiuqv1G3+pg6jd56P8I5PxFn9TkRDFsa3Wflce6OJU47sgc4uemio0pcLHCIosYVT71eUeiC2dtY6kG2DJzQnWwIimUh4JpJs8EVIEIXPtJIEnYYTWXwnpIRC7zHRjoR++IO2WXNDiCbhxFJ9vfu4QjJ4vGBrppf5vddS8DKSDTgIR1SZ/gvTEfuEc3RW6vdsB2yGqb54UEhao1z1VYITeS4bBZ6yxikHCt1vPO7ssBhRt6uT1qlg0IFBky/GlC+pTgCgfgviLGPNYySmCJSuEMRwWCmJaiBgJPwFFZ+6WEQDtQxBrGA78RRYObiahPQnLDZ8fwRLJJLgRxpUpSd7VCn5g0sFFkpZLHo1sQBBBJObUDZlYu3PVmK6WMVVqSJXCPyCR8aJDouzHRQRBM+j4A4TTZ+CLFgsyKCaBqGIw718TLLLbrmKvoC8vapaqfjVVw4pDoNQlZ0z4QFHPC+Aozmp4cr0lWA55crEK8Hlzd/sz0y9l9vkhL2yo9e8mNI0GU9BuMdbCQPHU19BSI3JQvjmkmJ46D90Q6tW/UrckJoTlGzSTtPJyBhXmZ0PnPv0PK4dmsmoenLRA5tLV6zfkVQtmG0hRfy7E+8qaBgQ/Acy8bK3ftwAWPgnWlZE7cREx1r4H9snXOU9KpG/hM/tRD9SrecHykdWl6cTu0LzjwpyheHU5SvjWfVccEhXpcdqsWtjGe3s84Wm6e3SqWCXHEtQ9c5gRtOtmhHLn2b9LokHYH5vUGYaMBpgGOqJsI1tyfWbWcDgH0Or+ZTn00h+Jkp3jbwQ5RSeoM6bDrz/tTRn2qQatK6olp0/taiADrzEyVbCxetJps1zjUbS0l4lqhn1tYYfm4SAv/mm6yO8PLFt78Iy9Nx+oMeXLe+0nA2a1CLMElsdXomIxhA+N3lH9Hz7hC37rE57YZa/T3Ig5cTyp5joL6btL7thDL8CHEPIiZAtuEIFLDCQ6ECxj+4TqNIlBCMXBZEI1rAvbhI9MvJEymR6kb6UAHiSp1WIjxVwy/N6Wp9gg6rSdRJxFcuJDU5xilMwZj+SbTlC1gbTeYhXTgyIAWFmxGsOBXMrGbFJSxPaJ1aYcGUU6NfPAwg/T56wxQkWbW6ya3gKVGsyrIWRpt/ooHu7pFdv20iiK/2zdGzO1OYwkXy+olyFDYCTK0orE91cvG+rMExC+lJ4mk8IlZdEYgiyzLYuy2suOJnot82D99wYDJhpu9F/DIG/WQ/Evrputb0waueKaNhc5h+2gEQBThl1AgF8Xu6uZY7OePH5HbBPkAQInuqyNHGQuGDagQIYTgZ1SNaNu6zcbAbURsn8jh418oOeaGfwVnPN5YUfI4B1NKmN+NiShu8mktc3G7fVQhj8zBQYX6tksol2+OyJ7t0bpfwgwoIhFBjXNKpYKDPAxELJT4HGbQLzzxDGtPeaRVJS+ePuvVfRlg31x2z27f7ymRt5oV+wnIB5EQdaQv/4TH5UmdjWxD3b8ZpnU2bt3PBy2VC0UWmioNPipDubHP4Fm0ZdZeZO9pUIjIrg9wbwxMtjZgJH3bJwJVrHqQ6C1NiKffymaaTqYZb4sWg0nFV3Nkmckftga94L7NZgZqe7AERTKJb5DWXoK+dra3OqX0g357LjFxHh8lhom2rwGcOGLBscRPp6Wf5QE6xtAEtlQhKlKJqXOpWFuWX8u2lGREBUzItBwUUElnPElosJbwp6GgLZLDDBE8Wmi1DhELbp81ACSnb/uWave3bv5w0oKiowpQrtGnWv1ip1GlKeIXjjN9P2GuRfD+afuf2SygkW0NMXbUvJBuizrRdENjnbrdaCkR6/2cKvXBMaYuiVPKFoDJexNfNIwOAIdAOpMwRIeVV43ThiW1re15FH32+xnC/l6J6S2itkGTV2dKaxYUX4cISfeA7FeSJH8GxtoN3qcGXTLHBNruSfJuHKFLB+VVE8gTxUFD3P0qT/Fv0DkzAGbMqhIZompj8yIdAirxVDII0RTWNVGbwyqseU+0jiA0EjpOPRPsZ291SjtvC4YM80AxgBv6rTbCCWy/ZeMblfyvXnGYXpxtWaplv88Va8eml+mKWfEPXch4uWf+Up1kzR03eYJwrbkgfDNMxtWWsoaViOb8+xJTP1/Vrbl/RSFOaedIfZtMjE5iud+a8Fb0alP3fkO5MdbL5qHJ0GZ0dq1JplrPkXKSTy1ULgIjPQH3Tq2RThv4+B42en55FgdgvGoJYv0XR8IdX6VY7+hzVha+5gJC1pRP5LU3OymoH/K34C96QuSfYMxw6Z2QzmPgI2N1nlwIdMhL8AQ5L+9pEZwj3VwePhCfrjLABtx5KMtug60XkY8SE+HfqvwXchmwrUTpFP0RoAFYRXPyRwkHaIUlIgua6ksIUnBERO1xH55WfERGFO65P1MLMPkUZL4CsSPGYlhUEAxZoNQUOUWvmuaVlgZKS+DH/CfDBFRzvWrkFlpxH2uZx6HguhLVS1lTYvJwtwyUFOOIDmNRuPLzqyQmTLaS662Ww2iLk2QPFoFhBAZirtlXhiZOPkfgwaeeGwjfDfBAHC+mHXN+hKAzIRXNtxJ8B/GY8Zft5Ohe+RHzNgL/8++ghnAmcZBj9tsju+/GkVzS6wXAUHf08pGXu98KLQnctbdhBw/syUIgoJ4NJDIDX0T54Tw4vLEoz3oGPFQOFsb4k0BRFoIqIJuQdt1c66IwV708UnZ82HW8WWMhMxWNTYM7AuTZm2Hm+4ha96x5+zvdcpUvFiCgD2hNJPymkeFyibspng7wyvLpQvmPSUIbAg9bcqwcyhruCxEzBnhNlFrE1BR8+MnDc3kJqspRDLcxkx9+F3VUZ+9N3hQJWVhJ7MzEGL4iCU4gGIxdW9v84wEM4sJpS7DD3yFnTTKUg0Tg/nI3mqRPARiVEYTqEYYA+DeOEZJ4Hpjwc9d4yXwRm3s1EdfvD6NbP+kAHbAOHkF4Augz47lk3AZbxGkpsEfG7aj/2zb9lXSQY+AW+Ob67bYcuzVfx+UMuwUDiNN3N6/pUkBB4TEPx+N8ECxj/sGSZGzM8r9GuDX/7BVHb7fYgF+nb5++XLkcGGuJdSPaPwkWrw8z8YYfffhpB028IYDclS9BM0644m8UAC5EsEfwqLYFXs5f6WNpdzJL6y09+9O+WoVnFNWZoJdN7mwvSu2/cLRg+gLUIpqOR0h9TIu/Fg8wNewWowHfCQes/4jo6ybNxUZ1uFJsgwTh3Dj4RCjP/ESwICfazEvmAgHvh5BBuF3RqYaAYt+rFtjFzE0RKkPqad+rzoqm0xOw4Ew5EqJU9NtulMYJCdOywl7P9abl6cKW/oWWLJbuV0jptOWfMsudOcPfycatbl+eLGu8O1nDw5gkZ6Pu0JA3fUp8yfrtLEZ3wrf/9evFexvX9n/9p2BgW1+tMjxd9T3YX1xoOQIXCYYTDIGBpAuOcYjR8F937ED162exIlU/SvBHqhoSTH0qBBnGDcwFX4Rf/MLJg057IPMN67py9xZIEm7vMVYJaSRDHAtQ7PdezcPHMFwDeLu9JapdYG8b2Hd/4jE7Klt7XXGXuVVRX75qXkeh7a/jZ33M32/fT9GyP2Pxk4x3GbMUzcHOMzX6EMX2291S/28OH2XLu4+JG5zYEdXsqehzz3CTuG5iG9Njp1riXdUoMbXrhTY2vvZDNtj8pRVrb9HgN4IdvaqNDW17egvfoBhVO5Z4ufjl26tbf0lz9evLe19PPg1Yd5M5b76/gyzQ4altqm+gs024N+3DRz5+iebFodn8zXV6e6pwcV0xfDDRD2QS7QDs7SD25/cGibThZDiiuVDlb+ucznjVgDJUMhdHTvACbuK3QClw1JOsb9AXu2g+LQyJtxTjFUIAym3eOEVEm0mau/Co/i776Rx+UcckVAghPjwbKQrEbnuzvSnj0+qPFmIvvG06R9o+RQQ65IB0kHZWvH67hDsxIbDaRXdx8eM0wvk1v3j4yHqGqGg4GgYbsoBXQt9OBmlwYjgRAT7STtEzKcw5+QbhBbfCtaaXBrH7UPBSfCsJXoiBPp5tTFmdEurrRwIshEk+hZiOMftgYV/HIooNeIBrU8rXqgwR4+pZCqilcH2VvsaCCUNZNhAnH+3fcjoqccle/kvxGsNldytrSHs4LwCU/4W188uQbFuNUpvp6/9t4w2/OEGJnkVpvshqR02AqWvQZ4F/VsXv1VfieKcISmdOOObaytxU2DMuNokv+LXRkUMiWldMwJ7327Kzc+TUMKXNrv9L+o8PTaYQF9LEtcuuXlaDy8+KmSY7wJr8eLt8T97oYGmpXE+ntVjnJ8LvSUxl9nu8Yz+9LyVqx7FziglprP2Lj8PlHXpBqjIGWdrQUXIA3L9Brc84p3/HUjT50NkGBSXS+qacEwMmGN2JAFaoMWbdD8x7a6mZPWahKPbU9KSqiQuv520lJN/StNEgOAclfLpypJq3oVo4i7LSx/JYmRLVC48ahiHXhEAqJC5rIOzaDAb27WyJvpjldWevfvlcdAwyib5POyChdg44AT3cx32IAGu2Yis3Ag9AfEON+sF4AguGSA5BIm4ciSuDJRBKEOSYDASeEARsGQjD8J0n8SBH9Ckt2cGuq0WTW4PiUHaeeQwdBgk3V4oERk2ILIwV4lnPTpvFBMJ7eu/o2ByRrjOQhFeHrKjzWXhSc8ZVn9wJXeWyXv0tc31W9vl/2r390Jwf2D62T7DnlT8cD/2AC8NVEdiymiIylVgJmtTZQzWO5AFJ1Ug3pqulfQwASvmuIuYm6dzYZ4He1D8iMFkMxFdQ7rLqWdzjCyCrsFchzOufPGLwY7gOEH95/EbFnzWtw0Mal9vJsL2D65GqQGCe3Gxxm4A8GXTOzMt15xnK/IdRdAEuREPQR/DoHgq4i+2rh+hul0oa0uXiR4P46GFlWgIBmcJUzUvU72wYMdctevc7jgN3vZ1bwy4MMGDhcjKuvJr4tYO5Hph6fTSfD/pFi9uQp93OUK8sRq2i+brhPXxPJ9gj4x1qWcVGEiN3ZbP2rwWipee1na+jzb5mRhYQUwhf40AwurvY5crGmhvjbh9gS6HGITN/LK/r35l+pefOwWvWt3IFOGQbhyGu49I4pGu4mmXr0zVqXCozg1gLRVR8UbqNLfsi81uDu3butdtlko5fu9w5tJIiqllCELkoPFY4PpQW5p36XXIREbSN+ESWX4HWkl5d4snWGAtaSac3980ZT0OtDaONoHBRg12AMctiIb0VPUIJMcgycnfCtkZee914R8Og2VyRGThbd/o6JtEtGS/IhJFUpeWNnLCfgiJXyx9zrJdABvgbY5583JlY42FWo0yV4Vw6F9RAwa2Uk/v6QkoZvpzdlGjjoBiQIaa3SNPDjHkvjVn4ZVF+1FhO8I1Q+lOXxLxFk+82NVUvrWQHXbi6nQHZ1/i4vJ7VeEnC+rHIWCXLyFG9gx59rUhj8T0kgkO0kxL1mRtfDAm+vDoZnOmLlQ5++2JUjOJwIeEbyzSGUwAa8lmJhzMJ4FooNd7SOPjAJrctVYs+jGdH8TQUpMsXlip6UxTUg026XpFrMu/JclW9oLR9pfFGRu4aJD/TMpZqEtZHKGTGKELnON+XJnuodLYYWhpUDbcjzhZzxcowcMBEK7RH66QMN+BS8xG0+3JxZj0LFTe0SVUgeniSwykTHo7FpT2zFlYdTYDp8WndQ55id24Vcg2W8ZwBQA5qSIftByC9MxwFsLCl5ystBLPrXoFGUAtkdx0reP7L14+vAuG8TARe42O+VwSI7OENkZ+ZgsWo9jYTks0JCQO9M+27un/M3IV691eyqXb0/FxJ4BLiE681OyFUoup76tuqcpI98n/mpcyipHbRhTmAGnW8+pra/eBg8XYYFnqOHLg2yKbbLH7XraUz1DWmI0GOm89J5ApS2xUJa3Ot+JwocylF7uAUGwwXLNNp/QaOJtpILxY3xd+Hrk64hUg3bTRA48XTrOS6t55NOzcxPTF0bnIuOB8FhkfnRqgYnDExGeUqNLgDUazkAK4dMd2RmVF52Ynx0LHx//390z1UcX6k787/JQsHOVV1395vtDR3+3fPQH/6uq0QtqjkNu5/+5Yexvd47+Lc7XjbzUeOYoBwdkeNLEXjzdTI7n9otxYe6bmqBhBp6LJ+FPHAP8OQYaeSvAv081O3d1UznUnl07QyKo487JTokRfAU/xTTNNNHpdZaGt3gFb4nZ+SgXUcxzkUu3teexLnC35c7/iJwdMT/iAZ9zN6EqjhSnlbsS8xQzPyHJLAEvSTaTLEE/Q68KfeL2UttG3PI/aRueyLD+KH/m4r1hhLDbTLIA5Y8N6/oDnIjKJsYjbJP8RSTEFUR2mp0910/kvM45pTCyDzLxZSjiI0vfIGYnIXi4pYQQuUv5eElb1UFSTh0v6/5/T9sabV9I4uhwbS3glFK5hwSSbJ/vDidI+bsxJMctJ/WfOKqgFjP3V6PhGLgJXCkNkmIOCVKiPMPd3cM9ow55RnpERLhXcwkWHNWbOqn31M9yo9zDw92jPF2ceQuOL+Btk9aslFZXS1eZynJXSmsAF+isVbL/XpdGi41diVqGlui6qKPr9X8ylfUMFoHuO9wKCQ655XB/xmpwLWXsJM9s7Fmtyt0hcjjSQWXH8IpzV4Gf464il/lPVSpdMTTq8og+K1ZN8x7ZMevczEzPm5i5LWIXtt3OxNvH25Rgts+MYIrKh6QQr2Jy5BqLyJNrIud5YC4Af8SLx2b4sJSZzpfCBI0dL3cZKWF4WvPRzmOd2KdLTqrW5wn3jAoSAc9oVPqYabuN+Z25zZb5WCqWppO2A4+sgNX3zseFV2vZoecO+kFSiAXn7rd8wIwyxhqjmA0Ag6EwhZvI4SRyUwoLTaZNjtuqbadapnq22l3OCgtjyd2HTSW1qTOoZutdyHGh4oWF3BROYiInhev4bUI3UTbeS+hAADhPiqddtLWrtcO2JNuLc7NnMFrUuGJggHJE6GCjNa2GdDZgF+/3R5FVuyFXTEb5QxwLRMGZAEgKUZESKMo1CpIiqRYxSqgN4iB5EBwNSRhPtCs9XmDBGSOUFPAqi91MTcLLsxxXHm5i6qZ41KCQx9i8wTWErWA/krfLg45bO24scN48SAqxIUXDBDy7oFYhuZA7xDxqNQR3QKriVq4uqC6jQ79mIChnVPohjsG70w5O11Skg0BEf7+gg3CuTkr6PafB6LXn+c/N1UF73b1LxxNJk3yIVlsf9qh2DU+xYT9SxRY+kT/4jAnWp+Dl3XAoXhhQsvt3he6YA7IEb237ova1Er2OPRUsIoZepdODVoN7dNRODi/aV3sYkiKOfUFzWrMyzrT/HQscNBsgtGnSDfwhwuM4OQuT6Wlvj/MGFOIY719IGG6oQxSaGmlxELWOITUYSBhSDx1DB0FL+3md4Pf00fmijKZ/RwLPAknwc/oemLMn/TP/OOvWJtOSR61p1kDYJxbw3AKxN2NmeOhP5XFlMyTWoCoN2y9kiIaHlihZypeu4j1QtafqsiHsCm2HoIifAiBoiht8ewpHwhd9ZzMVdDvLnRhCCPx3VfnK8ue3q7uqA0mJFujnaIsMPXDrbKxFAB+h1zumCn6ackx/Cpamp8/SL2N+gvSztoKk0MRsQ2OuZf+ajCn+An+P0pRNLDNdiXSwu8H2RC+v9wRPHwYCjb5j9Jjj+FqCUYFlpnMCvi92Y3IQvSRcJt5GgQAORJtxYPysDpJC6zBN9BFCwgKC+R6t1zhMwzFsVa/j4PjiXTqWlpIxdGX5laHk9HnDEoGz0pvLTkzwZ0ISZDDEgzY8IHjZeHDF9Sm3z12+82bTm9u/n7uVsoIj9rDxJD7YAHGRwUgJkpLAZydyvZ2VEgFAHSZhSWWrNxhdxEdICgV3jvIxAiVgHn6VnpL+K0uK/V1ivfl+aWl+fJbAkiybmzwHLNanIeX2WeWys7dt7i2MczZKGfw0P780vrdzrMQf3CQPlrBqbLqDjiYFEjV0XIJjeilqT9QQA0moyjVi/3gHlcPxQmUxiT8RzQgkKuntYTYK261QFG2nK4mBDHTFqvTIMlaV2w9i5rumR5BQkZgS4yW5zAKnRwXOeU4behpEQo8fgKlSvrphwAUiJMjcpK6uUjdZAo+W+aJtloim1xIxpHeTs0QMsZaEJk3DsH6UHjqa/t//SzJpPM+OnTZ1lUpdZW7RU3Px9PTyABimx6dTOcKiA0FPluWkRyPOvpb9NdWVesypk/6QFMJaCkSMipyZSqyuqg3/nN+9ZqAD7PuXtcTG5GFGdkvFw7tzsWjE+nYUAvgt3TvsSayv1xhjerfXO93Wew49weosTie5fSsH/Cffv3zpofb09xPJgiKng8fth48cvneXh+JhejC5KMnde0eOtDlsXs9YjIb7+3uo0+vqfMVTi+5rNIH81Z7mU+StW86cAfybHUXFkgBuZSU3gJeS7CCfP1/ukJzCbGBx0dwBaxNdDuFM/tat2nHznEhLQRg+OW147ZqhtGR8f1hrQcH8+bV1SbmNbTqdchfU1T6oGlOXB6r+Ye+ZoVqqkE4gcPiMN6+ZfCaRwKCON6OH5zcE4sGDrr9rR8QQb9wAp9YQPwcuRQM7jOO6AMA15Y6MSCR7RogUG7FZuUmJcxuB3kKAnZyIGPruITqaeK+fiNjMILQ5l5iUj6dCwzXESBvb2Bhb2wFizfBkBLWypUVP1S9apLftLuVb2kYCfmNoKDMAlYokEoipKZw4lkzGijeVXDwSmSnDdKYNohPEcVJTCEQilIYKYKonD5I8tDH4wIAvfAaB0WOGZcgq3yV5dAxjSS6nCimrvGm7yalKttNpk2zNvPE2tzpMsW2ZDi2ePqYXT5aEasAHsnNw7cGs+496Caid+l8d08fbdrnixjRf+ZTBiCKe8ZSx0pzpdsXF7vEq+3LFhuYdJ4d7KvT1YwwW3EdCSpGkPuRSzsiyZSus+JefFlm2bISzlDtIiuwjwSzmyWlTPwcItS9bdpIZfGZPf/m4TmD5Gnky9rZI5nDgmf151XlGi6zibQZ4TX+kUi0w0RiLJAjlXAMwlmYpdmhMKMLX70A5rQrtWKV4u7TlFBFyRqqQk70uD6QMudB2VynytufzilLVHUXah4ukKLgUws6zoipMd9nqWelAwON0q98yU8kwHi/BSfLzyRQ6mj5JQpNEIms4L//pk3zb8ptVN/AzYh8vpJWMtUfj+YMQjpHtvlNvTTB5Iwk4L4cCAt2GaovF80VaBprx6lV29oYSwWDoaIZ0+evXw9EoBhoEICYU4jSZFYJq6/WRLLAC3uq0/pzxIUGATh/ChPwj7HHuTTUSyfBCCgoTiaIjkUxLhRVwHr4fWWvqUodEsgpuhqRQDBLphKx9Xz0KI6Wy6PmeibR0A8HSp3Nh0yQvYpct262cyofYBfMBTI94no+7vq4f1LgyhFnV9iTi+vmyV8ntQbrCcpkm+RC1Nl3xJ4weg8VCP3qd/R+xu9mBNtluBlp7d3trQE94rEBpCma9BcAnE5zY2mYnczHx46WkcPksU4NpFwdwoYEagSArwMyPk77Z/Ind61NUE+qp13ZP5j9wfJ7h+HP2p2PGc8cVtUpZqwRQ9qpYNcbSb8ffvB2WmFTI1wW6nuaC0WIsX44K0GoIQiZg9gJD2kGD3nEVDEmhKUxL3SCg6TE7RRDaBcGwd18YhHZvOFgAQEAxqdXJAu3wDp9+uNnpYwFLPOns05QWYOib8dPNOndgWh+FAgV+EeHoohYR0p+ct4SEYeQuYfojrR99ENS0c8nfchwzBJQlCcMThlVbLW2hBCgcqUYSTESm+CyHIP8MG1YaK5bnSTga/7KcqPCA8ni+TWR0kG0G/EwlSmb/x0ImQEofJ4fGKq4FaGyDhAV2EQIXJdeHWD491YoFXF16OSQ5+BQgUiowkpfpEh7ukskToLSoYNxTwPZWKr01ptLFZpfiuWSGh2e6AH7T1992D+7MEe/O51TYzffufgujCdQOLjn4NvbN87fPge/Tx6Ot9iO9jttlxm4bq9ltDY54P1xuRJOgKS/6EC1FirYwiiO59CiC0V/DdCUPEY+kV6ZIoSPjp/Qk/jUsse89OOsYPDvpTYhoKfRXQfCUxeEHey7MvLfX+OKPXvMwlIBJTF3p2PuymCkAZQP9in6hXDskEDQNbqPmvuvWjESgmjmry+hYOv05zaiIvruZmSLFlykcs70I+H8jfVZSF+QnWPSXxHqXTPZQm8sMBqm5NDaWgWEYAqliyfXr1iMzGz94QLu7aSMxBwLxvHO1J7+TsIwT31e8bwsySopuRRdiClNkC2exhRmvZ4V6/ysttFIdVOLo9SzkmVeoLjr0Vw3IKUTxAfsjIjrjWM6xn50dCp2dCx2cP8c6s+I6cQzcZUgKsZLPX1gnsyApdBnHSA231wcizT6sbaW9zoZNWv0WVOhe+EPyL+9fAfb5SNwpAmgQ3FAQnBcUlBdc8NlUUnv+guDPzNlgBnj5iZwENjuBk5gv9qgtNzHB1Ho81Juaomum2PkLAfDoI3Yi5RVGJfnCwU8EmItApgSWsdPUvnrfapQj7bbp7ZT1H+Rr4+VUeJ8m6zVsu1Zk+zo7aysVlkd0mdcWuFf6W1hsjLtWIAqo9v/WHx22wJ+21TcTCgN/jOWeW3U34uGCIIG7FvghbB5c/MEUoHQoMuIM2R+1LznfYgdX7MoM+Ks6eG7r6bDH19G3wKILgoVJkzKtd3V0BIUzj9sk26ZJpQpFjk2WtcZ6qh0dNjmGI4tjKBRSaZptss1xZnhQR8eBTM+ne3piKVFkUVWtqqLEGo4oqHsUth3wtp2cWQ+ZpLpassJUCjJmnRNcFM6y5jSlsbbD9CbOCeIhuhE8yAl303SDNg67LM1F5qIIV3tHe3pFeT/2HtRKT+8P8ml1yY/Jd3msg1S5a5bL7uU1hjFzSad0eOBZXWeey+dYl99UbaW2bExb+rnEfnbJ68z3YZ0aE2yYMDNIGUj/Ot72W6wuotv9Yn/r2f+VzusXJMwMQ2h8DH+6y5+f8dcN51WhFVrlfOMvfoa/WXdvc3cpD9NHj90JHqP/mbv3B4RwMzO5IYSQsSZuZggkBUPH2yMjpS75rnZLEp8F5aq3i79cfpwyb5WjnRpOdXPWdpg8XRZP9dREU0FS4/oTnP50nU6h9PVdMP1MjCWSn95xio9hSPV6BprRgxsvXRrK/vCh2ZVgBGYB2oB3hcYvkxeYunKahGFlm0+Cf0XUdi/4OlvDb2qnivZlZ7+2fdT+BcN7ZNgwlD85MDWDp/GrqM4N0PgLNIE5RjMBef452YLcoM/2UYGpnBIYVWbFA36H58D1XnNR6RdcezQjTupxHMG6oOellc9vJCKsHLg+5M+X2GAsdgKrt/qKsP1jBFZAwLbl+ZJMZ00nsPj1qEb6wX30K3OqJJ4v0uSX6S3ktgPHXxGmFFOEwsJbsZt31d7NEzS0wRMiGOwbBbtYt60ZnnO4NHQUW4e54a5u6t6/qKvH0qbmZt0St5FWyQ50DjYDndgc9A7J+wPGMQnBKzT1k8kJywSs+J8I+UMMRZIIw+iUYIj5DTQTMRLOU5OQwSO5yvNyNImr2bLzXwQXEYy7nMyIZlOm5Gawuf/dybVP2ZyKgifNXTVEMaRe5TKpQyKDre02M5h9iIX/CRdw4nSTLqvUkJjo8TogV7Z9XydCV20kcaBvmoBj4LZimpQt6DgedvzMjoDwBNc4lxRgjqriNOYxMIxxTpwWlJBM/1YeGldIW1jmE2kaQ4kmx4LHLXQyvCNqELBEwikgziXBNSCCC2/oP4XRJjGRjo30hXGF5aF/bP2lQwGBTrfXK0zNeohn4KZwDPxDHIfoKJdG+0dhnPd9o/FyAvyPbMG8wm872JLV5i/hl97CD/AHjPAyfLlfYjEW0VvIs3B59D+8Cf4f8+j0qGsLCNzWskietPZN7TMwtCEanmD7XL9mQvwg4a+mzc6kOkhrP8q9/tF+GCY/WjthAXhLJwQKk2kTJQgEUpmedjmLqCXqPSEp9ByBRDBBGGC2Yp5DUsiz3NnxveYH5rN8Msm0lecVg1Fe3bj+M+gfMC3qM1ESjKYsKYMgHtIfRaFlXsiypKCfJbovdN2lz9jgxAx90sgoduu7mdpu/Z8bk5XJfbHazQFXpNvKUt/2JjcNb3FwICVe/TKEvCHPJGhagL7rQfl+kvS6quUw1WGWFOF7innzuuZVdZL0fL8gUSkMly41lf1DjSEplJh4ST0VYxnws0AIMREq9JtEBFL8iwDbhX1TULNpCCTMBGs3sws/GqmbQpW3Vtoit7bd7t964BYGszXDdJ4tp1wM+GcX0UjBEG0d0Xp5hR1SAvlBEiTuMuencTOVbY/1tXAt+audSk/yYKkyw3gnImg+3CjGPjfe6Xd//HvIjt6TerFMHqmRRas00VLe9K13TuZSB7V9zMANjUQMddKIOz4Jp073w75EBA3yRSJh0hy5hesYBrx1+AXwGVMg6fUddCUXhK5monavKdrFtJPixBdtoxNk+KimbAxqAOEHZYHkvQgeTYpBpYy2SldQuIeuBHsAo2EdUXMK8BonFIzkoRBZv1E4IIj4HMwFmgT1rQ02GtZV+cQDlYj6juJ2lnB0zHVkLGdJ6jQqEZZnBhrLvfRX9buXVvkmJbGrlq6oe6E26Jd3Ve8lNw5EKcjs7BPVpaAIpPOSua6Mn3qHl8pNTuak+hVHtPKKs2kwWdFEIN4IXYdCoGvRRlXuJTJaIS70MDEb3WondbigHpWtnoakUGs6Wg8BFALlZIbOjWmLyUPrA//sCk/JY20OqL14wuCOkq7wRLpHXhK7cdu2sWcQG8fAWToFZ/X6a3Xtla2tykGiytbcChQCDHVwt3nt84TOjc7RyQUCnmtImab+5hZJrkzqrOVF0mukp0OMKc/RKu4bA/nmDvNfi5CcvDDJHO6/qHwPRo9hn3ARtrljT/ki/keb93Kufy6QpDkU+HSTO8rC4gJ/DB/kP64dnz/OOW39G82mL5Gdq0RbXxT9BoIeBS8XmrzX33wJNfQCRgG9xnwl9TRWXGGjUSPvHvO1j7/0B4+Jl2jAyqPq66Pk2Aaeo2FTZ0dUPVbeHZPrgJM24jKRqKzFVLpaaFFRCUcmy2OAA+wDRCqbCopf9vJh5gF27xs1rnqMYyCE7tF9DPswtu0YfaAQZWBcpqAbAwm4sG4RWOSyBHMHRjqtYjz4tO6GZA0APHVlhXgV0UpFJSBnohd6S737dDLvDKl3e5/U2xtkXaKb+c6fN4wrct3gCEmR0xAP6QhJkNNIaXRpsnw21kgpxAbo1zb2tlEm9haH4hAcSL3SnRcsqfZx/NgbfWwg6QL+vXt63NDqCU8hKy/CofrGxk6d9mXPed8n6on3j0XTISlSlaz1t0FKoeSg7OvoZAUGM1oZBICoQvmglUOPg1VEdWF1BJ1uUM5GPa+aTFPUZu9c2thj/F4Sj+xaizw+9yb92Ucm5i9o0+S2hrYqYaV/LqcXCJq4CUBeOkGeqhVXyn3+cGvzE85Vr1fmVz/22Yn/Fc4HMQQ7sNYoBFHRUiKGeOyYWj0S29ee6RUlpN2TI/8JKv83e/KUiLm5PGLFH3i7gnplD3/PFf6MUt1V7lQKrKiXElfNJemZ6k6S+8X39A6/uftWHVWFJ2cV76DgUUp2PdfP3pTy2GfNr2e4bdk015uEpvnHh30Gxmt/NwpOOvgQNm/+MyxnM8EHJWAu3LOZtvkGkykYp507cFzxkbMTEtiJnCvMPr8QkWpYi1UHcZA8SAfxkJxzeBVS2U7/MiAem4dCspZIGZ7RquxE38Rd5leYPKX0ha5IFA/Jhdgvnb184WBOiK8oLmeniTx8GF9Tg4/afTjOLAe/YAE+fXfHzKaeoR6xpCcc3Xm0Q249K1b0lFeA2L9u4HnXksezblQm5Bd61W+M1oBuqZ2IWqAVtHbbSakibUGrgFHEgWdq55TykNpAUogNSSDnnKgcZ3IcNiSFbDykchY41tfdXY6naPwjdbJvwVuZxbyOaGcHMLRhm1vOTQdTFSZHbKWgQhEiS+KWqbjOBOejikHw4+3Vni0HvhDU+t1Y2CEM07p6buIamFf/5cDuXvEh/C4kFv4uv8PNnC+jDCxqvdeeJ/68tJljyh3vsOQiJhBz8WSAgAX0EOIhT0A8iE22HEeq5/zG+ysWVAPQKUTSS9OkMCDhbFIIOkeeVX6RHJKZuO8XGesiTSXYaGWedl2gE+j57svJtezCyX83shrFQTWlQjIlnjf3SFMljCXhQRsqa6sOQYTnacBfOjfVriKHbtrhA36wKSPFQbG276DCp6oGUGz7RIpI8PRD4McAX5ecM6V8MyN7u7MVe9hjuYyX27j1rh4PBT8Prr/PGU3ERca8Txc1IO1veE5FlrfyQpeVM/4cGVxvVlLOiHOb+ZJNamiT2t/YTSyynMlezBnPRgYv4/2mQWmU4piwxiQRZQ+10RU+nmvFCYylAldKeSoOjN4GpVAqO16ilIntkxBi1yG54JADZwe6CaC+3zJU75leN/gZsrUhZ3v/gc5iA18qZNExkOXDEHvlE30sc422DWW1D52Rw/ayox4KNzeFx9H+8qOhIUVFIaGDQ0GZZxgcx2JJ81/byWOZgrRYwQPwq2QBJIWOergpFG4ZSy8KCSm6EVh7DDizGLz2w8eWl5gq3/CxDFig7F0GygwIIhP4/6H3Li6UglQjPs6xzJjWx8vAyk8Iegc+DHsVCtpHPl1Enw2FtFVbfIw76Kn88GbjHP7CKTiskNgOSSG8i5OPQHj+zPjvCpcywY7/EzwBgky8vxF84BeFSMQVFeLlHFtUIQnhFz0BYmpBgf8yIzl0jvGjYOxVGJ8wzzM4Ue7J2baQ8Qqska4Br2R/gq3SreDPqHcqVbxSNPoAf135Y+jYiSafDiTRDmflbxEX/ovhS8V4ANInqvUBx+HVvLihg0g+WZcRpFNm+PHT/L1dldSvar1noU00FUmQtvSY2VNnaDzEORs+LzXFr8RI5Omn83ubMGLex9O9m4J/ZWYek3GTd1PqzfViPuN+5IbyvMCOuRwwavjWD/hPLFIqM5uisR+w0mgpQ/Ac/YOw019XONpkLm007mssFlpDUugwaj3nxs1FCxloxqlTJKh/GY4uaqLoIWKIbW2NjaQUyWQT1jpv/OefJ5DEY0chJV9camWhtl1o3xHXwgIs1X6s/ZgsmlKoXtuxOm3eHRfOC/X6/5uGVatUJ10lNuq8KQ+CdRd0AdHnydlTbB9zjTzG3vFjJ+rTutLGYwucz/XeI0T5TsbaJlV+isjG0WBbtS3ANHkrCKaAPce2anXXWEujc5rPxoA6dRRHKUcJmK17GdhNwqnTzLaeqd4jnHrq1Ol37ZcJ+FVmuccXJ7pgmSgtioDtVN+oeMM7nzXWJYVRBXIdzDbr+DNhrWrZJqQaSWOrkBb2cw6sU+InfHOaBPDtmaHCRMZdwG7aNNj9UenDh0/20eOWapdXdNQlaEI8+zwwKnpTngl3hBwuosVDyCe5JnlpaTW13w+QWBvdaTWkekPxVuSkfi+UDGmBlKGEDkJKeBpxS7TIEwKxwIBPU80rsZ+IGf3tFYYS3i5vd8IAy0Nalowxq/0tIIvrn1zkl5TOLR91HvcLpeynTX1Ogucnw58jzfPw/A8R2lkZQynWGXfVmRchmzQxptF6Yz27fqO1rShwnraJRKMjbcqBde9SG+tJ/enCYIChcZPY6acet6GbhSldbsqaturOCrHWljZvNZzWtX98aiDkBRFDrKoeCqdEENtIEZTwnurqYsOiuqrNrsxufnz8/JGj7QHs/r+Mur/S9O7e6p5AT2+oSsSsGLifPnVABki3mUnnxjfLtpneN922jKktFpYi4NA24n3f0Zc4Qi4B9xLffcYMV94zI265x/lEmE2Ztrxoud/48/u9F8vuCcVLrrUQtARTs/PJ1bVjBFOC9i+UqW3y4rX3/2nptHBXLG68/wJTEGSkw0A3jHJZqW3+VzRSiMw/t0NCllLCQyWf3Ivpg72uRZtESaCKfAtPyGIk0hKCxX+uKoTHTefEmmRmUX9Rpv1DSaBbjIfSJO2Sm+825E9OB4iOQNqzqpUTV6SWEd7HyQoXZlDFWylGFFJp7ETMtMwSqX7I2JMvd7WFO+onu8YXrpGaGTdbdqpNBdTImopoa/RBUQAv237T7QTW/5MqB2mYPQzk7Sa2LDCWuG6Tamj7wnujh98sb/q0bmXC8XUP74wx2mE57TlteS1a9V4Pm7Y8jm4NDCAAHoBcS/Yg17jUkMEwINTDrFbkPkzRUu6QCyhYF5DvULQBsDpRl2hoVDgXB2rqgaBModAPDR36iy+4l+v736/sp38to7teaidqidgXK4BbD5Al739/Sab9l5MiPORubnKPiH2mktrUeZOkQmVhvYU2EdDRiqWILQOnAaON3WAwQTmSBZf3tlq3jnQ//9LTTjdp+2Gm7+je23uotxVwdRfUX+xcld58fnrGLrYuxY+X+oJclB7gzqzwe3qM7X3bgHerNp6F/+ls97WvWOlNcv4hTxw4dukPtB5diev/MCOY4eu/k7pJV/jv1kpuag8errOp66m1rq2uIVKgOjPgFAfM6iAKsbqmTXpcyjh4+JQToDcnLSoOLQgO0oYW/3BjUMH2FYf8oFUbHFzAbAvWas1DFwnnpfqlcLkpfml3CXGTU7j/+t5L80vmcpORLyWZi1ic8QghUTQkKoOwnJD8Yd6NSy9WMr/vW9y47cvmy2zvEt031OKZ6X2ZlDff4lcPudjIgAYVmaYhYtiR3p4xXrEZEt+GKeLIirODjsxMpv3gREM9kdnb57kAzvSJ84qJ8VL6VFJGyMDpAhx+13vXMsreTSDMNYcPFIrGRVGKf/vyv16w8/NYZziSy8jczs0My5QxbobdTC0RMT0POon8Uni8FPDXH50bxi0rfv8Rvl5R0rADgxn0LhyZO1lVcNJx5AwFn4Io2LLuYQC6i1hz2+3deloRqWDV+kcBVl2ONQfd3oVuWt/bfVtU5xQ5vCKQUitev+f4YbiWkj60wo1SAwI2RSz4IOKSoEgWQUWw39G0z1xtriqLKCuPKNfNAXfbGsdvNTamc6Y2NevmKpIMOVk2MPzE1slb5S3yWdPmHeMXv5l9uzA43Ez+UeHInW+mM3cGTncqespH95d9A1/LRkcbR+aDS9EAXbZ5r+YrwGiKWj4Y1+gW+gq+lWFvDAw2oR0Bgl7KKQfwSK1LEbexsS67i2toxX5sbiW7Cwv11HQhztH62QHlHTNaqyd6SXadSyEPW+02jkHvWEqgp7AIriBYQWhaoomorTZ7AxdB4NoAhkHB+oQYB0rTHTYFbwrB0ziU0Lsh7zk+A/uSIoAG+dXkB+UEBOQE5b81ldSmzuxv++aYXHquyjfOxyfOV/WbqXz1cT4q39/QuclAV+IsQeqgIvwijDN2dqddan21GVx62U/UEnVYmCKN/cpwzFmM7dN6KOv6df11qb/Up4N1PpdsWl8srIQTZRZYpw3KDQzMDdLOmWrUnl8bNMfMujY6VgOC7AUxguimmFgACIwWW+O5dly8bs0DpmY9dozRITMzV5mN9HTq7Ln23d+Fe0Dt7+SjiRH+ibx4ipqcYBYTY5ZATqTE85L8wxOL2eUyMmpnGTXtivTUjvGyXRVkmfe6pdaWCWZZ+GKBFq4szzZS+DWcmm6cYKRayOUWqZwzjdND9X4Ko+zyKlgrKMFlmSVdpRdr9Z++D4L5S0f+MdR0bRq2Aj7/h6WKQOC2I/YCUzAqsEcxbt1iYBklJRqgK01X4vFr13y1tPx68KATV6F6mbWVuQG3ue4u4VZPKnFYXSF3vbuIOm5EZrTJTRfzYVFwuRjXVhxiLoBo2NzFTvZr69ZTTnqnq4cP126/dG44JWWSqWcCvkiXzY67c8MXxz5ndPdG/rhzTHyYprLy4sXK5xdHJi8Cc/w1Gv+cwJlGQW3qvCj4sS2yqH29kQLe4ia+15y7fYQfZ+n7350IAQT7uwPx908P+MC6ykmnbkjP3A0B4wg3iAu9hugrtUQlqZyIItQn3exv1EnhMkeaBAJtyCrGskJf63VgjiY2Kn04PN+zrtQ7Id6rtN5rvkr19Qe1Vm7/vytXvDFcFbFcoC3gtwIFSIzZ2JY/Yj/gu2iBvRJBAf4+xFoUWYm1LFqqV+QdHQl5jTEs82gDJXQUYhaRTe+vMoj07HE3ij5QQpv6hxzPMHF8AujdZ2symNoUN0u3lPP3UzADQWZ6s6ABTPLFWn1dIWN5q/4aelhjuvMwbhi4PX0Yz8VffJ4KJIHDUuQpcTNSSqL9OIZTZW3cvpdLggraogsMV5l1iKspqUPnL22vPXx44Zk4jYHJ6U5DKo3Wt+s8RJukac+2k2T0XIoypHTrQQpK+tyIZHehPV4rlxJyrH+2JHnJ1/LT+s1ULtXGt+fgPZIFFMH4Dgh6P2E1r4mYLVhH5nTO1yhGUqZjs3G6vcVBkT1hS+Hl5uBvGa5RW4oobQd2y4L8RsxqTYkVIR4WaJMCt1W63dQ2z17sFjTxlQZrkuHcatpt6jTaXT9/XSOONLEBTHFMKBNdAM+0zDcjTxSAKbEpBT8qxB03I50tAHiOCbn19bhmyWcBXcQvRhuBB5l1VvUXBkvcJUePWcSYpCFi8THmMmf78IsbN7KczWXm67CwnlToHNjZCWsiZokWfIvU/at4oINoLnXgDThmLnWUmh8L544qh2rVJil0A1GBr4KA/4mAo+OscSTc7mMvwRqLu3czukHj27dbvaWQN+XSrfgk+QWDU6f0tvol1WQRfUN9PZFNB74fDljMJv7BulZeVl9UyMUWWaCs6hPzyISjR1NST5exiUfIRULgU3I90SYsmZsl1reIsp6WltpQf433/U/ZdAGEyux0cJBBfkYVFbOE+g/2RInkQyuDDoYTx1r15bHUXj1xbNp2em0H+4Xzq60tPb2C9J5MIM+SK21kS5+ojpNqWVyWLemfY3iajQvkq/RON5szMyeaU11UUX5KhIssmqsBlDKt7aztO9tHeGMwPg7rpFKlVBhDCVh8QgMc0XHhBDyh+dc0e1T/uMTKYNtbdzeFeV4Kd87u2xL7UdPAnxP2txbcrrG//l+g2bg9oEC0ryCOBsiIsBF4hUJnOMTm1vE+FQz+GoWQTFZcos4bq1JzU7lXTuqN4pBMNrofxVc3xFFB0M2wkfsG+AuGim8T2RvQad9Akm4AKdQ4DmDJMO21ESYeugB50kIJkCxMf4DO49URkgctRpaAKm38q59Vy6LpaLoLpkOBwaADOuH4hAeWSsC8IToMqChsnEJgtMUgJEAMCrC6rr9RCF51UwVcOhocF+p+KUBtdMwyB+tex0dVaQALgJrrzpAagpGqh4Y1GJIhZ8hOZ0iFZKPCNzqkjAsQEApLkTd1MvhDS2UKOgQHVkoOY2zQRyQHVtEtncAOQ0qkwJ6hyHY4qNTXZNR4Pye4FN5eTG5yInQeLIXl3x04LNtgD50LLPxlq+KBWZ3GhIAexvAxw+hVDDtiHGE8AgzvekBPz5WrXQNtPVevToBu69WrbW2jW+8x/N0DurunUTUJbjxgIPpVFKnm2y3uaOYqC3P1iMi2dGruoXaaM1c5TpGPOKEvqA/TWienabFYW6CVVQTPG4Rw4MFg2NjnuxxZR+k9zt2xEAtnC8Ho2KdnNveIs391zDNbKkqgyGyejX0aFVj4UcCIx7DDsJ/fVSOjq9U37KA+iONQG3YANrccxatXw3ZoZ89hnNRh6MBB3XTIYeLGhFM1/cYCisEkb13U+TEJJO5au4Z4xSorgKvVtrT0UqscKtWJC+yr7cd0On13B8e+mHGpzvtoUyXhF3+H6EHLg9ZiSjGv+IngyW7XsVqJZOHCggSsxfKxf4WgAox9QteiJ7F8DUUGonxpePta+2t2OCYR7a6ZCjG/IElOrebLN2jDk6+FLJxJFQRsPxuJXSu/RxM9evaYXa2dFsvv7UGyf2sF5s7jb5a+dbcwHgwZJFfhufgCLFwj/yQBnRRITc9Xxw9G+GUSMCCK48D3L91Nrm/wsvceA03c6WVfxV/LxK9vjU6MvbAmQ0x3fY5No4fr6cj4JBBLpLsCEYn298k/VD3beg/6POvfsCiepnSopbLSvRZhWTY01M8eYTGUs7rp3Oo1/wgbB7RFBb2vrctyijHf8/HWXcmchitXSmXJXdb4/O+Y4hzrstcFvUXaAWHjP2vEe+SuHjOR9odVcWJam3VZatvpMiudus8K+C8NNsbY45m4CTwZ74ogAiJCt2/l4zOY3/yuzyKCu6dpu3K+JIfS8mdLdYj6EzQGw2o6l8+Or0sQ8mEcncrAwfY+sI89rc2WRNW/fMV8BbybxVNnYzdPfYOJuYlHbWs9tRr09j6np7FVmSuiaXNfw43ufZi5IS4WuQn9+yk8KQ9RpDpQ7x8oPMs+8MoBts7POm0HK0Ldy0qJYWEMP3pqKnGI5uZ0ADMlhUOEEUm5x7fvqanOVzaQkuDNRGhFKN/KYBlqabDCbzp5VmI8Mx63i8Z4b8JbckKWDjXXosgk/1qX3ZnXgtf77I7hZgr0vmXGCmHgj0yxgr8pzPCPaWFmmNbPyeVGANAg8cLCZoWNhV8NYf7C4K+MuffseKmxbBHlAXlhGHYrP7ZvDxQOrtcGnwbdJ1j7MTh/8EdJP1iakpcymqspwBB0LKXkBQZMs32gks9DRoxaG5+TULHv9IljJ5y33kep9Elgn0cOn42gzjsuzlth4Sj3szRS0w6IzbTEHDCIGgqD84OC8oMLP8d5a35+9s9MnBOsJT8gaZcM27TkSbJxR9I1dtq5P9jv8XiCnVz9Zp4Fh2pGY3a1DaQ2YmZUYBZKKkVlBUZlErvTM9RI5Fp2gt5KOont68yT8uLJ7OW3JBp9Bm6J8tgCdQsgNezfv2xCN7FMpvfago6k969LLHwbQ2ZN6GfpaHD4fXj4DzFU+WPG9cCB1HQsDGPTJQweNymJW2gqXYX0Z10w8LdherrHrkevN5SXdc/MKKVzxHf79DG6O/qH4/Vp0z5t8uNHEAs2jdwWtW2s3hV2KgCIVvr6dtr2BQw/nY5UFy86S9P4KlNonn5GhJWKf4y6dfXVOf0wAATcwIv8e3r6pzdfwkLYRoYQtU5L4+wuqMxVNtMdUAwuFofomLYxV6kuxNk1O2uJIbaRCIFkgUig14v8a8QBRrZRwcQC8boEc7X1gxBicTE4mj3hzkudCtbJyE28dsfixUnhwq/r0mmvovZnEjWdg8Ts6P0hrzLoSy0jhQWlpQWzEb3uscZXIfszCNkD64nZGeMhM+mOTZYRQlzuEapL8/IBRC0dfoF0YMAyb5Eo/acN7K+FXr4gsMkUTJIFQNYr591nweGumh6zhBJk0H7mNtsw221h+k9OrLOeSqTqK8rbbBm23cB12SzyQ5dk++/Jz4szBNPDSe3ODZ5hpnEvVC8GtfQNzu0YPaYb8xoSnVlrMemu/nfj0GdkMBJcJlrepoewPelMWl1gAa0kQqX1FthM5VgOPqVyppuaEhJalomMnb80Gu1ZCPl75MRHljotgzpbHZ2It2yfWXnGMgNFNglp8Mbs0EAul9e9ysRWHRBq6ao1Oqei2r+hRxmz5JWVvzx/paTOer4vLx8FjlxSLXGY8nNV1fKEsCm/6uVLCjYSW4kdWgtlQYvCVe7aT46mxFmIuP3/stgTUM6dk962+ewbn7W2BxFUQgSivBKkHhE0MprNK+G4Qkaj+VK4qjBuifV/w1XB1QK5aQphkBJBwJfJUrjicFYGt9Q/JM6iuYAV7hpG7l+u2vmV375m3913IbK/fnvn9k7/0C2aMS3Zvp5xfcrdfWpKRQR9j2CY1q/rp8GEObYRAPSG+2l9j/qZqwNhCjAUniSEGh9pdHo4HU0H5uzn1sU/fRp06rQNw+YpLnJauHP50cJdJ8oHC/90+nMseqJiR9HRrq77AhwJv6ezHZwKJi1iVl/EXqbuFANRT+P4qRxNZm0wCOQTGlwhnWe7UOdl4rbRBAH/aEEtd6+Pqdz6YGsYplK/Yrw6tPFEXhU9UVZNnFlDXFN1sWJ/0YzTzKCW2dHCu8uP1ohjvEfzRc3DPACgzzBRgGaNKVyHLtuDcJxwRJikE3ZPGfyLRmhw2Dw8/BYSu/a18Xdg02E4HZuqYPHKb0Tzg8uJ/NE2UcgegyC1Sj3D7Jazfe5V+Z7XFXtJ5XcV41KjRq7wvj1CQ0HhMdjSL5jxVAADw3g/3A8CGn812Sz0jSqFWmQVY10TXWhY1SnTjCJldvUuzXCzsSwcl+uZkuyTaxonZBHUjUA68CwTK4dd9rrAeU6Zg88+j36SGzXOGO81/t5olLT/k40OOB6C67TB+/xtecEFjgIAyMEfDhswQzWIZMz6+xvsvluTrt5FleBbp/Jlq7Zd5SQRlVRpQKgF5r32v7eus1XDdfbDAo/yacwtBOMmMJHgddN628+NoV1Dh7OHh6TXQl29x24+uYm7Nfj17fU/vjaLTJuG2kg9cJuzHqSnp8lc7dgMDLuqfGbzK47e36eQAqli39qQzFCbMwQt4YxN6MxfJ2ZOpL4er6N+67xL990lHnErKQn1Ujl4Tqp+V4I376HOZ1fFGqK+iWTXxi9oKbGpsquMTZxnX2K/MleX7HTxvY5lXo0gh1ucdjYrWd27f7yiAW2kcTTKF6dPPTEgXyP3yA7mhS55fMzT0uESUL1mvd+wA96xYTZ2dkcMHLPjfZnle89Zz1+eBqHQ9f2OWDh2h3P8hkF4cMP7RktDBxR/MysRBgiC9IDX4rZeCCO9fFauNl2b8aD2GbmdgHNwJDEOq1YlMolMfCjAOQTsn8AW/imnU93dkww982pDg5PzVWar01XgxxS3xJ1RnmlJGoo7RPHNdSkvNdfFaWOi1BjSPOvXzdnc3Fx8za+tH/9DwqhjorRxulLzchffXPKdL19heNHdG9p7vb+48+f64d7B29p2rfdo1Pa9Hn6VHf3CuzGhUs7PxFbA6sDR4M8R5s/cCKuXTBDoF9jZyGIiDtUWUTtbZWcSEOH9/7pJYAhKjWfE0hvqabGMuCOMeFpMQ0MsPY5xJI7z9RroMYz4w/eixzbUm6EGvCOX+xcW+i/fYCqpnbmhHxcR6p/B52fMv7Gp8OenX+GkbpIxKifaaXuQPGi7/KCH3OMgs9tcZt7bOUc9ROCbq65OgspBSniEpeZU2ylNBJkS4JubS5wD+/aYg7ICNkcm42iHjfUlaolsvITroylT222W22xNpdDDyJJ5+s1/EmjBCIdTIJPNqlTQwTmklYufOiGnAluRk6D2c7FCMrO9Dnl48cToCXC/NFa1goeuB9drokm2G1a5Xv6Uxh4SMyGyirPno2PpaMyNb7xWGSerk80T12ZIbgoCnj5ovAThvHi1c+y5ddNEDHHPnopKOprOciOiSVI6mvjrl7WOcfcOqQUYGutXeb+Rx4+V9f8zdfbQYxctiqXHM9IQ6XFMJb1hET2WnpBW7JPRTR4md2f4FCNSByQLG+hKZtyxExpuq38EIl3pXr16tb+HMj2S31pY1CqIQEQtFxQUUMX2UtAlaC0JvHnn4ypZpeWHQMgXQFqAYf+UfObUkmDg3yf7rveRsC/lCUpG0QwuJzt9NS4JkdKDXQOQFKJgO/1XJI3Qk5vA8/TOcPQ0cXIpFdhMWhmW1S2AQMTj5WHOWjGw4cAM5R9C3iMsqR39qdnaIQaG0bx5x5z80dW21iozgzVYAk62Iv/3fPchVU9PdKK7+4O1JU8TFhKGN6E3RRvrg/SkOqKuug9Tx2RCVNnACavBT0GfTCaX1i+dNKEVsf8L6wj7Txj909c+yN7kWlN90zWT1iDfn/IOXvt/2S5QfwS7hZMWk011HTEddSAg583LLS0iI+khruH2k/n5E7K5+dWtAUS7ZNO0rshI3rcuxvDJk8OMT36f1EI/4dRCEoYkFqWkiMR0DJ3byjYsrBCHSCF+TRQjhKW42rBYTMTQ95yIAA7AfNsvnx/414A/4+Lkuv3ztXmLlrEOZXUKKUWeskK5MbRbNpPQp5pMgSRwT85SpKUFmBb/i5eY/zBZuxDKWWty9x5eai8JicRL8ffumnPteV+WMufh/8XzgIBNQxOYhDpMk4U/hk1wJp6uRBMYNAZBfxTbVXMktZOa9DIAf0Tiq89VowvzKtmMIA/WJ03+FSyLtEDjGBzlqa7CjvjFvIvlBxsW5WkN+aVDRZhoGjIPYv/m9RuUh3SCfOXIcDLtQUOqIN4FiZBKic+DwskIlBblhBTP33yFygK0qiUFma6pLqtWuaS6Zl53zXBJq1qqc6brH5yv77x6lXOaa0ZdpnPqapuLH1019NQmm8AXkDtjIrgqa8u15yYxaxbkBgjmLaJbN0masBKsTqKz3pid7qKOUnVoXJnDLa9d6zoF3wwJ9rrJOeVDGXY96TrmOvLlMRd/t9Su9C713jy7efdaKjyIbUxs+tHqaJYLJQjYv+eQmjpfSF90NpFyhJ3Jq8IC0n1kq5I7Z9j3Jk/F8iH6bAnAYABqMKwe6hLVtw2JapXCfcfALDF7gUfRW9y30FPIEqL795fcB4Kljwm1XGnIiyizPT7/MS+4fI6PyqV5zjWyTy81wBVNsuRkrNoV1N1W7LtjbtfRZ+mK64ZCCyO27LZUpqDPmm1kd7N9DGwK+1Jry+TxyRanZU9245LAaC0CucueRty1i4Fl7NihUbc5EWG3iz7Wo9xbXKxQ1HCyeeDuVVdwysheTjgGeKmrfTttrOUYVI51v+jKhQuVewzHUVNJ7eJ0JSM+LS/hYKSQuNyUYrqcuJZPOJSb9tv8j4PCtbGR/suLilqrNlQL+bdGxL4vcL6IjmYkJDy71BPZ4ubD80JUKiKGuK3JE3pdDk3yof+06c3OzjLQjFoMX9Tt0GMxSSNhSLN0DL3um8wWAZNzBrxC0g3+ES1PPBwU6qBn4vLgAO2vX32cwc4nkMuXBy+n1U22wq2TdXnGXrTlwcB/44ubLWsJtfQaupZe4GA1tXSScRBU0eqsMPB/oH68jLSgFq3e31sb+v+X66uLqBSD2uLcFRF/3Sdzd/t3v59pv8HxvoWVysveeTll/dflz9qJbmY+XXmzZDWfbhQZydhRS9QQj5LQhDUF3yDp/YjNLlAucjuqmbO5gWOzx2spLR6R+cK3y/6FwZN9fXxdu6l8Hxv5HTD1X2C4vi8oKtE9xTO/Ji9QEyDIDsgzehWYU4b84g6oTot3imHUNjrEIVzA5ktfDtCx9AfRD+57U3HP9fpintnWSjp9D2gGtltObYtMVEe64eOCAiwhagCv5qzoF+ta0y9RCQnwCZu4kEhgY51AIMSFV840A2Zd2DIT4hpjXOWoKk5L4eypEcupQsldIZ50TeC3FDs1hdFjpOQJ8xfmpzYXFm4+hdFfDdSHXFDwdTzMqc0gkNixdi1xYz/DrucW2nNXqdX/UtkRY7lvlaRYi2k1rmTvqdPjDQ1Ukpu8dsSo/52Nz+r5GRlPnlgg7/BOJR7Ii7l0jH4v2Nn8Hiird+4BXQQOHcFHuCBxxgnAIjlM/Vs8IeJ/pYnL0snh6BwcgW/kkZ1KMFH7WmNxieQKNMEvHbhw4umVkC1sa9YjjTAmk3emsrkpaYWnwrPc/+f1e57Tx8+zBdx122+a1ExAorN5hCfiJ7Cggx9ZX8rga/xrMPsoECD6PYp9jkYrwJHs9G4ggGAgSOOg0QDtDwPmv08+fVpW1mbLtGlbvix/UHq+f++x7V5uC7IaPd7IgGhzX2f9zY1NH7N/ZGIw6+HCZN4nXXy85CnDT7TMn8ybkkBm0h834odEssn62AROwWiZYeNSq+j6+hKG6xcoOjxJ30ED/ZMC/AIBDv46BK1/3ODlsTSPBa+vBuxqNRJx6jKz/vx31SKeYfb6GY4NvM+drYLAYVQLZ2FghMotySO3QuOf4ee2gEyj8tMO8RNSI5C/K+szM1+kf/98vy3LqOwaIBDxGsbR8TtbEU+vtK54bg4MY4ORUmjCYdhhApJGqzt1CpJuPa9lhbjT9kxzpt2GCfyA9vhWBEUPURD9ZQixsZ0YUdZr5JTTqQIdf/22/nbh7f7bD16Ap7/06LL+8t+XLKSQQ2hYJLcy5IFRFLAPjj1c5LjQ8SESYmDpvBomIZG1D/1UsEW2pY7H40alM2fV79CYITw42FN67t3bSdil1Pod+GHSQ0lGBheD0W+V9RF+SH7oeTyiU1I2M+nV1U849Ul0zbdfvrvP06qqDgSg8aqGk2xNo0lXDV2KLVbXBNcMFwQXDJPSMtIxTyQjNKmMgfRECZiK/JS/MSq2MAWy8zNnoGsILw3gHJj+kEf63Ls5fpwoHOGczZzNOYanjQdX9EkP/P4QAOcCaBB6l4lz55euL53Ou86Y7Jq2nK62hz1g9yHtYwIa+zwjPd2ioeTmivLp8vKRfCgu1C6bpkkImrfiyBH4y5dHEff6+EmNMCNNfBmdBQh4+kzd1Nkb1SxuEW+K6mxUL7kycSzNs1kkauqzzsEANqzTij1+M3FHuAJeIQIv2w4VXDcA2aaA2g721NlXiZZXiRVaLhJVUlXpqaS6eA7as6sBfMQXMAEaKfAInLUA1sGPHFFNdc3wyoB1yBRoSmgj6tdvXieWgBJiOUIr0YBidUlxibBIkyiN9Yw+OaNV2+JCtGiFApsfHE+d1ACQfmVtuNAIxRgvwErW2lnfywIgJ76QwuSwOEyK40joyCcTX2Vd+PpHnmZSsWDZtczse/459V2OY6ECLlsPWHQC//jHIMRxoVnsFWPGLCkQlpgXJ8Dp+IJXMbNYt8RlBsBifHEcnIbTuPUothrGFxfbBLAJCvgX3LrUMrbdEXbdczTiQfxVDxobIxuRBW59lhPwhOGfiU0TR1MeZKP66TVr49ZIa6+h10gjTWgnzmG+B+HX3LO/vxpv2f8ipieIF4x6x6u2RAXFhmrtf+Pl2yqDowKSN0HKoOoiXoepERzW9FjMU9nI2MmWMq6IHdWEEAFSsrcr7OokRkTFxsdPqhLUiRixv6XKPk7O2U8hi1liMmXubQhgHLLQ0DxK4BILWg1cQ7OYB8/zoGn6H78phovvPM6Csx7fmfLJfPN4AQzunIHBJxhBrjtzbvO586svpMG1RseWNC1uAjfS4fQLq86fA5sXfT3azP21tHkppwVUH75jOQGw1R3K3ZHhDToLig42yoKLS4pBv4laPXTnzi6JBAM/2qCORtX4Y/sIDayJ7BRa3h6/uzcujg5jJJLBvpSorqvsW/LgpIH2CMIEkcMOUeYOinCoq+uweu7gyopEj8RhNfAAnRYjd0caG0d0I8JitYf6tXDkzoiQ4gjox143Av57FNEaYJECVXW+Pc+K/7f17c8EbErO+ii3WI/0SKm9yI6iURvlttgnPn0k5Sz4vkA1x+79cfGQSmZ1dpPxt9RkO29xNT9eU6oxCvkU23a8iT2RlbJFKX2nzMaJWVIlh5Z28ePX3XrsAfryZPoCMoh1lbqIxC4S1+dlTl5Yme/GlL0tx0PFvsAlpw8uOFhzvQQegUuuL+qo4HQJrNo0VL5Xvfc7fBuYW3xRy+Jw+TpgSavQCDL4/hn+mqf++6lIBl8jeMps42cIKHN8MC0XZsX5xHp7x/jETUBlY6z3yY5LNV7VXvHC6umBtfuPD/wIM5FcUkwr4aXxkh+AkO6mPSRhS/7mUlLETfFNUvOS+AUQAdYpjZvTnMNcFAkpntEe4REeUZ6pCQoXmVNai7ESU9Q3HqVTxCxCRJrBQqHo9GnIRJaTJ8UBGpRcmLiECu/N7o+GPDUxssfYJtJi4giZnxpNaJXbS/qPz6dZTPVID6yqSNlFets7ziUgzCJ5leXDPUxVrFeaiViIT3WLi3e9r3y3er5TeCqu2rcoJxTQDtGw3rdvhWlIy48xL/r93ppDfqLW1mqfFRK/id0sfycf68oiPVWjwDaHJx95XwzPS0k/2swd3zUXHjvH41748PjDBwKY+zj35IKEd/BY4fpr9g4rYTfYcLmAtEwbxP384Vkp6d9qgsO75qKj53mcCx+ezHne8uHDPxti3qGjResnHRyEImOzc5wFT5/lafnod46O7ybv+qvVtz62MNd9GB09wM1/+lGd72/5ztHh16kXcpns2dNmpwFg+EzI2TyJFj/PxX+XHfaG37+67lS6pHTzuqv3w89Llj0/F79Gi7/Nz6LdGrs19+3224fVw2LnoxNLtPNoNZx4gr/YmeV8Wt6yVY15/ga/+mdX9ijvPccC7Ivl6t1Fl+HtVfSIOMITcLHiKn1wFABXPu7eCj+ceT3zEN66mzfPXebtGEOIm34lSLNAw84xdyLAxwwKChYIMk2mCXGOMTLvvnLZ7mt2MnTsyG14ayd8+3Uu1LkVBlYSj5qcGhg/RG1ZNVyd8xDltQvgBTmOwkcQrs2BHmWFNSePPItt2TrHbQ+FfVbgNQ++Cy8YL7YsLo1P/LrrCnEDvOGR6jX8+pFwGB5Ow8MJJywnVH2w5UCL9zJjgqns8ePmINx6IDh4ZNhy2J/m3oX0KxlaXHs3e6EQ/g/+2anZ/i8yAYOXbxISuCQ5UUaUvmqFhXKSdEyRm8uxdMirsS2yLa6Jjy8oNsSYGM1dVGsRlV/q9Ws99j3NLfVRigH7W+Y5O11FWKVVTu/YSA+5Kt1EW7/zrkPCm5xdqvmmnLELbcfbjlRuPnyoqprsblt5Pr8rTazqYaDApH2pw5Lvzthx1s3tJkDydYprQplqGNYOl+EZVOZUBbXaZJ9d2LZi6oJraaq8f6901u7NGf8zb+xag4yls3iJnQSvT2bZ1pC5QMB5cOu+Q6dJni+PZOAOXnQs1K7rvbC7bdH5jt4Vmy60nei5uKMf5/vUYDKKvv3guSNNpyjZVgu2jfTWb3HNthgn3UKt2bpiC/rWzamslavqtlZva0td2QMKaQlid7mRCCFifZIR8QxCVF5omr84lhtuJjEdRO0kJBPjcvaxVojYqcnaog97ibrSeEus0k3qJpa5yFm7TWWZLLG7VBnSWkrO+2slBWWMCRUWzA9u4QsHLgj1CfgmP7qr5NYCQV6O8IgOvY9U/kp3SObJCouXlDQcE/bB+8cTSooX7yjeTnOTFrceoe2sTwO/PTHaoMweYKhOXFu90yMRUnx6QNIimeN2l3X/asF/xiQIi8oWB//JtJXh68Kf7ckSuC+QflfnLMy4k5Wb7J7jWUSpMJMSH7Z5KZARqAmRUyg/nbPJJo6faaz++qUu3ziec07ygpNsFcFa7CK2lVK/txP86k4TMl2SmQmJUetw67waj7z0pOeaFRhlGxWTMvr+Cj6xqzfE0EHOMyoz0prNc/MD/Eqzhu1st4a99+/F/xNBbYBKxXxZPXNx1GcsuCbUeX9JYW7xA5UTbDN0UkxXilyFQG2hZeVFh4gaUGFmUOLDXesg910yf1GVF47U4YtD927N0+ta83P1tgjdxpFC5SUM9GFSvTGpqRv01Lt363QbZdCJ6GgNk6GJfZua1MePr6tKpafq60J1PKf7XJHhBNX7ff5RI635QY7tWAQAovUf3OByP3+SP7n2C51KZfoYGdaogZkgSTAc+Ovu81fR0mePIAQa6Z5Np63iXwhn8MvKVzxQsLsaFkFQ4M9kx4CJwxuKd0/szhpkJu0/UzvSd3Ev6I4KlQ+2ZfQXXC+83r+MuiZ+VZNiP2Hz56nlUStiSt3yaOKWT4zwiU6xcm18AGEzCDAyAKiUUfFlGWVZ6UdtmPd3REBSxdcWi+ryLyu9P5Uewh2qje3M2SbbNkrVxeIOsj6qA9QC1ifcoTqnTtt6ZX1ck5O8XNj9vSWB4Cwo7Iak0HfNvLxgJGWe5vsgX3eh06spTz6eXN7zBUbuDunnRs0ubAHjWY3fqXl8zujVymdSD8s0Sw9pxTNL7H8PDpT3H/bg3xWPmoAFlISyUCW5ccWxHHGWkoodGz3TPYd8hjwykjM8ZOoRZ9SIF0uT3DiFAHAtpKKgkyAL0MT9AArdMR7bTcT12OxITnIy0kOD2E3OerH9TmVmEi9rKm9SHM6po9vWQL9l4LqLVdNhwUAzWxlVazbQlvX2ecv9kt604dX57hKNsL778MWP01nQc61PlZVO6iF1spiyd/l1oVma4K6iCzg6nuayTjQ8HXeheIMmODSrLv8dU8bqJPWcHq+Dp46zMdnOVDFXTHUmOI+z5FLFzixd6y4H9vEpGPBBf3ySXk7fafVk4+FNDpvKuj2x2imnJ+njtwTiGBGUbqzCJ0XOxnRTIhhmHn6VL2rVpUkZuYML1+njkfF9Q+2LBUmlPlXVOg456EjgkSBmPDbhHgG7KH7mLhFT2rDoYuY+estrbsUbXuWNAx+BluDkz8d6BYy3Q5cD1LsSjdhOkOs3BBdCQ1yE63feasb5fnLj71ab7CKU5EG1DCQ3cqf+FygIFdkyBPUGBf7BNgyOKrnOJsveSZO9PdcXqgp7L021+iHdg0PgnCAe9Bd+ZScc4krtk6mh9B0E8Cb68n4XOUZAX+ZTyqF0vwLy8vwNT5WQUdFTObR2G3LhkkiFwzaqE8JpM8yMhOkj2AhbqUZBkBOzDz4591dsqTdCAR5/zP5258Z6+VDbyQjTjLa0DYibaxR4OVliJcPuYQDZp4J6y+YiPzGBTO0CVmuV0GvBaCl4zkq5itMgnZPLArABNI6/XsdZId+oQauFpJBtXIRDmMP8+fZhjhHbHUzq5ZXC7CMct3OKx9lC0n7cu3rfZbW+GRm+dcv9EZ7Va9kt8+YpfAsm7TxQ0sDFOTlLAqWog0gJUgdJoUaA5EWGgBmVl0Tqpdra8PQGjgqMkg8SFBgkQx8qoUapRc/X2lzdzPfmoyuCxy/XxOiaMBFwkt80e0SDcq9OYlbmC01rssLNTmG/xf9m2jPamTz9gTjYmjeCQnDJtb39ae2zkOd+pnu0XWToglzfLsfl+IleEuov64HfaIudpKBAQn0ZT7X4+XwAEnBvPQUpfbjS4Zn4AXnIGWQkp4pS/mG8eiWP+5WUjHbV74MjyDU3b5D+tmPPWbuhis5KEoKUgeL+HgwLBgMRVxgl58UP30JVf9rkthWwUuKO2zgG7imuRAkioVxz1FHhbqFCAAsU7CmyP2GGABOSCa1yRSF/idH+vEJlYV7rLs3WRBNvWXGRcImdt/OWUJ+f4j7IuqBIk9lMFZy7y+faWPsp3/ileiKz8NH7t8yrclJznQROXCkv+zyxPsMSSkCCrCs7CwnPxbN8+Glc/xSLiCRJrDZhpOAlV1d2r+xw1XJH17V1iKvjctUuPzU5XgsgiYL+sH4BESkJbzfZT73y5oqcr+XpGVEH6vE6kUKTyCuWXvcVwgSblZjHVtYIeqyFx8UQ1E1E6J9I+vgGIpo4BtCRP9EhL9pKtG2szWfMV4Gd36qJKX+IfcyhbJTFiZB8Z4wLMteGHL80ocXIWItiYJxD80Ly/NAuULW1U0KTqoWEfQLQ31XH+AGSCIAUO1dfL4dyD2vYzWkpVVz4ELeUix1cH4cieOf2umQ3R0wSbKoCXLScCCxvcTH2z8WlBj+aewiCaNTwM1sVc+TNiAUwMiJqJpJ1h7IR483PMAoB129wlFjSr+uHQ+HYUpgGm3vZPMJGDaIZzlqHAd34feE0/MMB7rDig+PDxmCx+dhm7FvdsetZiQL+WFBxGMAsZoGgBLHfK94ZA3DiBbSyXOnYrgzfMokh2tK6q0/CMDtjNpod7myNkdj2ODdvsIUs7+A8ZCJpjek8bLYxpkuOebL1oMw0aOsHO1HOz1XKDdYbhv5njp3ow9agw7UTnR9baJzq28VI8d1Jzw/456AlNDRUL9O2VfVhpd4T21PJO31TGF0gQLzPTnG/fbsGjpgQkZJSWZSYapeZXoKTBUEg4tE/kTN4/EzkPysswADtvkpEEq/2ixT4nJ45zZ+s+kPh8uR0/Cj1R9Uk//TrxpMQF+mJ5ELkcJA3xP0b7TUBwY982Kwkc7Jt+Q6DZw8dcuIIT9pqmhbbfYY42ZJot2vFczdihamencaC83liz8a7MC/4yt7JpPLcN1bimvCt0CfGyysm81UkrkzqCXjwNswTjr4xQvOQCqxMklhozfhPyHuaAz/bwfX37A9b0JgNzONpz0s4z5Ab2dKcqythUjPG9m4k7m0v423v1xD6PjABPl7FjhHGsIdZDEOwZyvpWQTPigVp9Z+3rBlyphT7YTz4ODTJGVKmzuSDw5VWb1OwsPlgDMaUve2HTz7uMUYf4x6/8XUX3kq73SP0Ecnu1AFmPz78h2kuGvIz++feOjo/z4XoFUyJVrGgCipFYz0gHFxPiBOwtr9sRMh1vUSxNAj0yibgzl8doFTbvu3W0eVkE/EE2NHqOxhRAX82tnGrn9j5+A4cRX+gGxw+6sXHFFckaU+biH8ys3tYXT9q6JRkgLOzZH8bkKGloW/zP9NwoC6y2bdaRR9guHAM+trHSgnW0SgEPd3hNs7sHT0Dnu2tMM06PmqzOeAZarYVqYxIt7dUz1GEKpGutWC8+8Gmzne0r0FoXjt8ak9HkQ2tc9Qp0sBpBBFWZ2d7qejaXL0Zi+qILCkNAEfW0hKn8PjQCT6ZWGmC1yc3gzIsW1VyVoKmvfXXXoqsCDOY3o6a0w6tZUbb0DVu1d5NxVpzXwEqpCr1rLOWHG5L9m1VWxmLUxLVe4nSnGQ8vb0PFp0yEZ/p5upolFsY4oZq+VsUQAPWch95sXcpdda4H1FbBxI6W6ZfYQ2bGB2osW1WsXp2K61uijkKc69xmcdqm3rGztopiBV7KFVruo2u+4fsVjDI2r6lqbp1VoPvU+lhgXJpIpuG8pvN+aMyxvsbrIgYgkKCKf1NRE0Rqwd/DvQsk0YFZCoaVTfYdwq3n6lHj6wZKsZBolWTY6Uziu7v9MMmR34R2UFAocYEQR7sL1TblYwcNTXC/QJdD0cf7gGZ0iyqa8Hc1FyiavvKoEN/ATzE8sjw6yN74WoitTLMhWvtAJgODP50BxBDWrNJc8Ap7lCIon/DleyVFSwUDQmQdBZphHifbKCrmnB+6fqs/CE+rBwDUZ4NjZDOHMwnxjXptvBQ07x7y+jwYlURrIGSt2AGcUuJxKt1tIM81Wpt53oa4tTuuxw2JpBqlRzX0jauhMBMiqpRZRUKLdHFyRh1eLPbVkIt7FJiWrh8pdGuOquc7OhLlEbeOI8c7qs0l3Y4uZseIFdpbycAiThWy/4WIGnDndyp83qzi+nMrGht8TNqRBmtXiLbyVwGWnWycnk3T+qGt25JnulBD42gWIWhxhzdyb+j40g99LCOzLPIBX0Bi+l6TndGuZ4Ig3/3dN63UdASmru5nLapXCLrwU6RZnHrxCycyJChEY57S6XnRrbzaTmrIHfTBT6mphmQRb1CNY3wlDaoHxsK6KJF15Pk+rOojR2cKd5Ir90kVvCWhGiITgBdTVQr3DOUZDc0a3fS/fp6hnrbggrUWIX9PU5f2U/qIJ2PadvVWgkiqxRnxkpLLN12lCVFUcrF0VYcjSaP0kUQIxNeSTRTkmUdB/QZ0BU5nSx97ko0SrZ2NJpXNS2moiYY9HIsjeqmJqPv13AxZaME26UZos6jGWicFw32CcVijHecoYzVo2lldlAkodOurt4y/eCxF+I/DiZ528Y0I1I228pGW5NqmFNv8VbbV4QTpzGBSCidFuWa23lD8Vat7tDR3WIt0+OO6wk6n+LS82GaAzAAefhEtYl4tHOr1Ptqpn5VbewuL59KHV27T5fNMeDF68NiQmyiZoRoyl4R78o2fZoH54uRZR78DWuKBPB8vpnBFxruRss0DcaCANjRVWvafouUVioM3d39P01bsQEvtfDqAMuSJgD/7bcmY2XW/yKifPBWGtBWLIJpIADjnyZx7a52Tfdst7TNYEdv8UQit2GAMWBJGEDTRKsru9rtYW+CveFgohPheBv8fPkEM/yR1o3DameXsJnrbxgmexqmuf5VdrX/w97s18PB3HfD8U5te7MJVj87tAiUnLGLiThWdrvifFYfv3/5Rn7K0H93ya2/qEucY3br7V8nXlOl/p9PkVO/V2XDfSzm1c3HUc6jaX0cCHUdVNu9zYZLb73GsZw81xGgiGNYy1thhEYVD6/0z7by0XdffEO8SQY6o1e58BfSiXjvjJ21LbPyNURcZRsuGaWViFPenlLMYN3pLoxXCz3JstHjGnihAUFqLRBozT2bUzZG5dZ0COVL0C0z3nENv7q1QTACiUJj/szXwMXzR+5+7D+IMKGM4wVRkhVV0w3Tsh3X8yc969eASZrlRVnVzcRXNcmThgWnCivGiMam7eoUzWTKSmey9uzc/NRpXZd8YUK0Com///n3P2+ar8Kd7oRa0RO09V+u8QQAIRhBMZwgKZphOV4QJVlRNd0wp7P5Yrlam3Sz3e0Px9P5cr3dH8/X+/P9/UEIRlAMJ0iKZrq9/mA4Gk+ms/liuVpvtrv94Xg6X663++P5en++vz/L8YIoyYqq6YZp2Y4YGf/simYwWWwOl4eXD1/++EGECWUcL4iSrKiabpiW7bieH4RRnKRZXpRV3bRdP4zTvKzbDoAQjKAYTpAUzbAcL4iSrKiabpjfcfDPhON6fhBGcZJmeVFWddN2/TBO87Ju+3Fe9/N+f+cuXbt179GzV+8+fccFv6SAjc+VOKcs7xKuqIfBqHQlA4pt7JTj+y8wLGzCXFiGUHQm7TjMGNYgWmSb5Q0mqdwwJozPZHAoZjyMhIBG+0JLhhhn2Tt2sOW0RjjsGRGQLcTRFJqliSeWsgNPlZCM1OiwAbWWQSRWqcpYVdYKUdOyUHsobnAMOCTbsWY3xhjJOKXBFrOu9DrxaIOcD5dPlnaN0SArOKxbkl+Jy1bCWErBgtW8kI2vZaeUJL4qq2DHhdu3FkIyEZHfhLoR76RvYBbW0TIZZEvszkknBL9RBSOEQm6wlnKKWU5TS7QY0QZK2i9jYZDjMVLIDy487MDYbZTAK+VuGQDbhgiyV2EdbP+xWaNxkJjOdDcB6EYMSsJt/gJJd+xiX+WWk9BnMY6e2Ks6yRlpQfVRsvPt1BZj0ZqqmtuMsYonBDIF2mKpqZjCIfmieMmmO4QZzNLa34YprJZsXHhdtRB/UMGK2GuVuZpZgtZHy02ylhBLUiV6E7+2cf2qcFJQMmW2I+6Ehjnk2hAKQC3ayA34BgLQwCqCNeFU030FttPgGFARtMZ8474wOhwNQ0h9t4IisTBEqNQfzzl2wqhRthmDbIeTgFmesVLMAadeHEgrSXqLSAu8vzreQFcglew1XhXCyYMN6VtdwCms+LZlAKR2ovRcjMXi8EoY7ChnOnbM/5+R2DWvwkZJuAMUUN2w/YKoFHzq3nw/JaJdoxi0OWL/3Jwk4Pj/73+0cRcelUlfg24N+rZGTKmi+4psJ6gL6p+FW8OCL/Tn5z+Vfklei1/ZhaQkqslaT73gBo0XGo2iCfjq+XNdWgRSKlnNbK8LugDyGWfxBnHp3VYb01+GdkERMNH92oADmlMo0Bw53DEUcU4QDe7gakYIqJXtJ/xw94+SXkHH2tXrad5/tqrc+hVSNL1FLrN5CGrG+IY8H7rJBHx3OL53pLuwQngXYSmnCmFFme8zqDrhtJHyLHSdE6iA2QxIVCV2NTYLqMZW0K4ItxAC4Bu4X6mFhWA8RG2zGF9tjUUMKmom1husjYPCDAlLYfuxlcraKbMXXcDhKYSKgAE3JMK5Fw4qEZocSY9kgM9tyYrRQcP/+TdZ+e4zcC0ViZepibvw5de//lXlqECh15/P0oSAxy1P5bEoUAvbAnZKDzWNMfSMH6Elumoxy0YJx4cxiPE9rCjb6DwOGKijrOKtZiaQ8V64E7Dmgv2LuNKQ8fnbb3+SRjB62YmdB7lAUoyUlsKRXQu6oCWV2GCBXhi3mh03iLbUx4pj4yJ7Bn5oF1lhl3zmqCA9EvBPkTfaR764RJc6zkn3lpTGz1Kr2go4poh9lRonViXXIRJeyNcKNyy5AjuTJXmqO3nL41Q50AxchtBBDZMdV1z5JnIKYNeOM30kn+EE2x8+fpvwKSMbHGD7bax/+XmQkw9do+sC1l66oCxPutBrXgl4vgx5pB9/fPvXuH1syO4+XPJ0ALs8X6BPYOkpB3w1VjqbwZM9Iew4aAnYbo45ZN+Hfa025Jl4GOKGY6El1Bn7Dj6E8SIusEFkYvcDttxSDsd7AS9AyUt+ur0UwO7boX0n+ACKXUF7Tl5e7vwmK6WaBYGH5G3cBQE+ljJyCfUDXPZMPZZG3y0nbGGj2jN9zfmJBwIZF7ObgQPSw4fc1+5RcCfIZzC9v/VSCiJ+doevUWEXkA5dY8yStXNaU1U8U8APh55oTIUzEpj/hBj3SCHPyGMY51bi2voaRKf6CB5S4DV891RhNM1Uin+GwOK1Z3qfDV6RAgzTtGs2wsXNKytSdfL0zut+lPE5M6KVosJmJ7B7N2vlR4oIuJxdG2knJhkImQ7jnxpyU5LFHPf0UTi7ds0gK0Zir2aJyZxGKJiq7O/kSqtxJNMMVl6NiKEHEozAhG8ArL5DGmDXFtSsQSN9otkdSAtTpmJl53kORMIednf2rPDVgf/Yx/vO3keJDkt0jv3SeFm9miiZLdrGCuSJgIe3X4jgKs54CzFVK+rgzS6RBd6QqlLf+b7D9xutN27vkLYjTqn3uMmqf0sjEPfI3WbHKzhsm8KUwOF0buF0X9+npBUlMhCt69Syz4lpHRRGop/4GibVjmnh2HFPcozmEOCV2L223msuxDlxI18lE7mNbo62QyzitxZr0axAjLFBRV/vRSFnj72Vu9ZtMV+lSjpIp4ZGoDVRSscakp8Fom2Dc3QBUurJ/VKoP//yNz/3sa+SkQW7ziBglW44UG6a+3j4ouJ5qt5eVr+WNk+BWqoZxZTQTBn/ET/3J59rHbgKNc0htS08k3fPBq7vQ8fxIONdSoU82LyeOReyA5c0fKUOTgXjb8jaNBkmBiE4aoWxlG/kE1Y1n+vkMhUWHMAVYyWQ/sZqzslTxdny02k78t3TaXXumm2WIwMXATu1g5LPAFyDK4fPyMMgXKSbc29t/BnYH0Uru/PQf2h495lPK55SgFJ2IDuB1JkWrQLPWex8liXL3QNXhwyvgtpqxZtYDOdDgJ/IBoYlnOgxdyffQv90bOOzNFL5Tj5DJTnYETE/+hEGama14ALyfhcf8hCAg0ohZoFPqTC5scnTTBhzDma9zr/FjglMNGXgU0hM5ri3zrF3D3L3dCLDGHos4PHIWC2QDbWFyQGpshAHUuVIZ6lanFf+ag7MunqRqQC4RrNGCTWOnBQjbx5j8f/AtskTvMNmHoUJUStYWpQkP3BnFE4I0fiO7itGcipa6ZLVH1W3WVAbLKcaD8laeAdbds+iZWyLe61J3NE0sYxCzXQOLgXPOFUZftYy/WMsrGU5dxphQ4G6ufPc8iVcJ6ixwYYZacQhv1X1AH6VIo8dcNguAB/e77Ue15J/eGy7a61wW8GCB7iz4xrkyNL5ZiYtbSjYohNsYxew8Zg6uZEan8TYHuaaVJym2pOY5a++sTNyZ04ISRdtxuvxiAQPaFR3qCNjFrZVrtf6Es7rCwAAAA==") format("woff2");
}

.iconfont-MSP {
  font-family: "iconfont-MSP" !important;
  font-size: 16px;
  font-style: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.MSP-shanchu:before {
  content: "\e816";
}

.MSP-sousuo:before {
  content: "\e660";
}

.MSP-safetycertificate:before {
  content: "\e807";
}

.MSP-insurance:before {
  content: "\e808";
}

.MSP-bulb:before {
  content: "\e809";
}

.MSP-bell:before {
  content: "\e80b";
}

.MSP-rest:before {
  content: "\e80d";
}

.MSP-funnelplot:before {
  content: "\e80e";
}

.MSP-lock:before {
  content: "\e80f";
}

.MSP-customerservice:before {
  content: "\e810";
}

.MSP-moneycollect:before {
  content: "\e814";
}

.MSP-medicinebox:before {
  content: "\e815";
}

.MSP-folder-add:before {
  content: "\e817";
}

.MSP-calendar-check:before {
  content: "\e81c";
}

.MSP-calendar:before {
  content: "\e81d";
}

.MSP-scan1:before {
  content: "\e81e";
}

.MSP-select:before {
  content: "\e81f";
}

.MSP-boxplot:before {
  content: "\e820";
}

.MSP-sliders:before {
  content: "\e822";
}

.MSP-laptop:before {
  content: "\e823";
}

.MSP-camera:before {
  content: "\e824";
}

.MSP-gateway:before {
  content: "\e825";
}

.MSP-cloud-server:before {
  content: "\e828";
}

.MSP-cloud-upload:before {
  content: "\e829";
}

.MSP-wifi:before {
  content: "\e82b";
}

.MSP-key:before {
  content: "\e82e";
}

.MSP-highlight:before {
  content: "\e82f";
}

.MSP-percentage:before {
  content: "\e831";
}

.MSP-pushpin:before {
  content: "\e832";
}

.MSP-phone:before {
  content: "\e833";
}

.MSP-shake:before {
  content: "\e834";
}

.MSP-wrench:before {
  content: "\e836";
}

.MSP-scissor:before {
  content: "\e837";
}

.MSP-mr:before {
  content: "\e838";
}

.MSP-fork:before {
  content: "\e83b";
}

.MSP-fullscreen:before {
  content: "\e83e";
}

.MSP-fullscreen-exit:before {
  content: "\e83f";
}

.MSP-sort-descending:before {
  content: "\e840";
}

.MSP-sort-ascending:before {
  content: "\e841";
}

.MSP-fall:before {
  content: "\e843";
}

.MSP-swap:before {
  content: "\e844";
}

.MSP-stock:before {
  content: "\e846";
}

.MSP-unorderedlist:before {
  content: "\e848";
}

.MSP-orderedlist:before {
  content: "\e849";
}

.MSP-align-right:before {
  content: "\e84a";
}

.MSP-align-center:before {
  content: "\e84b";
}

.MSP-align-left:before {
  content: "\e84c";
}

.MSP-pic-center:before {
  content: "\e84d";
}

.MSP-pic-right:before {
  content: "\e84e";
}

.MSP-bold:before {
  content: "\e850";
}

.MSP-font-colors:before {
  content: "\e851";
}

.MSP-exclaimination:before {
  content: "\e852";
}

.MSP-font-size:before {
  content: "\e853";
}

.MSP-infomation:before {
  content: "\e854";
}

.MSP-line-height:before {
  content: "\e855";
}

.MSP-strikethrough:before {
  content: "\e856";
}

.MSP-underline:before {
  content: "\e857";
}

.MSP-number:before {
  content: "\e858";
}

.MSP-italic:before {
  content: "\e859";
}

.MSP-code:before {
  content: "\e85a";
}

.MSP-check:before {
  content: "\e85c";
}

.MSP-dash:before {
  content: "\e85e";
}

.MSP-line:before {
  content: "\e85f";
}

.MSP-rollback:before {
  content: "\e860";
}

.MSP-bg-colors:before {
  content: "\e861";
}

.MSP-crown:before {
  content: "\e862";
}

.MSP-gift:before {
  content: "\e864";
}

.MSP-stop:before {
  content: "\e865";
}

.MSP-fire:before {
  content: "\e867";
}

.MSP-thunderbolt:before {
  content: "\e868";
}

.MSP-zoomout:before {
  content: "\e899";
}

.MSP-audio:before {
  content: "\e89b";
}

.MSP-zoomin:before {
  content: "\e89d";
}

.MSP-bug:before {
  content: "\e8e8";
}

.MSP-audiostatic:before {
  content: "\e8e9";
}

.MSP-login:before {
  content: "\e8ef";
}

.MSP-swap-right:before {
  content: "\e8f1";
}

.MSP-swap-left:before {
  content: "\e8f2";
}

.MSP-plus:before {
  content: "\e8fe";
}

.MSP-clear:before {
  content: "\e900";
}

.MSP-collapse1:before {
  content: "\e901";
}

.MSP-expand1:before {
  content: "\e903";
}

.MSP-deletecolumn:before {
  content: "\e904";
}

.MSP-merge-cells:before {
  content: "\e905";
}

.MSP-rotate-left:before {
  content: "\e906";
}

.MSP-rotate-right:before {
  content: "\e907";
}

.MSP-insertrowbelow:before {
  content: "\e908";
}

.MSP-insertrowabove:before {
  content: "\e909";
}

.MSP-table1:before {
  content: "\e90a";
}

.MSP-solit-cells:before {
  content: "\e90b";
}

.MSP-insertrowright:before {
  content: "\e90d";
}

.MSP-formatpainter-fill:before {
  content: "\e90e";
}

.MSP-insertrowleft:before {
  content: "\e910";
}

.MSP-translate:before {
  content: "\e911";
}

.MSP-deleterow:before {
  content: "\e912";
}

.MSP-sisternode:before {
  content: "\e913";
}

.MSP-Field-number:before {
  content: "\e914";
}

.MSP-Field-String:before {
  content: "\e915";
}

.MSP-Function:before {
  content: "\e917";
}

.MSP-Field-time:before {
  content: "\e918";
}

.MSP-Partition:before {
  content: "\e919";
}

.MSP-Storedprocedure:before {
  content: "\e91b";
}

.MSP-Console-SQL:before {
  content: "\e91c";
}

.MSP-icon-test:before {
  content: "\e91d";
}

.MSP-aim:before {
  content: "\e91e";
}

.MSP-compress:before {
  content: "\e91f";
}

.MSP-expend:before {
  content: "\e920";
}

.MSP-folder-view:before {
  content: "\e921";
}

.MSP-file-GIF:before {
  content: "\e922";
}

.MSP-group:before {
  content: "\e923";
}

.MSP-View:before {
  content: "\e925";
}

.MSP-shortcut:before {
  content: "\e926";
}

.MSP-ungroup:before {
  content: "\e927";
}

.MSP-check-circle:before {
  content: "\e77d";
}

.MSP-CI:before {
  content: "\e77f";
}

.MSP-compass:before {
  content: "\e780";
}

.MSP-frown:before {
  content: "\e781";
}

.MSP-plus-circle:before {
  content: "\e783";
}

.MSP-trademark:before {
  content: "\e784";
}

.MSP-down-square:before {
  content: "\e796";
}

.MSP-left-square:before {
  content: "\e79a";
}

.MSP-play-square:before {
  content: "\e79b";
}

.MSP-codelibrary:before {
  content: "\e79d";
}

.MSP-minus-square:before {
  content: "\e79e";
}

.MSP-plus-square:before {
  content: "\e79f";
}

.MSP-wallet:before {
  content: "\e7a0";
}

.MSP-border:before {
  content: "\e7a9";
}

.MSP-border-outer:before {
  content: "\e7aa";
}

.MSP-border-top:before {
  content: "\e7ab";
}

.MSP-border-bottom:before {
  content: "\e7ac";
}

.MSP-border-left:before {
  content: "\e7ad";
}

.MSP-border-right:before {
  content: "\e7af";
}

.MSP-border-inner:before {
  content: "\e7c3";
}

.MSP-border-verticle:before {
  content: "\e7ca";
}

.MSP-border-horizontal:before {
  content: "\e7cd";
}

.MSP-radius-bottomleft:before {
  content: "\e7cf";
}

.MSP-radius-bottomright:before {
  content: "\e7d0";
}

.MSP-radius-upleft:before {
  content: "\e7d6";
}

.MSP-radius-upright:before {
  content: "\e7db";
}

.MSP-radius-setting:before {
  content: "\e7dc";
}

.MSP-adduser:before {
  content: "\e7dd";
}

.MSP-deleteteam:before {
  content: "\e7eb";
}

.MSP-deleteuser:before {
  content: "\e7ed";
}

.MSP-addteam:before {
  content: "\e7ee";
}

.MSP-areachart:before {
  content: "\e7f1";
}

.MSP-linechart:before {
  content: "\e7f2";
}

.MSP-barchart:before {
  content: "\e7f3";
}

.MSP-pointmap:before {
  content: "\e7f5";
}

.MSP-database:before {
  content: "\e7f7";
}

.MSP-sever:before {
  content: "\e7f8";
}

.MSP-tablet:before {
  content: "\e7fa";
}

.MSP-file-image:before {
  content: "\e800";
}

.MSP-file-markdown:before {
  content: "\e801";
}

.MSP-file-unknown:before {
  content: "\e802";
}

.MSP-securityscan:before {
  content: "\e805";
}

.MSP-propertysafety:before {
  content: "\e806";
}

.MSP-liuzhuan:before {
  content: "\e669";
}

.MSP-shrink1:before {
  content: "\e668";
}

.MSP-icon_665:before {
  content: "\e666";
}

.MSP-detail:before {
  content: "\e793";
}

.MSP-link:before {
  content: "\e7ec";
}

.MSP-huahewu1:before {
  content: "\e880";
}

.MSP-zhili:before {
  content: "\e845";
}

.MSP-a-kangti2:before {
  content: "\e667";
}

.MSP-archive:before {
  content: "\e698";
}

.MSP-anticlockwise-2-line:before {
  content: "\e763";
}

.MSP-arrow-go-back-fill:before {
  content: "\e74d";
}

.MSP-tubiao-zhexiantu:before {
  content: "\eb96";
}

.MSP-team:before {
  content: "\e7b1";
}

.MSP-tuichu:before {
  content: "\e6bd";
}

.MSP-Abstract_xinghao_asterisk:before {
  content: "\e6c3";
}

.MSP-deng:before {
  content: "\e787";
}

.MSP-ai_editor:before {
  content: "\e661";
}

.MSP-chat_new:before {
  content: "\e662";
}

.MSP-forward:before {
  content: "\e8ee";
}

.MSP-type-:before {
  content: "\e65f";
}

.MSP-duoxuan2:before {
  content: "\e65d";
}

.MSP-yidongshu:before {
  content: "\e65b";
}

.MSP-shijian:before {
  content: "\e65c";
}

.MSP-remix-icons-line-business-calendar-todo-line:before {
  content: "\e691";
}

.MSP-info:before {
  content: "\e83d";
}

.MSP-jiantou:before {
  content: "\e65e";
}

.MSP-huojian:before {
  content: "\e74b";
}

.MSP-tag:before {
  content: "\e7ea";
}

.MSP-yufangcuoshi:before {
  content: "\e656";
}

.MSP-renwu-1:before {
  content: "\e657";
}

.MSP-daiban:before {
  content: "\e658";
}

.MSP-huiyi:before {
  content: "\e659";
}

.MSP-fengxian:before {
  content: "\e65a";
}

.MSP-renwu:before {
  content: "\e654";
}

.MSP-hangdongjihua:before {
  content: "\e655";
}

.MSP-a-DNAsequence:before {
  content: "\e651";
}

.MSP-a-AAsequence:before {
  content: "\e652";
}

.MSP-Oligo:before {
  content: "\e653";
}

.MSP-library_add_check-o:before {
  content: "\e74a";
}

.MSP-icon_tupianbianji:before {
  content: "\e664";
}

.MSP-ELN-wendingxingshiyanguanli:before {
  content: "\e650";
}

.MSP-ELN-wendingxingquyang:before {
  content: "\e64f";
}

.MSP-expand:before {
  content: "\e64d";
}

.MSP-collapse:before {
  content: "\e64e";
}

.MSP-ELN-yedanguan:before {
  content: "\e64a";
}

.MSP-ELN-huojia:before {
  content: "\e64b";
}

.MSP-ELN-diwenbingxiang:before {
  content: "\e64c";
}

.MSP-zhedietubiao:before {
  content: "\e649";
}

.MSP-danger_or_warning:before {
  content: "\e648";
}

.MSP-a-biaoge-zhankaishouqishang:before {
  content: "\e63e";
}

.MSP-a-biaoge-zhankaishouqixia:before {
  content: "\e640";
}

.MSP-biaoge-paixushengxu:before {
  content: "\e641";
}

.MSP-biaoge-shaixuan:before {
  content: "\e643";
}

.MSP-biaoge-xiala:before {
  content: "\e644";
}

.MSP-biaoge-zhankaishouqi:before {
  content: "\e645";
}

.MSP-biaoge-paixujiangxu:before {
  content: "\e646";
}

.MSP-biaoge-paixumoren:before {
  content: "\e647";
}

.MSP-ELN-shiyanwuse:before {
  content: "\e63d";
}

.MSP-a-tubiao1:before {
  content: "\e63c";
}

.MSP-shiyanwuliao-kongbanlei2:before {
  content: "\e63b";
}

.MSP-shiyanwuliao-jiazi1:before {
  content: "\e63a";
}

.MSP-shiyanwuliao-kongbanlei1:before {
  content: "\e638";
}

.MSP-shiyanwuliao-jiazi:before {
  content: "\e639";
}

.MSP-share:before {
  content: "\e7e8";
}

.MSP-shiyanwuliao-kongbanlei:before {
  content: "\e637";
}

.MSP-shiyanwuliao-putonglei:before {
  content: "\e636";
}

.MSP-shiyan-rukuguanli1:before {
  content: "\e633";
}

.MSP-mobile:before {
  content: "\e7b2";
}

.MSP-yiqi-shebeikuguanli:before {
  content: "\e632";
}

.MSP-shiyanjiluben-yangpin:before {
  content: "\e61c";
}

.MSP-bofang1:before {
  content: "\e62c";
}

.MSP-zanting:before {
  content: "\e635";
}

.MSP-tingzhi:before {
  content: "\e67d";
}

.MSP-guanbi:before {
  content: "\e642";
}

.MSP-yiqi-baoyangguanli1:before {
  content: "\e62f";
}

.MSP-yiqi-baofeiguanli1:before {
  content: "\e630";
}

.MSP-yiqi-xiaoyanguanli1:before {
  content: "\e631";
}

.MSP-yiqi-shebeipeizhi1:before {
  content: "\e622";
}

.MSP-yiqi-jichupeizhi1:before {
  content: "\e627";
}

.MSP-yiqi-shebeitaizhang:before {
  content: "\e628";
}

.MSP-yiqi-shenjirizhi1:before {
  content: "\e629";
}

.MSP-yiqi-weixiuguanli1:before {
  content: "\e62b";
}

.MSP-yiqi-shiyongjilu1:before {
  content: "\e62d";
}

.MSP-yiqi-shebeidengji1:before {
  content: "\e62e";
}

.MSP-yiqi-baoyangguanli:before {
  content: "\e626";
}

.MSP-yiqi-shebeitaizhang1:before {
  content: "\e625";
}

.MSP-yiqi-shebeidengji:before {
  content: "\e61b";
}

.MSP-yiqi-xiaoyanguanli:before {
  content: "\e61d";
}

.MSP-yiqi-shenjirizhi:before {
  content: "\e61e";
}

.MSP-yiqi-weixiuguanli:before {
  content: "\e61f";
}

.MSP-yiqi-jichupeizhi:before {
  content: "\e620";
}

.MSP-yiqi-shiyongjilu:before {
  content: "\e621";
}

.MSP-yiqi-baofeiguanli:before {
  content: "\e623";
}

.MSP-yiqi-shebeipeizhi:before {
  content: "\e624";
}

.MSP-shiyan-xibaokuguanli:before {
  content: "\e610";
}

.MSP-shiyan-kucunguanli:before {
  content: "\e612";
}

.MSP-shiyan-xibaopeizhi:before {
  content: "\e615";
}

.MSP-shiyan-rukuguanli:before {
  content: "\e617";
}

.MSP-shiyan-baofeiguanli:before {
  content: "\e618";
}

.MSP-shiyan-tuikuguanli:before {
  content: "\e61a";
}

.MSP-shiyan-shenjirizhi:before {
  content: "\e616";
}

.MSP-shiyan-shenlingguanli:before {
  content: "\e619";
}

.MSP-shiyan-wuliaocangkuguanli:before {
  content: "\e609";
}

.MSP-shiyan-xibaoguanli:before {
  content: "\e60a";
}

.MSP-shiyan-rongyepeizhi:before {
  content: "\e60e";
}

.MSP-shiyan-didingyeguanli:before {
  content: "\e611";
}

.MSP-shiyan-jichupeizhi:before {
  content: "\e613";
}

.MSP-shiyan-wuliaopeizhi:before {
  content: "\e614";
}

.MSP-filter-fill:before {
  content: "\e866";
}

.MSP-check-box-outline-bl:before {
  content: "\ec58";
}

.MSP-check_box_px_rounded:before {
  content: "\edaf";
}

.MSP-biaoqian:before {
  content: "\e696";
}

.MSP-IPguangchang:before {
  content: "\e607";
}

.MSP-audit:before {
  content: "\e7cc";
}

.MSP-gongsidanwei:before {
  content: "\e684";
}

.MSP-mubiao:before {
  content: "\e62a";
}

.MSP-expand-down:before {
  content: "\e60c";
}

.MSP-expand-up:before {
  content: "\e60d";
}

.MSP-column-width:before {
  content: "\e7fd";
}

.MSP-file-exclamation:before {
  content: "\e7c9";
}

.MSP-fund:before {
  content: "\e7e6";
}

.MSP-message1:before {
  content: "\e78a";
}

.MSP-warning-circle:before {
  content: "\e785";
}

.MSP-error:before {
  content: "\e7e5";
}

.MSP-file-ppt:before {
  content: "\e7c2";
}

.MSP-image:before {
  content: "\e7e4";
}

.MSP-data-lock:before {
  content: "\e60b";
}

.MSP-api:before {
  content: "\e7e3";
}

.MSP-desktop:before {
  content: "\e842";
}

.MSP-shrink:before {
  content: "\e7e9";
}

.MSP-quanping:before {
  content: "\e63f";
}

.MSP-box:before {
  content: "\e8b5";
}

.MSP-folder1:before {
  content: "\e7d1";
}

.MSP-folder-open:before {
  content: "\e7d4";
}

.MSP-file-word:before {
  content: "\e7c8";
}

.MSP-xibaocells:before {
  content: "\e634";
}

.MSP-container:before {
  content: "\e7b0";
}

.MSP-line-box:before {
  content: "\e749";
}

.MSP-menu:before {
  content: "\e7f4";
}

.MSP-file-text:before {
  content: "\e7c1";
}

.MSP-printer:before {
  content: "\e7da";
}

.MSP-edit1:before {
  content: "\e7e2";
}

.MSP-ellipsis:before {
  content: "\e7fc";
}

.MSP-dashboard:before {
  content: "\e78b";
}

.MSP-hourglass:before {
  content: "\e7c6";
}

.MSP-iconset0470:before {
  content: "\e75d";
}

.MSP-info-circle:before {
  content: "\e77e";
}

.MSP-reloadtime:before {
  content: "\e789";
}

.MSP-right-square:before {
  content: "\e799";
}

.MSP-nav1:before {
  content: "\e608";
}

.MSP-Import:before {
  content: "\e792";
}

.MSP-block:before {
  content: "\e7e0";
}

.MSP-shiguan:before {
  content: "\e7c0";
}

.MSP-anniu:before {
  content: "\e690";
}

.MSP-danhangshurukuang:before {
  content: "\e692";
}

.MSP-duoxuan:before {
  content: "\e693";
}

.MSP-danxuan:before {
  content: "\e694";
}

.MSP-duohangshurukuang:before {
  content: "\e695";
}

.MSP-fuhao-ziti:before {
  content: "\e747";
}

.MSP-sync:before {
  content: "\e786";
}

.MSP-web:before {
  content: "\e606";
}

.MSP-scan:before {
  content: "\e605";
}

.MSP-table:before {
  content: "\e7de";
}

.MSP-attachment:before {
  content: "\e7e1";
}

.MSP-pic-left:before {
  content: "\e7f6";
}

.MSP-filedone:before {
  content: "\e7bf";
}

.MSP-cloud:before {
  content: "\e7d9";
}

.MSP-cangchucangku:before {
  content: "\e98c";
}

.MSP-chayan:before {
  content: "\e98d";
}

.MSP-fapiao:before {
  content: "\e98e";
}

.MSP-fenbushi:before {
  content: "\e98f";
}

.MSP-fuwuqi:before {
  content: "\e990";
}

.MSP-fenzhi:before {
  content: "\e991";
}

.MSP-fengfuduoyuan:before {
  content: "\e992";
}

.MSP-haxi:before {
  content: "\e993";
}

.MSP-jishufuwu:before {
  content: "\e994";
}

.MSP-jiangben:before {
  content: "\e995";
}

.MSP-jiekoupeizhi:before {
  content: "\e996";
}

.MSP-jianguanfengkong:before {
  content: "\e997";
}

.MSP-jingquezhunque:before {
  content: "\e998";
}

.MSP-kuaisugaoxiao:before {
  content: "\e999";
}

.MSP-lianjie:before {
  content: "\e99a";
}

.MSP-linghuokuozhan:before {
  content: "\e99b";
}

.MSP-qukuai:before {
  content: "\e99c";
}

.MSP-notemodel:before {
  content: "\e99d";
}

.MSP-quanqiukuajing:before {
  content: "\e99e";
}

.MSP-shijianzhouqi:before {
  content: "\e99f";
}

.MSP-shijianchuo:before {
  content: "\e9a0";
}

.MSP-shuzihua:before {
  content: "\e9a1";
}

.MSP-suyuan:before {
  content: "\e9a2";
}

.MSP-shujuku:before {
  content: "\e9a3";
}

.MSP-wendingkekao:before {
  content: "\e9a4";
}

.MSP-xinyongkayinhangka:before {
  content: "\e9a5";
}

.MSP-shenfenshibierenzheng:before {
  content: "\e9a6";
}

.MSP-xingnengjisuan:before {
  content: "\e9a7";
}

.MSP-shujujianguan:before {
  content: "\e9a8";
}

.MSP-zhengzhaozhizhao:before {
  content: "\e9a9";
}

.MSP-zhinengheyue:before {
  content: "\e9aa";
}

.MSP-yaowan:before {
  content: "\e818";
}

.MSP-fenlei:before {
  content: "\e811";
}

.MSP-baogao:before {
  content: "\e812";
}

.MSP-kuaidi:before {
  content: "\e813";
}

.MSP-youzhi:before {
  content: "\e819";
}

.MSP-wujisu:before {
  content: "\e81a";
}

.MSP-yichuan:before {
  content: "\e601";
}

.MSP-control:before {
  content: "\e795";
}

.MSP-cluster:before {
  content: "\e7d7";
}

.MSP-CodeSandbox:before {
  content: "\e87e";
}

.MSP-codepen:before {
  content: "\e87f";
}

.MSP-apartment:before {
  content: "\e898";
}

.MSP-yingjian:before {
  content: "\ec89";
}

.MSP-filesearch:before {
  content: "\e7be";
}

.MSP-experiment:before {
  content: "\e7c4";
}

.MSP-trophy:before {
  content: "\e7c5";
}

.MSP-rocket:before {
  content: "\e7ce";
}

.MSP-carryout:before {
  content: "\e7d3";
}

.MSP-gold:before {
  content: "\e7df";
}

.MSP-robot:before {
  content: "\e897";
}

.MSP-index:before {
  content: "\e90f";
}

.MSP-project:before {
  content: "\e798";
}

.MSP-piechart:before {
  content: "\e78e";
}

.MSP-setting:before {
  content: "\e78f";
}

.MSP-save1:before {
  content: "\e791";
}

.MSP-layout:before {
  content: "\e794";
}

.MSP-user:before {
  content: "\e7ae";
}

.MSP-book:before {
  content: "\e7b3";
}

.MSP-reconciliation:before {
  content: "\e7b4";
}

.MSP-file-exception:before {
  content: "\e7b5";
}

.MSP-filesync:before {
  content: "\e7b6";
}

.MSP-solution:before {
  content: "\e7b7";
}

.MSP-fileprotect:before {
  content: "\e7b8";
}

.MSP-file-add:before {
  content: "\e7b9";
}

.MSP-file-excel:before {
  content: "\e7ba";
}

.MSP-file-pdf:before {
  content: "\e7bb";
}

.MSP-file2:before {
  content: "\e7bc";
}

.MSP-file-zip:before {
  content: "\e7bd";
}

.MSP-filter:before {
  content: "\e7c7";
}

.MSP-flag:before {
  content: "\e7cb";
}

.MSP-deploymentunit:before {
  content: "\e7d2";
}

.MSP-build:before {
  content: "\e7d5";
}

.MSP-read:before {
  content: "\e7d8";
}

.MSP-branches:before {
  content: "\e7e7";
}

.MSP-switchuser:before {
  content: "\e8ea";
}

.MSP-appstoreadd:before {
  content: "\e8eb";
}

.MSP-formatpainter:before {
  content: "\e902";
}

.MSP-Report:before {
  content: "\e916";
}

.MSP-icon_left:before {
  content: "\edb0";
}

.MSP-icon_down:before {
  content: "\edb1";
}

.MSP-icon_right:before {
  content: "\e728";
}

.MSP-icon_off:before {
  content: "\e729";
}

.MSP-icon_up:before {
  content: "\e72a";
}


/* === 11-scientific-data-detail.custom.css === */
/* ============================================================
   11. scientific-data-detail — 页面级 custom 样式
   唯一不可替代的部分：K 浮动助手按钮
   令牌：全部 --mingdu-*（来自 variables.css）；不写硬编码颜色
   命名空间：sci-（避免与 mingdu-* 官方类冲突，便于后续 PR 标注）
   ============================================================ */

/* ---- 浮动按钮 ---- */
.sci-float-btn {
  position: fixed;
  right: var(--mingdu-space-md);
  bottom: var(--mingdu-space-md);
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--mingdu-text-heading);
  color: var(--mingdu-text-inverse);
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  box-shadow: var(--mingdu-shadow-lg);
  z-index: var(--mingdu-z-dropdown);
  transition: transform var(--mingdu-fast) var(--mingdu-ease-out),
              box-shadow var(--mingdu-fast) var(--mingdu-ease-out),
              background var(--mingdu-fast) var(--mingdu-ease-out);
}
.sci-float-btn:hover {
  transform: scale(1.08);
  box-shadow: var(--mingdu-shadow-xl);
  background: var(--mingdu-primary);
}
.sci-float-btn:focus-visible {
  outline: 2px solid var(--mingdu-primary);
  outline-offset: 2px;
}

/* ---- 按下脉冲反馈 ---- */
.sci-float-btn--pulse {
  transform: scale(0.92);
  box-shadow: var(--mingdu-shadow);
}

/* ---- 减少动效 ---- */
@media (prefers-reduced-motion: reduce) {
  .sci-float-btn,
  .sci-float-btn--pulse {
    transition-duration: 0.01ms !important;
    transform: none !important;
  }
}



</style>
</head>
<body>

<!-- ============================================================
     1. 顶栏（复用 07/08 壳层标准头）
     ============================================================ -->
<header class="mingdu-header mingdu-header-demo">
  <button class="mingdu-header__menu-btn" data-mingdu-toggle-nav aria-label="菜单"><i class="iconfont-MSP MSP-menu"></i></button>
  <a class="mingdu-header__brand" href="#">
    <img class="mingdu-header__logo-img" src="data:image/png;base64,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" alt="Mingdu">
  </a>
  <span class="mingdu-header__brand-sub">企业版 · 科学数据</span>
  <div class="mingdu-header__search">
    <i class="iconfont-MSP MSP-sousuo"></i>
    <input type="text" placeholder="搜索..." />
  </div>
  <div class="mingdu-header__right">
    <button class="mingdu-header__text-btn">审批 <span class="mingdu-header__demo-badge">5</span></button>
    <button class="mingdu-header__text-btn">发起审批</button>
    <button class="mingdu-header__icon-btn" aria-label="应用切换"><i class="iconfont-MSP MSP-appstoreadd"></i></button>
    <button class="mingdu-header__icon-btn" aria-label="帮助"><i class="iconfont-MSP MSP-question"></i></button>
    <button class="mingdu-header__icon-btn mingdu-header__dot-btn" aria-label="通知，567条未读">
      <i class="iconfont-MSP MSP-bell"></i>
      <span class="mingdu-header__demo-badge">567</span>
    </button>
    <div class="mingdu-header__user">
      <span class="mingdu-avatar mingdu-avatar-sm">郑</span>
      <span>郑小伟</span>
      <i class="iconfont-MSP MSP-icon_down" style="font-size:12px;opacity:0.75"></i>
    </div>
  </div>
</header>

<!-- ============================================================
     2. 主体壳层：导轨 + 二级菜单 + 详情分栏
     ============================================================ -->
<div class="mingdu-app-shell">
  <div class="mingdu-sidebar-backdrop"></div>

  <!-- 图标导轨（对应原 app-icon-rail） -->
  <nav class="mingdu-rail-nav mingdu-rail-nav--wide" aria-label="主导航">
    <div class="mingdu-rail-nav__item" data-nav="register"><i class="iconfont-MSP MSP-database"></i><span class="mingdu-rail-nav__label">注册</span></div>
    <div class="mingdu-rail-nav__item" data-nav="compound"><i class="iconfont-MSP MSP-huahewu1"></i><span class="mingdu-rail-nav__label">化合物</span></div>
    <div class="mingdu-rail-nav__item" data-nav="synthesis"><i class="iconfont-MSP MSP-branches"></i><span class="mingdu-rail-nav__label">工艺线</span></div>
    <div class="mingdu-rail-nav__item" data-nav="ip"><i class="iconfont-MSP MSP-safetycertificate"></i><span class="mingdu-rail-nav__label">IP路线</span></div>
    <div class="mingdu-rail-nav__item mingdu-rail-nav__item--active" data-nav="sequence"><i class="iconfont-MSP MSP-a-DNAsequence"></i><span class="mingdu-rail-nav__label">序列</span></div>
    <div class="mingdu-rail-nav__item" data-nav="antibody"><i class="iconfont-MSP MSP-a-kangti2"></i><span class="mingdu-rail-nav__label">抗体库</span></div>
    <div class="mingdu-rail-nav__item" data-nav="product"><i class="iconfont-MSP MSP-box"></i><span class="mingdu-rail-nav__label">产品库</span></div>
    <div class="mingdu-rail-nav__item" data-nav="settings"><i class="iconfont-MSP MSP-setting"></i><span class="mingdu-rail-nav__label">基础设置</span></div>
    <div class="mingdu-rail-nav__item" data-nav="audit" style="margin-top:auto"><i class="iconfont-MSP MSP-edit1"></i><span class="mingdu-rail-nav__label">审计日志</span></div>
  </nav>

  <!-- 二级侧边栏（对应原 app-sub-sider） -->
  <nav class="mingdu-sidebar-nav mingdu-tree-nav" aria-label="科学数据注册">
    <div class="mingdu-nav-header">
      <span class="mingdu-nav-header__title">科学数据注册</span>
    </div>
    <div class="mingdu-nav-search">
      <i class="iconfont-MSP MSP-sousuo"></i>
      <input type="search" placeholder="搜索...">
    </div>
    <div class="mingdu-nav-group">
      <div class="mingdu-nav-group__header">自定义</div>
      <div class="mingdu-nav-item">Antigen Protein</div>
      <div class="mingdu-nav-item">Antibody Complex</div>
      <div class="mingdu-nav-item mingdu-nav-item--active">Antibody Purifured</div>
      <div class="mingdu-nav-item">Cell</div>
      <div class="mingdu-nav-item">Expression Batch</div>
    </div>
    <div class="mingdu-nav-group">
      <div class="mingdu-nav-group__header">DNA</div>
      <div class="mingdu-nav-item">DNA</div>
      <div class="mingdu-nav-item">Chain DNA</div>
      <div class="mingdu-nav-item">Plasmid</div>
    </div>
    <div class="mingdu-nav-group">
      <div class="mingdu-nav-group__header">RNA</div>
      <div class="mingdu-nav-item">mRNA</div>
    </div>
    <div class="mingdu-nav-group">
      <div class="mingdu-nav-group__header">氨基酸</div>
      <div class="mingdu-nav-item">Chain AA</div>
      <div class="mingdu-nav-item">Heavy Chain AA</div>
      <div class="mingdu-nav-item">Light Chain AA</div>
      <div class="mingdu-nav-item">Target</div>
    </div>
  </nav>

  <!-- 主工作区：详情分栏（mingdu-detail-split） -->
  <main class="mingdu-detail-split" data-mingdu-detail-stack data-mingdu-detail-stack-breakpoint="1199" style="height:calc(100vh - var(--mingdu-header-height))">

    <!-- 左侧：实体元数据 -->
    <div class="mingdu-detail-meta mingdu-detail-meta--sidebar">
      <div class="mingdu-detail-meta__scroll">

        <!-- 实体头部 -->
        <div class="mingdu-detail-meta__head mingdu-detail-meta__head--toolbar">
          <div class="mingdu-detail-meta__head-main">
            <div class="mingdu-detail-meta__icon mingdu-detail-meta__icon--round"><i class="iconfont-MSP MSP-a-kangti2"></i></div>
            <div>
              <div class="mingdu-detail-meta__name">Antibody-Purifured-001</div>
              <div class="mingdu-detail-meta__id">编号：PRJ001-20260408-012-001</div>
            </div>
          </div>
          <a href="#" class="mingdu-link mingdu-detail-meta__edit"><i class="iconfont-MSP MSP-edit1" aria-hidden="true"></i> 编辑</a>
        </div>

        <!-- 元数据三列网格 -->
        <div class="mingdu-meta-grid mingdu-meta-grid--cols3" role="list">
          <div class="mingdu-meta-field" role="listitem">
            <div class="mingdu-meta-field__label">名称</div>
            <div class="mingdu-meta-field__value">Antibody-Purifured-001</div>
          </div>
          <div class="mingdu-meta-field" role="listitem">
            <div class="mingdu-meta-field__label">编号</div>
            <div class="mingdu-meta-field__value">PRJ001-20260408-012-001</div>
          </div>
          <div class="mingdu-meta-field" role="listitem">
            <div class="mingdu-meta-field__label">所属项目</div>
            <div class="mingdu-meta-field__value"><span class="mingdu-tag mingdu-tag-default">PRJ001</span></div>
          </div>
          <div class="mingdu-meta-field" role="listitem">
            <div class="mingdu-meta-field__label">所属部门</div>
            <div class="mingdu-meta-field__value"><span class="mingdu-tag mingdu-tag-default">明度智云</span></div>
          </div>
          <div class="mingdu-meta-field" role="listitem">
            <div class="mingdu-meta-field__label">创建人</div>
            <div class="mingdu-meta-field__value">明度系统管理员</div>
          </div>
          <div class="mingdu-meta-field" role="listitem">
            <div class="mingdu-meta-field__label">创建时间</div>
            <div class="mingdu-meta-field__value">2026-04-17 13:55:54</div>
          </div>
          <div class="mingdu-meta-field" role="listitem">
            <div class="mingdu-meta-field__label">对象类型</div>
            <div class="mingdu-meta-field__value"><span class="mingdu-tag mingdu-tag-default">自定义</span></div>
          </div>
          <div class="mingdu-meta-field" role="listitem">
            <div class="mingdu-meta-field__label">数据共享</div>
            <div class="mingdu-meta-field__value mingdu-meta-field__value--tags">—</div>
          </div>
          <div class="mingdu-meta-field" role="listitem">
            <div class="mingdu-meta-field__label">状态</div>
            <div class="mingdu-meta-field__value">
              <span class="mingdu-status-tag mingdu-status-tag--success">有效</span>
            </div>
          </div>
        </div>

        <!-- 实体属性表 -->
        <div class="mingdu-detail-meta__sections">
          <div class="mingdu-section-card">
            <div class="mingdu-section-card__head">
              <span class="mingdu-section-card__title">Antibody Purifured</span>
              <a href="#" class="mingdu-link"><i class="iconfont-MSP MSP-edit1" aria-hidden="true"></i> 编辑</a>
            </div>
            <div class="mingdu-section-card__body">
              <div class="mingdu-table-wrap">
                <table class="mingdu-table mingdu-table--compact mingdu-table--bordered mingdu-attr-table">
                  <thead>
                    <tr><th scope="col">属性</th><th scope="col">值</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Protein Complex(Parent)</td>
                      <td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-a-kangti2" aria-hidden="true"></i> AB-256</span></td>
                    </tr>
                    <tr><td>Total Volume(mL)</td><td>5.6</td></tr>
                    <tr><td>Date Produced</td><td>2026-04-08</td></tr>
                    <tr><td>Purity(%)</td><td class="text-tertiary">—</td></tr>
                    <tr><td>Concentration(μg/mL)</td><td>4239</td></tr>
                    <tr><td>图示</td><td class="text-tertiary">—</td></tr>
                    <tr><td>附件</td><td class="text-tertiary">—</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- 右侧：标签页 + 关联数据 -->
    <div class="mingdu-detail-panels">
      <div class="mingdu-inner-tabs" data-mingdu-tabs="detail">
        <button type="button" class="mingdu-inner-tabs__item mingdu-inner-tabs__item--meta-slot" data-mingdu-tab="meta">元数据</button>
        <button type="button" class="mingdu-inner-tabs__item mingdu-inner-tabs__item--active" data-mingdu-tab="results">关联结果</button>
        <button type="button" class="mingdu-inner-tabs__item" data-mingdu-tab="materials">关联物料</button>
      </div>

      <div class="mingdu-inner-tab-body mingdu-detail-meta__tab-body" data-mingdu-tab-panel="detail" data-mingdu-tab-panel-key="meta" hidden></div>

      <!-- 关联结果：三个 section-card -->
      <div class="mingdu-inner-tab-body" data-mingdu-tab-panel="detail" data-mingdu-tab-panel-key="results">

        <div class="mingdu-section-card">
          <div class="mingdu-section-card__head">
            <span class="mingdu-section-card__title">Binding Assay</span>
            <button type="button" class="mingdu-btn mingdu-btn-text" aria-label="展开"><i class="iconfont-MSP MSP-arrows-alt"></i></button>
          </div>
          <div class="mingdu-section-card__body">
            <div class="mingdu-table-wrap">
              <table class="mingdu-table mingdu-table--compact">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Sample</th>
                    <th scope="col">EC50</th>
                    <th scope="col">Attachment</th>
                    <th scope="col">Creator</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>1</td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-a-kangti2" aria-hidden="true"></i> AB023-001</span></td><td class="text-tertiary">—</td><td><a class="mingdu-table__link"><i class="iconfont-MSP MSP-file"></i> 20260408-001.csv</a></td><td>明度系统管理员</td></tr>
                  <tr><td>2</td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-a-kangti2" aria-hidden="true"></i> AB023-002</span></td><td class="text-tertiary">—</td><td><a class="mingdu-table__link"><i class="iconfont-MSP MSP-file"></i> 20260408-002.csv</a></td><td>明度系统管理员</td></tr>
                  <tr><td>3</td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-a-kangti2" aria-hidden="true"></i> AB023-003</span></td><td class="text-tertiary">—</td><td><a class="mingdu-table__link"><i class="iconfont-MSP MSP-file"></i> 20260408-003.csv</a></td><td>明度系统管理员</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="mingdu-section-card">
          <div class="mingdu-section-card__head">
            <span class="mingdu-section-card__title">Binding Kinetics</span>
            <button type="button" class="mingdu-btn mingdu-btn-text" aria-label="展开"><i class="iconfont-MSP MSP-arrows-alt"></i></button>
          </div>
          <div class="mingdu-section-card__body">
            <div class="mingdu-table-wrap">
              <table class="mingdu-table mingdu-table--compact">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Sample</th>
                    <th scope="col">Ligand loading Concentration</th>
                    <th scope="col">Dissociation Time(s)</th>
                    <th scope="col">Kd</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>1</td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-a-kangti2" aria-hidden="true"></i> AB023-001</span></td><td class="text-tertiary">—</td><td class="text-tertiary">—</td><td class="text-tertiary">—</td></tr>
                  <tr><td>2</td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-a-kangti2" aria-hidden="true"></i> AB023-002</span></td><td class="text-tertiary">—</td><td class="text-tertiary">—</td><td class="text-tertiary">—</td></tr>
                  <tr><td>3</td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-a-kangti2" aria-hidden="true"></i> AB023-003</span></td><td class="text-tertiary">—</td><td class="text-tertiary">—</td><td class="text-tertiary">—</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="mingdu-section-card">
          <div class="mingdu-section-card__head">
            <span class="mingdu-section-card__title">In Vitro EC50</span>
            <button type="button" class="mingdu-btn mingdu-btn-text" aria-label="展开"><i class="iconfont-MSP MSP-arrows-alt"></i></button>
          </div>
          <div class="mingdu-section-card__body">
            <div class="mingdu-table-wrap">
              <table class="mingdu-table mingdu-table--compact">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Cell Line</th>
                    <th scope="col">Antibody</th>
                    <th scope="col">Condition</th>
                    <th scope="col">Concentration(μg/mL)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>1</td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-xibaocells" aria-hidden="true"></i> CH001</span></td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-a-kangti2" aria-hidden="true"></i> AB023-001</span></td><td class="text-tertiary">—</td><td class="text-tertiary">—</td></tr>
                  <tr><td>2</td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-xibaocells" aria-hidden="true"></i> CH001</span></td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-a-kangti2" aria-hidden="true"></i> AB023-002</span></td><td class="text-tertiary">—</td><td class="text-tertiary">—</td></tr>
                  <tr><td>3</td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-xibaocells" aria-hidden="true"></i> CH001</span></td><td><span class="mingdu-entity-link"><i class="iconfont-MSP MSP-a-kangti2" aria-hidden="true"></i> AB023-003</span></td><td class="text-tertiary">—</td><td class="text-tertiary">—</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      <!-- 关联物料：空状态 -->
      <div class="mingdu-inner-tab-body" data-mingdu-tab-panel="detail" data-mingdu-tab-panel-key="materials" hidden>
        <div class="mingdu-empty">
          <div class="mingdu-empty-img" aria-hidden="true">
            <i class="iconfont-MSP" style="font-size:48px;color:var(--mingdu-text-quaternary)">∅</i>
          </div>
          <div class="mingdu-empty-desc">暂无关联物料数据</div>
        </div>
      </div>

    </div>

  </main>
</div>

<!-- ============================================================
     3. 浮动助手按钮（K）— 业务自定义，样式见 partials/11-scientific-data-detail.custom.css
     ============================================================ -->
<button class="sci-float-btn" type="button" aria-label="快捷助手">K</button>

<!-- ============================================================
     4. 页面交互：导轨激活 + 浮动按钮脉冲反馈
     （内嵌 Tabs 已由 js/mingdu.js 的 data-mingdu-tabs 接管）
     ============================================================ -->
<script>
(function () {
  'use strict';

  /* ---- 图标导轨激活态 ---- */
  document.querySelectorAll('.mingdu-rail-nav__item').forEach(function (item) {
    item.addEventListener('click', function () {
      document.querySelectorAll('.mingdu-rail-nav__item').forEach(function (i) {
        i.classList.remove('mingdu-rail-nav__item--active');
      });
      item.classList.add('mingdu-rail-nav__item--active');
    });
  });

  /* ---- 二级菜单选中态 ---- */
  document.querySelectorAll('.mingdu-sidebar-nav .mingdu-nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      document.querySelectorAll('.mingdu-sidebar-nav .mingdu-nav-item').forEach(function (i) {
        i.classList.remove('mingdu-nav-item--active');
      });
      item.classList.add('mingdu-nav-item--active');
    });
  });

  /* ---- 浮动按钮按下反馈 ---- */
  var fab = document.querySelector('.sci-float-btn');
  if (fab) {
    fab.addEventListener('click', function () {
      fab.classList.add('sci-float-btn--pulse');
      setTimeout(function () { fab.classList.remove('sci-float-btn--pulse'); }, 200);
    });
  }
})();
</script>
<script>
/**
 * Mingdu Design — Interactive Behaviors v1.0
 * Zero dependencies; works with file:// when opened locally
 */
(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  /* ---------- Theme ---------- */
  window.MingduTheme = {
    toggle: function () {
      var html = document.documentElement;
      var current = html.getAttribute('data-mingdu-theme') || 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-mingdu-theme', next);
      localStorage.setItem('mingdu-theme', next);
    },
    set: function (theme) {
      document.documentElement.setAttribute('data-mingdu-theme', theme);
      localStorage.setItem('mingdu-theme', theme);
    },
    init: function () {
      var saved = localStorage.getItem('mingdu-theme');
      if (saved) document.documentElement.setAttribute('data-mingdu-theme', saved);
    }
  };
  MingduTheme.init();

  /* ---------- Mobile Sidebar ---------- */
  var menuBtn = qs('[data-mingdu-toggle-nav]');
  var shell = qs('.mingdu-app-shell');

  function closeNav() {
    if (shell) shell.classList.remove('mingdu-app-shell--nav-open');
    var bd = qs('.mingdu-sidebar-backdrop');
    if (bd) bd.style.display = 'none';
  }

  function openNav() {
    if (shell) shell.classList.add('mingdu-app-shell--nav-open');
    var bd = qs('.mingdu-sidebar-backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.className = 'mingdu-sidebar-backdrop';
      document.body.appendChild(bd);
    }
    bd.style.display = 'block';
    bd.addEventListener('click', closeNav);
  }

  if (menuBtn && shell) {
    menuBtn.addEventListener('click', function () {
      shell.classList.contains('mingdu-app-shell--nav-open') ? closeNav() : openNav();
    });
  }
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1200) closeNav();
  });

  /* ---------- Tabs ---------- */
  qsa('[data-mingdu-tabs]').forEach(function (tabs) {
    var items = qsa('[data-mingdu-tab]', tabs);
    var panelId = tabs.getAttribute('data-mingdu-tabs');
    var panels = panelId ? qsa('[data-mingdu-tab-panel="' + panelId + '"]') : [];
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var key = item.getAttribute('data-mingdu-tab');
        items.forEach(function (i) {
          i.classList.remove(
            'mingdu-tabs-tab--active', 'mingdu-inner-tabs__item--active',
            'mingdu-drawer-tab--active', 'mingdu-registry-tabs__item--active'
          );
          if (i === item) {
            i.classList.add(
              'mingdu-tabs-tab--active', 'mingdu-inner-tabs__item--active',
              'mingdu-drawer-tab--active', 'mingdu-registry-tabs__item--active'
            );
          }
        });
        panels.forEach(function (p) {
          p.hidden = p.getAttribute('data-mingdu-tab-panel-key') !== key;
        });
      });
    });
  });

  /* ---------- Modal ---------- */
  qsa('[data-mingdu-open-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-mingdu-open-modal');
      var modal = document.getElementById(id);
      if (modal) modal.hidden = false;
    });
  });
  qsa('[data-mingdu-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var modal = btn.closest('.mingdu-modal-overlay');
      if (modal) modal.hidden = true;
    });
  });

  /* ---------- Drawer ---------- */
  qsa('[data-mingdu-close-drawer]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var d = btn.closest('.mingdu-drawer, .mingdu-drawer--in-page');
      if (d) d.classList.add('mingdu-drawer--closed');
    });
  });
  qsa('[data-mingdu-open-drawer]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-mingdu-open-drawer');
      var d = document.getElementById(id);
      if (d) d.classList.remove('mingdu-drawer--closed');
    });
  });

  /* ---------- Column Filter Popover ---------- */
  qsa('[data-mingdu-filter-trigger]').forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var pop = trigger.querySelector('.mingdu-popover-panel');
      if (!pop) return;
      qsa('.mingdu-popover-panel').forEach(function (p) {
        if (p !== pop) p.hidden = true;
      });
      pop.hidden = !pop.hidden;
    });
  });
  document.addEventListener('click', function () {
    qsa('.mingdu-popover-panel').forEach(function (p) { p.hidden = true; });
  });
  qsa('.mingdu-popover-panel').forEach(function (p) {
    p.addEventListener('click', function (e) { e.stopPropagation(); });
  });

  /* ---------- Floating layers (teleport to body, fixed position) ---------- */
  var FLOAT_Z = 2000;

  function mountFloatToBody(layer, owner) {
    if (!layer) return;
    layer.__mingduFloatOwner = owner;
    if (layer.parentElement === document.body) return;
    document.body.appendChild(layer);
    layer.setAttribute('data-mingdu-float-teleport', '1');
  }

  function unmountFloatFromBody(layer) {
    if (!layer || layer.parentElement !== document.body) return;
    var owner = layer.__mingduFloatOwner;
    if (owner) owner.appendChild(layer);
    layer.removeAttribute('data-mingdu-float-teleport');
    layer.style.position = '';
    layer.style.left = '';
    layer.style.top = '';
    layer.style.width = '';
    layer.style.maxWidth = '';
    layer.style.transform = '';
    layer.style.zIndex = '';
    layer.classList.remove('mingdu-float--below');
  }

  function positionFloatLayer(anchor, layer, opts) {
    opts = opts || {};
    var gap = opts.gap != null ? opts.gap : 8;
    var r = anchor.getBoundingClientRect();
    var w = layer.offsetWidth || 200;
    var h = layer.offsetHeight || 40;
    var placement = opts.placement || 'auto';
    var top;
    var left = r.left + (r.width - w) / 2;
    var placeBelow = placement === 'bottom';
    if (placement === 'auto' && r.top < h + gap + 12) placeBelow = true;
    if (placeBelow) {
      top = r.bottom + gap;
      layer.classList.add('mingdu-float--below');
    } else {
      top = r.top - h - gap;
      layer.classList.remove('mingdu-float--below');
    }
    if (top + h > window.innerHeight - 8 && r.top > h + gap + 12) {
      top = r.top - h - gap;
      layer.classList.remove('mingdu-float--below');
    }
    if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w - 8);
    if (left < 8) left = 8;
    layer.style.position = 'fixed';
    layer.style.left = left + 'px';
    layer.style.top = top + 'px';
    layer.style.transform = 'none';
    layer.style.zIndex = String(opts.zIndex != null ? opts.zIndex : FLOAT_Z);
  }

  function openFloatLayer(owner, layer, anchor, opts) {
    mountFloatToBody(layer, owner);
    layer.hidden = false;
    layer.classList.add('mingdu-float--open');
    positionFloatLayer(anchor, layer, opts);
  }

  function closeFloatLayer(owner, layer) {
    if (!layer) return;
    layer.classList.remove('mingdu-float--open');
    layer.hidden = true;
    unmountFloatFromBody(layer);
  }

  function repositionOpenFloatLayers() {
    qsa('.mingdu-tooltip-box.mingdu-float--open').forEach(function (box) {
      var wrap = box.__mingduFloatOwner;
      var trigger = wrap && (qs('.mingdu-tooltip-trigger', wrap) || wrap);
      if (trigger) positionFloatLayer(trigger, box, { zIndex: 1100 });
    });
    qsa('.mingdu-popconfirm-box.mingdu-float--open').forEach(function (box) {
      var pc = box.__mingduFloatOwner;
      var trigger = pc && (qs('.mingdu-btn', pc) || pc);
      if (trigger) positionFloatLayer(trigger, box, { placement: 'top' });
    });
    qsa('.mingdu-entity-preview.mingdu-float--open').forEach(function (tip) {
      var tag = tip.__mingduFloatOwner;
      if (tag) positionFloatLayer(tag, tip, { placement: 'bottom', zIndex: 1100 });
    });
  }

  /* ---------- Entity Link Hover Preview ---------- */
  qsa('[data-mingdu-entity-tag]').forEach(function (tag) {
    var tip = tag.querySelector('.mingdu-entity-preview');
    if (!tip) return;
    if (tag.getAttribute('data-mingdu-entity-bound')) return;
    tag.setAttribute('data-mingdu-entity-bound', '1');
    tip.hidden = true;
    tag.addEventListener('mouseenter', function () {
      openFloatLayer(tag, tip, tag, { placement: 'bottom', zIndex: 1100 });
    });
    tag.addEventListener('mouseleave', function () { closeFloatLayer(tag, tip); });
    tag.addEventListener('click', function (e) {
      if (window.matchMedia('(max-width: 991px)').matches) {
        e.preventDefault();
        if (tip.classList.contains('mingdu-float--open')) closeFloatLayer(tag, tip);
        else openFloatLayer(tag, tip, tag, { placement: 'bottom', zIndex: 1100 });
      }
    });
  });

  /* ---------- Tooltip ---------- */
  qsa('.mingdu-tooltip-wrap').forEach(function (wrap) {
    if (wrap.getAttribute('data-mingdu-tooltip-bound')) return;
    wrap.setAttribute('data-mingdu-tooltip-bound', '1');
    var trigger = qs('.mingdu-tooltip-trigger', wrap) || wrap;
    var box = qs('.mingdu-tooltip-box', wrap);
    if (!box) return;
    box.hidden = true;
    if (!box.id) box.id = 'mingdu-tip-' + Math.random().toString(36).slice(2, 9);
    trigger.setAttribute('aria-describedby', box.id);

    function showTip() {
      openFloatLayer(wrap, box, trigger, { placement: 'auto', zIndex: 1100 });
    }
    function hideTip() {
      closeFloatLayer(wrap, box);
    }

    wrap.addEventListener('mouseenter', showTip);
    wrap.addEventListener('mouseleave', hideTip);
    wrap.addEventListener('focusin', showTip);
    wrap.addEventListener('focusout', function (e) {
      if (!wrap.contains(e.relatedTarget)) hideTip();
    });
  });

  /* ---------- Popconfirm (hover to preview) ---------- */
  qsa('.mingdu-popconfirm').forEach(function (pc) {
    if (pc.getAttribute('data-mingdu-popconfirm-bound')) return;
    pc.setAttribute('data-mingdu-popconfirm-bound', '1');
    var box = qs('.mingdu-popconfirm-box', pc);
    if (!box) return;
    var trigger = qs('.mingdu-btn', pc) || pc.firstElementChild;
    if (!trigger) return;
    box.hidden = true;
    pc.addEventListener('mouseenter', function () {
      openFloatLayer(pc, box, trigger, { placement: 'top' });
    });
    pc.addEventListener('mouseleave', function () {
      closeFloatLayer(pc, box);
    });
  });

  /* ---------- Custom Select ---------- */
  function syncSelectArrow(select, isOpen) {
    var arrow = qs('.mingdu-select-arrow', select);
    if (!arrow) return;
    arrow.classList.remove(
      'MSP-icon_down', 'MSP-icon_up',
      'MSP-chevron-down', 'MSP-chevron-up'
    );
    arrow.classList.add(isOpen ? 'MSP-icon_up' : 'MSP-icon_down');
  }

  // Teleport dropdown 到 body，并用 position:fixed 定位，避免被父级 overflow 裁剪
  // 关键：维护 [data-teleported-from] 关系，关闭时直接从 document.body 找回孤儿 dropdown，
  //       避免 qs('.mingdu-select-dropdown', select) 在 dropdown 已脱离 select 时返回 null
  //       而导致"下拉浮层回收失败 / 宽度过宽"等 bug
  function positionSelectDropdown(select) {
    var dropdown = select.__mingduDropdown;
    var trigger = qs('.mingdu-select-trigger', select);
    if (!dropdown || !trigger) return;
    var r = trigger.getBoundingClientRect();
    var dropH = dropdown.offsetHeight || 240;
    // dropdown 默认与 trigger 等宽；如果 trigger 因 flex 撑得过宽，截到 360（保持视觉紧凑）
    var dropW = Math.min(Math.max(r.width, 140), 360);
    var top = r.bottom + 4;
    if (top + dropH > window.innerHeight - 8) {
      top = Math.max(8, r.top - dropH - 4);
    }
    var left = r.left;
    if (left + dropW > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - dropW - 8);
    }
    dropdown.style.position = 'fixed';
    dropdown.style.left = left + 'px';
    dropdown.style.top = top + 'px';
    dropdown.style.width = dropW + 'px';
    dropdown.style.maxWidth = '360px';
    dropdown.style.right = 'auto';
    dropdown.style.zIndex = '2000';
  }
  function mountSelectDropdownToBody(select) {
    var dropdown = qs('.mingdu-select-dropdown', select);
    if (!dropdown) return;
    if (dropdown.parentElement === document.body) return;
    document.body.appendChild(dropdown);
    dropdown.setAttribute('data-teleported-from', '1');
    select.__mingduDropdown = dropdown;
  }
  function unmountSelectDropdownFromBody(select) {
    var dropdown = select.__mingduDropdown || qs('.mingdu-select-dropdown', select);
    if (!dropdown) { select.__mingduDropdown = null; return; }
    if (dropdown.parentElement === document.body) {
      select.appendChild(dropdown);
    }
    dropdown.removeAttribute('data-teleported-from');
    dropdown.style.position = '';
    dropdown.style.left = '';
    dropdown.style.top = '';
    dropdown.style.width = '';
    dropdown.style.maxWidth = '';
    dropdown.style.right = '';
    dropdown.style.zIndex = '';
    select.__mingduDropdown = null;
  }

  // 关闭所有 select —— 同时处理"还在 select 内部"和"已 teleport 到 body 末尾"两种状态
  function closeAllSelects(except) {
    qsa('[data-mingdu-select]').forEach(function (sel) {
      if (except && sel === except) return;
      sel.classList.remove('mingdu-select--open');
      // 优先用 __mingduDropdown（确保能拿到 teleport 后的孤儿 dropdown）
      var drop = sel.__mingduDropdown || qs('.mingdu-select-dropdown', sel);
      var trig = qs('.mingdu-select-trigger', sel);
      if (drop) {
        drop.hidden = true;
        unmountSelectDropdownFromBody(sel);
      }
      if (trig) trig.setAttribute('aria-expanded', 'false');
      syncSelectArrow(sel, false);
    });
    // 兜底：扫描 body 末尾的孤儿 dropdown（防止某些边缘情况残留）
    qsa('[data-teleported-from="1"]').forEach(function (orphan) {
      var home = orphan.parentElement;
      // 找到原始 select
      var sel = qsa('[data-mingdu-select]').find(function (s) { return s.__mingduDropdown === orphan; });
      if (sel) {
        orphan.hidden = true;
        sel.classList.remove('mingdu-select--open');
        unmountSelectDropdownFromBody(sel);
      } else {
        // 没有任何 select 引用 —— 直接清掉 inline style + hidden
        orphan.hidden = true;
        orphan.removeAttribute('data-teleported-from');
        orphan.style.position = '';
        orphan.style.left = '';
        orphan.style.top = '';
        orphan.style.width = '';
        orphan.style.maxWidth = '';
        orphan.style.right = '';
        orphan.style.zIndex = '';
      }
    });
  }

  function selectOptionLabel(opt) {
    return opt.getAttribute('data-label') ||
      (qs('.mingdu-select-option-label', opt) || opt).textContent.trim();
  }

  function syncSelectTags(select) {
    var tagsEl = qs('.mingdu-select-tags', select);
    var placeholder = qs('.mingdu-select-placeholder', select);
    if (!tagsEl) return;
    var seen = {};
    var html = [];
    qsa('.mingdu-select-option--selected', select).forEach(function (opt) {
      var val = opt.getAttribute('data-value');
      if (!val || seen[val]) return;
      seen[val] = true;
      var label = selectOptionLabel(opt);
      html.push(
        '<span class="mingdu-select-tag" data-value="' + val +
        '"><span class="mingdu-select-tag-text">' + label +
        '</span><button type="button" class="mingdu-select-tag-remove" aria-label="移除 ' + label +
        '">&times;</button></span>'
      );
    });
    tagsEl.innerHTML = html.join('');
    select.classList.toggle('mingdu-select--has-value', html.length > 0);
    if (placeholder) placeholder.hidden = html.length > 0;
  }

  function filterSelectOptions(select, query) {
    var options = qsa('.mingdu-select-option', select);
    var empty = qs('.mingdu-select-empty', select);
    var visible = 0;
    options.forEach(function (opt) {
      var text = selectOptionLabel(opt).toLowerCase();
      var show = !query || text.indexOf(query) !== -1;
      opt.hidden = !show;
      opt.style.display = show ? '' : 'none';
      opt.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (show) visible++;
    });
    if (empty) empty.hidden = visible > 0;
  }

  qsa('[data-mingdu-select]').forEach(function (select) {
    if (select.getAttribute('data-mingdu-select-bound')) return;
    select.setAttribute('data-mingdu-select-bound', '1');

    var trigger = qs('.mingdu-select-trigger', select);
    var dropdown = qs('.mingdu-select-dropdown', select);
    var isMultiple = select.hasAttribute('data-mingdu-select-multiple');
    var isSearch = select.hasAttribute('data-mingdu-select-search');
    var searchInput = qs('.mingdu-select-search-input', select);
    var valueEl = qs('.mingdu-select-value', select);

    if (!trigger || !dropdown) return;

    syncSelectArrow(select, false);

    trigger.addEventListener('click', function (e) {
      if (select.classList.contains('mingdu-select--disabled')) return;
      e.stopPropagation();
      var willOpen = !select.classList.contains('mingdu-select--open');
      closeAllSelects();
      if (willOpen) {
        select.classList.add('mingdu-select--open');
        // 先显示再定位（offsetHeight 需要可见）
        dropdown.hidden = false;
        mountSelectDropdownToBody(select);
        positionSelectDropdown(select);
        trigger.setAttribute('aria-expanded', 'true');
        syncSelectArrow(select, true);
        if (searchInput) {
          searchInput.value = '';
          filterSelectOptions(select, '');
          searchInput.focus();
        }
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterSelectOptions(select, searchInput.value.trim().toLowerCase());
      });
      searchInput.addEventListener('keyup', function () {
        filterSelectOptions(select, searchInput.value.trim().toLowerCase());
      });
      searchInput.addEventListener('change', function () {
        filterSelectOptions(select, searchInput.value.trim().toLowerCase());
      });
      searchInput.addEventListener('compositionend', function () {
        filterSelectOptions(select, searchInput.value.trim().toLowerCase());
      });
      searchInput.addEventListener('click', function (e) { e.stopPropagation(); });
      searchInput.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Escape') closeAllSelects();
      });
    }

    qsa('.mingdu-select-option', select).forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        if (isMultiple) {
          opt.classList.toggle('mingdu-select-option--selected');
          syncSelectTags(select);
        } else {
          qsa('.mingdu-select-option', select).forEach(function (o) {
            o.classList.remove('mingdu-select-option--selected');
          });
          opt.classList.add('mingdu-select-option--selected');
          if (valueEl) {
            valueEl.textContent = selectOptionLabel(opt);
            valueEl.classList.remove('mingdu-select-value--placeholder');
          }
          select.classList.add('mingdu-select--has-value');
          closeAllSelects();
        }
      });
    });

    if (isMultiple) {
      select.addEventListener('click', function (e) {
        var rm = e.target.closest('.mingdu-select-tag-remove');
        if (!rm) return;
        e.preventDefault();
        e.stopPropagation();
        var tag = rm.closest('.mingdu-select-tag');
        var val = tag && tag.getAttribute('data-value');
        if (val) {
          var opt = qs('.mingdu-select-option[data-value="' + val + '"]', select);
          if (opt) opt.classList.remove('mingdu-select-option--selected');
        }
        syncSelectTags(select);
      });

      var raw = select.getAttribute('data-initial-selected');
      if (raw) {
        try {
          JSON.parse(raw).forEach(function (val) {
            var opt = qs('.mingdu-select-option[data-value="' + val + '"]', select);
            if (opt) opt.classList.add('mingdu-select-option--selected');
          });
        } catch (e) { /* ignore */ }
      }
      syncSelectTags(select);
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('.mingdu-datepicker__panel')) return;
    if (e.target.closest('.mingdu-cascader-panel')) return;
    if (e.target.closest('.mingdu-time-picker__panel')) return;
    if (e.target.closest('[data-mingdu-float-teleport]')) return;
    closeAllSelects();
    closeAllDatePickers();
    closeAllCascaders();
    closeAllTimePickers();
  });
  // 滚动/缩放时重新定位所有打开的浮层
  window.addEventListener('scroll', function () {
    qsa('[data-mingdu-select].mingdu-select--open').forEach(function (sel) {
      positionSelectDropdown(sel);
    });
    qsa('.mingdu-datepicker.mingdu-datepicker--open').forEach(function (dp) {
      positionDatePickerPanel(dp);
    });
    qsa('.mingdu-cascader.mingdu-cascader--open').forEach(function (cas) {
      positionCascaderPanel(cas);
    });
    qsa('.mingdu-time-picker.mingdu-time-picker--open').forEach(function (tp) {
      positionTimePickerPanel(tp);
    });
    repositionOpenFloatLayers();
  }, true);
  window.addEventListener('resize', function () {
    qsa('[data-mingdu-select].mingdu-select--open').forEach(function (sel) {
      positionSelectDropdown(sel);
    });
    qsa('.mingdu-datepicker.mingdu-datepicker--open').forEach(function (dp) {
      positionDatePickerPanel(dp);
    });
    qsa('.mingdu-cascader.mingdu-cascader--open').forEach(function (cas) {
      positionCascaderPanel(cas);
    });
    qsa('.mingdu-time-picker.mingdu-time-picker--open').forEach(function (tp) {
      positionTimePickerPanel(tp);
    });
    repositionOpenFloatLayers();
  });
  qsa('.mingdu-select-dropdown').forEach(function (drop) {
    drop.addEventListener('click', function (e) { e.stopPropagation(); });
  });

  /* ---------- InputTag ---------- */
  function createInputTag(text) {
    var span = document.createElement('span');
    span.className = 'mingdu-tag mingdu-tag-primary';
    span.appendChild(document.createTextNode(text + ' '));
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'mingdu-tag-close';
    close.setAttribute('aria-label', '删除 ' + text);
    close.innerHTML = '&times;';
    span.appendChild(close);
    return span;
  }

  qsa('[data-mingdu-tag-input]').forEach(function (wrap) {
    if (wrap.getAttribute('data-mingdu-tag-bound')) return;
    wrap.setAttribute('data-mingdu-tag-bound', '1');
    var input = qs('input', wrap);
    if (!input) return;
    var maxTags = parseInt(wrap.getAttribute('data-max-tags'), 10) || 5;

    function currentTags() {
      return qsa('.mingdu-tag', wrap).map(function (el) {
        return el.textContent.replace('脳', '').trim();
      }).filter(Boolean);
    }

    function addTagFromInput() {
      var text = (input.value || '').trim();
      if (!text) return;
      var tags = currentTags();
      if (tags.length >= maxTags) return;
      if (tags.indexOf(text) !== -1) {
        input.value = '';
        return;
      }
      wrap.insertBefore(createInputTag(text), input);
      input.value = '';
    }

    wrap.addEventListener('click', function () { input.focus(); });
    wrap.addEventListener('click', function (e) {
      var close = e.target.closest('.mingdu-tag-close');
      if (!close) return;
      e.preventDefault();
      var tag = close.closest('.mingdu-tag');
      if (tag) tag.remove();
      input.focus();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTagFromInput();
        return;
      }
      if (e.key === 'Backspace' && !input.value.trim()) {
        var tags = qsa('.mingdu-tag', wrap);
        var last = tags[tags.length - 1];
        if (last) last.remove();
      }
    });

    input.addEventListener('blur', addTagFromInput);
  });

  /* ---------- Date panel / Datepicker ---------- */
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function formatDateYMD(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }
  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
  function parseYMD(str) {
    if (!str) return null;
    var p = str.split('-');
    if (p.length !== 3) return null;
    return { y: +p[0], m: +p[1], d: +p[2] };
  }

  function parseRangeValue(str) {
    if (!str) return null;
    var parts = str.split('~').map(function (s) { return s.trim(); });
    if (parts.length !== 2) return null;
    if (!parseYMD(parts[0]) || !parseYMD(parts[1])) return null;
    return { start: parts[0], end: parts[1] };
  }

  function getDatePickerDrop(picker) {
    return picker.__mingduPanel || qs('.mingdu-datepicker__panel', picker);
  }

  function resolvePickerFromDatePanel(panel) {
    if (panel.__mingduPicker) return panel.__mingduPicker;
    var inPicker = panel.closest('[data-mingdu-datepicker]');
    if (inPicker) return inPicker;
    var drop = panel.parentElement;
    if (drop && drop.classList.contains('mingdu-datepicker__panel')) {
      var found = qsa('[data-mingdu-datepicker]').find(function (p) {
        return p.__mingduPanel === drop;
      });
      if (found) return found;
    }
    return null;
  }

  function setDatePickerExpanded(picker, open) {
    var trigger = qs('.mingdu-datepicker__trigger', picker);
    var input = qs('.mingdu-datepicker__input', picker);
    var val = open ? 'true' : 'false';
    if (trigger) trigger.setAttribute('aria-expanded', val);
    if (input) input.setAttribute('aria-expanded', val);
  }

  function renderDatePanel(panel) {
    var y = parseInt(panel.getAttribute('data-year'), 10);
    var m = parseInt(panel.getAttribute('data-month'), 10);
    if (!y || !m) {
      var now = new Date();
      y = now.getFullYear();
      m = now.getMonth() + 1;
      panel.setAttribute('data-year', y);
      panel.setAttribute('data-month', m);
    }
    var selected = panel.getAttribute('data-selected') || '';
    var titleEl = qs('.mingdu-date-panel__title', panel);
    var gridEl = qs('.mingdu-date-panel__grid', panel);
    if (!gridEl) return;
    if (titleEl) titleEl.textContent = y + ' / ' + m + ' / ';

    var today = new Date();
    var todayStr = formatDateYMD(today.getFullYear(), today.getMonth() + 1, today.getDate());
    var firstWd = new Date(y, m - 1, 1).getDay();
    var dim = daysInMonth(y, m);
    var prevM = m === 1 ? 12 : m - 1;
    var prevY = m === 1 ? y - 1 : y;
    var nextM = m === 12 ? 1 : m + 1;
    var nextY = m === 12 ? y + 1 : y;
    var dimPrev = daysInMonth(prevY, prevM);

    gridEl.innerHTML = '';
    for (var i = 0; i < 42; i++) {
      var cy = y, cm = m, day, muted = false;
      if (i < firstWd) {
        day = dimPrev - firstWd + i + 1;
        cy = prevY; cm = prevM; muted = true;
      } else if (i >= firstWd + dim) {
        day = i - firstWd - dim + 1;
        cy = nextY; cm = nextM; muted = true;
      } else {
        day = i - firstWd + 1;
      }
      var dateStr = formatDateYMD(cy, cm, day);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mingdu-date-panel__cell';
      btn.textContent = day;
      btn.setAttribute('data-date', dateStr);
      if (muted) btn.classList.add('mingdu-date-panel__cell--muted');
      if (dateStr === selected) {
        btn.classList.add('mingdu-date-panel__cell--selected');
        btn.setAttribute('aria-selected', 'true');
      }
      if (dateStr === todayStr && !muted) btn.classList.add('mingdu-date-panel__cell--today');
      var rangeEnd = panel.getAttribute('data-range-end');
      if (rangeEnd && dateStr === selected) btn.classList.add('mingdu-date-panel__cell--range-start');
      if (rangeEnd && selected && dateStr > selected && dateStr < rangeEnd) {
        btn.classList.add('mingdu-date-panel__cell--in-range');
      }
      if (rangeEnd && dateStr === rangeEnd) btn.classList.add('mingdu-date-panel__cell--range-end');
      if (panel.getAttribute('data-event-dates')) {
        try {
          JSON.parse(panel.getAttribute('data-event-dates')).forEach(function (d) {
            if (d === dateStr && !muted) {
              var dot = document.createElement('span');
              dot.className = 'mingdu-calendar-event-dot';
              dot.setAttribute('aria-hidden', 'true');
              btn.appendChild(dot);
            }
          });
        } catch (e) { /* ignore */ }
      }
      if (panel.getAttribute('data-disabled-dates')) {
        try {
          JSON.parse(panel.getAttribute('data-disabled-dates')).forEach(function (d) {
            if (d === dateStr) btn.classList.add('mingdu-date-panel__cell--disabled');
          });
        } catch (e) { /* ignore */ }
      }
      gridEl.appendChild(btn);
    }
  }

  function bindDatePanel(panel) {
    if (panel.getAttribute('data-mingdu-date-bound')) return;
    panel.setAttribute('data-mingdu-date-bound', '1');
    if (!panel.getAttribute('data-year')) {
      var now = new Date();
      panel.setAttribute('data-year', now.getFullYear());
      panel.setAttribute('data-month', now.getMonth() + 1);
    }
    renderDatePanel(panel);

    var prev = qs('.mingdu-date-panel__prev', panel);
    var next = qs('.mingdu-date-panel__next', panel);
    if (prev) {
      prev.addEventListener('click', function (e) {
        e.stopPropagation();
        var y = +panel.getAttribute('data-year');
        var m = +panel.getAttribute('data-month');
        m--;
        if (m < 1) { m = 12; y--; }
        panel.setAttribute('data-year', y);
        panel.setAttribute('data-month', m);
        renderDatePanel(panel);
      });
    }
    if (next) {
      next.addEventListener('click', function (e) {
        e.stopPropagation();
        var y = +panel.getAttribute('data-year');
        var m = +panel.getAttribute('data-month');
        m++;
        if (m > 12) { m = 1; y++; }
        panel.setAttribute('data-year', y);
        panel.setAttribute('data-month', m);
        renderDatePanel(panel);
      });
    }

    panel.addEventListener('click', function (e) {
      e.stopPropagation();
      var cell = e.target.closest('.mingdu-date-panel__cell');
      if (!cell || cell.disabled || cell.classList.contains('mingdu-date-panel__cell--disabled')) return;
      var dateStr = cell.getAttribute('data-date');
      if (!dateStr) return;
      var picker = resolvePickerFromDatePanel(panel);
      var isRange = panel.getAttribute('data-type') === 'daterange';
      var selected = panel.getAttribute('data-selected') || '';
      var rangeEnd = panel.getAttribute('data-range-end') || '';

      if (isRange) {
        if (!selected || rangeEnd) {
          panel.setAttribute('data-selected', dateStr);
          panel.removeAttribute('data-range-end');
          renderDatePanel(panel);
          if (picker) {
            var rangeInputStart = qs('.mingdu-datepicker__input', picker);
            if (rangeInputStart) rangeInputStart.value = dateStr + ' ~';
          }
          return;
        }

        var start = selected <= dateStr ? selected : dateStr;
        var end = selected <= dateStr ? dateStr : selected;
        panel.setAttribute('data-selected', start);
        panel.setAttribute('data-range-end', end);
        renderDatePanel(panel);
        if (picker) {
          var rangeInput = qs('.mingdu-datepicker__input', picker);
          if (rangeInput) rangeInput.value = start + ' ~' + end;
          closeDatePicker(picker);
        }
        return;
      }

      panel.setAttribute('data-selected', dateStr);
      renderDatePanel(panel);

      if (picker) {
        var input = qs('.mingdu-datepicker__input', picker);
        if (input) input.value = dateStr;
        closeDatePicker(picker);
      }
    });

    qsa('.mingdu-date-panel__shortcut', panel).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var offset = parseInt(btn.getAttribute('data-offset-days'), 10) || 0;
        var d = new Date();
        d.setDate(d.getDate() + offset);
        var dateStr = formatDateYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
        panel.setAttribute('data-selected', dateStr);
        panel.setAttribute('data-year', d.getFullYear());
        panel.setAttribute('data-month', d.getMonth() + 1);
        renderDatePanel(panel);
        var picker = resolvePickerFromDatePanel(panel);
        if (picker) {
          var input = qs('.mingdu-datepicker__input', picker);
          if (input) input.value = dateStr;
          closeDatePicker(picker);
        }
      });
    });
  }

  function closeDatePicker(picker) {
    picker.classList.remove('mingdu-datepicker--open');
    var panelDrop = getDatePickerDrop(picker);
    if (panelDrop) {
      panelDrop.hidden = true;
      unmountDatePickerPanelFromBody(picker);
    }
    setDatePickerExpanded(picker, false);
  }

  // Teleport datepicker panel 到 body 并 fixed 定位
  function positionDatePickerPanel(picker) {
    var panel = getDatePickerDrop(picker);
    var trigger = qs('.mingdu-datepicker__trigger', picker);
    if (!panel || !trigger) return;
    var r = trigger.getBoundingClientRect();
    var pH = panel.offsetHeight || 320;
    var pW = panel.offsetWidth || 280;
    var top = r.bottom + 4;
    if (top + pH > window.innerHeight - 8) {
      top = Math.max(8, r.top - pH - 4);
    }
    var left = r.left;
    if (left + pW > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - pW - 8);
    }
    panel.style.position = 'fixed';
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.width = pW + 'px';
    panel.style.right = 'auto';
    panel.style.zIndex = '2000';
  }
  function mountDatePickerPanelToBody(picker) {
    var panel = getDatePickerDrop(picker);
    if (!panel || panel.parentElement === document.body) return;
    document.body.appendChild(panel);
    panel.setAttribute('data-teleported-from', '1');
  }
  function unmountDatePickerPanelFromBody(picker) {
    var panel = getDatePickerDrop(picker);
    if (!panel || panel.parentElement !== document.body) return;
    picker.appendChild(panel);
    panel.removeAttribute('data-teleported-from');
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.width = '';
    panel.style.right = '';
    panel.style.zIndex = '';
  }

  function closeAllDatePickers() {
    qsa('[data-mingdu-datepicker].mingdu-datepicker--open').forEach(closeDatePicker);
  }

  qsa('[data-mingdu-datepicker]').forEach(function (picker) {
    if (picker.getAttribute('data-mingdu-datepicker-bound')) return;
    picker.setAttribute('data-mingdu-datepicker-bound', '1');
    var input = qs('.mingdu-datepicker__input', picker);
    var panelDrop = qs('.mingdu-datepicker__panel', picker);
    picker.__mingduPanel = panelDrop;
    var innerPanel = qs('[data-mingdu-date-panel]', picker);
    if (innerPanel) {
      innerPanel.__mingduPicker = picker;
      bindDatePanel(innerPanel);
    }

    function openPicker() {
      if (picker.classList.contains('mingdu-datepicker--disabled')) return;
      closeAllSelects();
      closeAllDatePickers();
      closeAllCascaders();
      picker.classList.add('mingdu-datepicker--open');
      if (panelDrop) {
        panelDrop.hidden = false;
        mountDatePickerPanelToBody(picker);
        positionDatePickerPanel(picker);
      }
      setDatePickerExpanded(picker, true);
      if (innerPanel && input && input.value) {
        if (innerPanel.getAttribute('data-type') === 'daterange') {
          var range = parseRangeValue(input.value);
          if (range) {
            var rp = parseYMD(range.start);
            innerPanel.setAttribute('data-year', rp.y);
            innerPanel.setAttribute('data-month', rp.m);
            innerPanel.setAttribute('data-selected', range.start);
            innerPanel.setAttribute('data-range-end', range.end);
            renderDatePanel(innerPanel);
          }
        } else {
          var p = parseYMD(input.value);
          if (p) {
            innerPanel.setAttribute('data-year', p.y);
            innerPanel.setAttribute('data-month', p.m);
            innerPanel.setAttribute('data-selected', input.value);
            renderDatePanel(innerPanel);
          }
        }
      }
    }

    if (input) {
      input.addEventListener('click', function (e) {
        e.stopPropagation();
        if (picker.classList.contains('mingdu-datepicker--open')) closeDatePicker(picker);
        else openPicker();
      });
    }
    if (panelDrop) panelDrop.addEventListener('click', function (e) { e.stopPropagation(); });
  });

  qsa('[data-mingdu-date-panel]').forEach(bindDatePanel);

  /* ---------- Cascader ---------- */
  function getCascaderPanel(cas) {
    return cas.__mingduCascaderPanel || qs('.mingdu-cascader-panel', cas);
  }

  function positionCascaderPanel(cas) {
    var panel = getCascaderPanel(cas);
    var trigger = qs('.mingdu-select-trigger', cas);
    if (!panel || !trigger) return;
    var r = trigger.getBoundingClientRect();
    var pH = panel.offsetHeight || 240;
    var pW = panel.offsetWidth || 280;
    var top = r.bottom + 4;
    if (top + pH > window.innerHeight - 8) top = Math.max(8, r.top - pH - 4);
    var left = r.left;
    if (left + pW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - pW - 8);
    panel.style.position = 'fixed';
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.marginTop = '0';
    panel.style.zIndex = String(FLOAT_Z);
  }

  function mountCascaderPanelToBody(cas) {
    var panel = getCascaderPanel(cas);
    if (!panel || panel.parentElement === document.body) return;
    document.body.appendChild(panel);
    panel.setAttribute('data-teleported-from', '1');
  }

  function unmountCascaderPanelFromBody(cas) {
    var panel = getCascaderPanel(cas);
    if (!panel || panel.parentElement !== document.body) return;
    cas.appendChild(panel);
    panel.removeAttribute('data-teleported-from');
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.marginTop = '';
    panel.style.zIndex = '';
  }

  function closeCascader(el) {
    el.classList.remove('mingdu-cascader--open');
    var panel = getCascaderPanel(el);
    if (panel) {
      panel.hidden = true;
      unmountCascaderPanelFromBody(el);
    }
    var trigger = qs('.mingdu-select-trigger', el);
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    syncSelectArrow(el, false);
  }

  function closeAllCascaders() {
    qsa('[data-mingdu-cascader].mingdu-cascader--open').forEach(closeCascader);
  }

  var CASCADER_CHILDREN = {
    huadong: [
      { text: '上海', label: '华东 / 上海' },
      { text: '杭州', label: '华东 / 杭州' },
      { text: '南京', label: '华东 / 南京' }
    ],
    huabei: [
      { text: '北京', label: '华北 / 北京' },
      { text: '天津', label: '华北 / 天津' }
    ],
    huanan: [
      { text: '广州', label: '华南 / 广州' },
      { text: '深圳', label: '华南 / 深圳' }
    ]
  };

  function fillCascaderSubmenu(cas, regionKey) {
    var sub = qs('.mingdu-cascader-menu[data-level="1"]', cas);
    if (!sub) return;
    var items = CASCADER_CHILDREN[regionKey] || [];
    sub.innerHTML = items
      .map(function (item) {
        return (
          '<li class="mingdu-cascader-node" data-leaf="true" data-label="' + item.label + '">' +
          item.text + '</li>'
        );
      })
      .join('');
    sub.hidden = items.length === 0;
    qsa('.mingdu-cascader-node', sub).forEach(function (node) {
      node.addEventListener('click', function (e) {
        e.stopPropagation();
        onCascaderLeafClick(cas, node);
      });
    });
  }

  function onCascaderLeafClick(cas, node) {
    var valueEl = qs('.mingdu-select-value', cas);
    if (valueEl) {
      valueEl.textContent = node.getAttribute('data-label') || node.textContent.trim();
      valueEl.classList.remove('mingdu-select-value--placeholder');
    }
    closeCascader(cas);
  }

  qsa('[data-mingdu-cascader]').forEach(function (cas) {
    if (cas.getAttribute('data-mingdu-cascader-bound')) return;
    cas.setAttribute('data-mingdu-cascader-bound', '1');
    var trigger = qs('.mingdu-select-trigger', cas);
    var panel = qs('.mingdu-cascader-panel', cas);
    cas.__mingduCascaderPanel = panel;
    var valueEl = qs('.mingdu-select-value', cas);
    if (!trigger || !panel) return;
    syncSelectArrow(cas, false);

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (cas.classList.contains('mingdu-cascader--disabled')) return;
      var willOpen = !cas.classList.contains('mingdu-cascader--open');
      closeAllSelects();
      closeAllCascaders();
      closeAllDatePickers();
      if (willOpen) {
        cas.classList.add('mingdu-cascader--open');
        panel.hidden = false;
        mountCascaderPanelToBody(cas);
        positionCascaderPanel(cas);
        trigger.setAttribute('aria-expanded', 'true');
        syncSelectArrow(cas, true);
      } else closeCascader(cas);
    });

    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    qsa('.mingdu-cascader-menu[data-level="0"] .mingdu-cascader-node', cas).forEach(function (node) {
      node.addEventListener('click', function (e) {
        e.stopPropagation();
        var menu = node.closest('.mingdu-cascader-menu');
        qsa('.mingdu-cascader-node', menu).forEach(function (n) {
          n.classList.remove('mingdu-cascader-node--active');
        });
        node.classList.add('mingdu-cascader-node--active');
        fillCascaderSubmenu(cas, node.getAttribute('data-region'));
      });
    });
    var first = qs('.mingdu-cascader-menu[data-level="0"] .mingdu-cascader-node[data-region]', cas);
    if (first) fillCascaderSubmenu(cas, first.getAttribute('data-region'));
    qsa('.mingdu-cascader-menu[data-level="1"] .mingdu-cascader-node[data-leaf]', cas).forEach(function (node) {
      node.addEventListener('click', function (e) {
        e.stopPropagation();
        onCascaderLeafClick(cas, node);
      });
    });
  });

  /* ---------- Collapse ---------- */
  qsa('.mingdu-collapse-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var expanded = header.getAttribute('aria-expanded') === 'true';
      var bodyId = header.getAttribute('aria-controls');
      var body = bodyId ? document.getElementById(bodyId) : qs('.mingdu-collapse-body', header.parentElement);
      header.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      if (body) body.hidden = expanded;
    });
  });

  /* ---------- Time picker ---------- */
  function getTimePickerPanel(tp) {
    return tp.__mingduTimePanel || qs('.mingdu-time-picker__panel', tp);
  }

  function positionTimePickerPanel(tp) {
    var panel = getTimePickerPanel(tp);
    var input = qs('.mingdu-time-picker__input', tp);
    if (!panel || !input) return;
    var r = input.getBoundingClientRect();
    var pH = panel.offsetHeight || 200;
    var pW = panel.offsetWidth || 120;
    var top = r.bottom + 4;
    if (top + pH > window.innerHeight - 8) top = Math.max(8, r.top - pH - 4);
    var left = r.left;
    if (left + pW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - pW - 8);
    panel.style.position = 'fixed';
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.zIndex = String(FLOAT_Z);
  }

  function mountTimePickerPanelToBody(tp) {
    var panel = getTimePickerPanel(tp);
    if (!panel || panel.parentElement === document.body) return;
    document.body.appendChild(panel);
    panel.setAttribute('data-teleported-from', '1');
  }

  function unmountTimePickerPanelFromBody(tp) {
    var panel = getTimePickerPanel(tp);
    if (!panel || panel.parentElement !== document.body) return;
    tp.appendChild(panel);
    panel.removeAttribute('data-teleported-from');
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.zIndex = '';
  }

  function closeTimePicker(tp) {
    tp.classList.remove('mingdu-time-picker--open');
    var panel = getTimePickerPanel(tp);
    if (panel) {
      panel.hidden = true;
      unmountTimePickerPanelFromBody(tp);
    }
  }

  function closeAllTimePickers() {
    qsa('.mingdu-time-picker.mingdu-time-picker--open').forEach(closeTimePicker);
  }

  qsa('input[type="checkbox"][data-indeterminate]').forEach(function (cb) {
    cb.indeterminate = true;
  });

  qsa('[data-mingdu-time-picker]').forEach(function (tp) {
    if (tp.getAttribute('data-mingdu-time-bound')) return;
    tp.setAttribute('data-mingdu-time-bound', '1');
    var input = qs('.mingdu-time-picker__input', tp);
    var panel = qs('.mingdu-time-picker__panel', tp);
    tp.__mingduTimePanel = panel;
    if (!input || !panel) return;
    input.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !tp.classList.contains('mingdu-time-picker--open');
      closeAllTimePickers();
      closeAllSelects();
      closeAllDatePickers();
      closeAllCascaders();
      if (open) {
        tp.classList.add('mingdu-time-picker--open');
        panel.hidden = false;
        mountTimePickerPanelToBody(tp);
        positionTimePickerPanel(tp);
      } else closeTimePicker(tp);
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    qsa('.mingdu-time-picker__option', tp).forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        input.value = opt.getAttribute('data-value') || opt.textContent.trim();
        qsa('.mingdu-time-picker__option', tp).forEach(function (o) {
          o.classList.remove('mingdu-time-picker__option--active');
        });
        opt.classList.add('mingdu-time-picker__option--active');
        closeTimePicker(tp);
      });
    });
  });

  /* ---------- Slider ---------- */
  qsa('[data-mingdu-slider]').forEach(function (slider) {
    if (slider.getAttribute('data-mingdu-slider-bound')) return;
    slider.setAttribute('data-mingdu-slider-bound', '1');
    var min = parseInt(slider.getAttribute('data-min'), 10);
    var max = parseInt(slider.getAttribute('data-max'), 10);
    var value = parseInt(slider.getAttribute('data-value'), 10);
    var rail = qs('.mingdu-slider__rail', slider);
    var track = qs('.mingdu-slider__track', slider);
    var thumb = qs('.mingdu-slider__thumb', slider);
    var valueEl = qs('.mingdu-slider__value', slider);
    if (!rail || !track || !thumb) return;
    if (isNaN(min)) min = 0;
    if (isNaN(max) || max <= min) max = 100;
    if (isNaN(value)) value = min;

    function setValue(next) {
      var v = Math.max(min, Math.min(max, next));
      var pct = ((v - min) / (max - min)) * 100;
      slider.setAttribute('data-value', String(v));
      track.style.width = pct + '%';
      thumb.style.left = pct + '%';
      if (valueEl) valueEl.textContent = String(v);
    }

    function valueFromClientX(clientX) {
      var rect = rail.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(min + ratio * (max - min));
    }

    function onPointerMove(e) { setValue(valueFromClientX(e.clientX)); }
    function onPointerUp() {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    }

    rail.addEventListener('click', function (e) { setValue(valueFromClientX(e.clientX)); });
    thumb.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });
    setValue(value);
  });

  /* ---------- Switch ---------- */
  qsa('.mingdu-switch[role="switch"]').forEach(function (sw) {
    if (sw.getAttribute('data-mingdu-switch-bound')) return;
    sw.setAttribute('data-mingdu-switch-bound', '1');
    sw.addEventListener('click', function () {
      if (sw.disabled) return;
      var checked = sw.getAttribute('aria-checked') === 'true';
      sw.setAttribute('aria-checked', checked ? 'false' : 'true');
    });
  });

  /* ---------- Transfer ---------- */
  qsa('[data-mingdu-transfer]').forEach(function (transfer) {
    if (transfer.getAttribute('data-mingdu-transfer-bound')) return;
    transfer.setAttribute('data-mingdu-transfer-bound', '1');
    var leftBody = qs('[data-transfer-side="left"] .mingdu-transfer__body', transfer);
    var rightBody = qs('[data-transfer-side="right"] .mingdu-transfer__body', transfer);
    var leftHead = qs('[data-transfer-side="left"] .mingdu-transfer__head', transfer);
    var rightHead = qs('[data-transfer-side="right"] .mingdu-transfer__head', transfer);
    var rightWrap = qs('[data-transfer-side="right"]', transfer);
    if (!leftBody || !rightBody || !leftHead || !rightHead || !rightWrap) return;

    function updateTransferHead() {
      var l = qsa('label', leftBody).length;
      var r = qsa('label', rightBody).length;
      leftHead.textContent = '[Left] ' + l;
      rightHead.textContent = '[Right] ' + r;
      rightWrap.classList.toggle('mingdu-transfer__list--empty', r === 0);
    }

    function moveChecked(fromBody, toBody) {
      qsa('input[type="checkbox"]:checked', fromBody).forEach(function (cb) {
        cb.checked = false;
        var label = cb.closest('label');
        if (label) toBody.appendChild(label);
      });
      updateTransferHead();
    }

    qsa('[data-transfer-action]', transfer).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('data-transfer-action') === 'to-right') moveChecked(leftBody, rightBody);
        else moveChecked(rightBody, leftBody);
      });
    });
    updateTransferHead();
  });

  /* ---------- Tree expand ---------- */
  qsa('[data-mingdu-tree-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      var children = btn.parentElement && btn.parentElement.querySelector('.mingdu-tree-node__children');
      if (children) children.hidden = expanded;
      var icon = qs('i', btn);
      if (icon) {
        icon.classList.remove('MSP-icon_down', 'MSP-icon_right');
        icon.classList.add(expanded ? 'MSP-icon_right' : 'MSP-icon_down');
      }
    });
  });

  /* ---------- TreeSelect value sync ---------- */
  qsa('[data-mingdu-tree-select]').forEach(function (sel) {
    sel.addEventListener('click', function (e) {
      var label = e.target.closest('.mingdu-tree-node__label');
      if (!label) return;
      e.stopPropagation();
      qsa('.mingdu-tree-node__label', sel).forEach(function (el) {
        el.classList.remove('mingdu-tree-node__label--active');
      });
      label.classList.add('mingdu-tree-node__label--active');
      var valueEl = qs('.mingdu-select-value', sel);
      if (valueEl) {
        valueEl.textContent = label.textContent.trim();
        valueEl.classList.remove('mingdu-select-value--placeholder');
      }
      closeAllSelects();
    });
  });

  qsa('.mingdu-tree-node__label').forEach(function (label) {
    label.addEventListener('click', function () {
      var tree = label.closest('[data-mingdu-tree]');
      if (!tree) return;
      qsa('.mingdu-tree-node__label', tree).forEach(function (l) {
        l.classList.remove('mingdu-tree-node__label--active');
      });
      label.classList.add('mingdu-tree-node__label--active');
    });
  });

  /* ---------- Detail Split: stack meta into tab on narrow viewport ---------- */
  qsa('[data-mingdu-detail-stack]').forEach(function (split) {
    var breakpoint = parseInt(split.getAttribute('data-mingdu-detail-stack-breakpoint') || '1199', 10);
    var sidebar = qs('.mingdu-detail-meta--sidebar', split);
    var scroll = sidebar && qs('.mingdu-detail-meta__scroll', sidebar);
    var metaPanel = qs('[data-mingdu-tab-panel-key="meta"]', split);
    var tabs = qs('[data-mingdu-tabs]', split);
    if (!scroll || !metaPanel || !sidebar) return;

    var mq = window.matchMedia('(max-width: ' + breakpoint + 'px)');
    var stacked = false;

    function activateTab(key) {
      if (!tabs) return;
      var item = qs('[data-mingdu-tab="' + key + '"]', tabs);
      if (item) item.click();
    }

    function applyStack() {
      var shouldStack = mq.matches;
      if (shouldStack === stacked) return;
      stacked = shouldStack;

      if (shouldStack) {
        metaPanel.appendChild(scroll);
        split.classList.add('mingdu-detail-split--stacked');
        activateTab('meta');
      } else {
        sidebar.appendChild(scroll);
        split.classList.remove('mingdu-detail-split--stacked');
        activateTab('refs');
      }
    }

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', applyStack);
    } else {
      mq.addListener(applyStack);
    }
    applyStack();
  });

  /* ---------- Navigation Highlight ---------- */
  qsa('.mingdu-tree-nav .mingdu-nav-item, .mingdu-secondary-nav__item').forEach(function (item) {
    item.addEventListener('click', function (e) {
      if (item.getAttribute('href') && item.getAttribute('href') !== '#') return;
      e.preventDefault();
      var group = item.closest('.mingdu-tree-nav, .mingdu-secondary-sidebar, nav');
      if (!group) return;
      qsa('.mingdu-nav-item, .mingdu-secondary-nav__item', group).forEach(function (n) {
        n.classList.remove('mingdu-nav-item--active', 'mingdu-secondary-nav__item--active');
      });
      item.classList.add('mingdu-nav-item--active', 'mingdu-secondary-nav__item--active');
      if (window.innerWidth < 1200) closeNav();
    });
  });
})();

</script>
</body>
</html>


```

1.  二级侧栏列表，看板界面见下图
    
2.  点击侧边栏 切换看板
    

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/WgZOZA5xJK6xeqLX/img/d3704b08-dcb8-44ee-b015-97be7f924733.png)

1.  二级侧栏列表，切换 "分析" 界面见下图
    
2.  点击侧边栏列表，点击分析列表，进入下一级
    
    ![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/WgZOZA5xJK6xeqLX/img/8ddb61f7-d517-40c7-8e81-66d04febfaf3.png)
    
3.  点击后，显示当前的数据流的节点
    
    ![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/WgZOZA5xJK6xeqLX/img/514a098c-7337-4f9d-875b-27c7fb98c272.png)
    
4.  见下图点击显示右侧分类样式
    
    1.  不许浮窗形式
        
    2.  其他的部分看界面
        

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/WgZOZA5xJK6xeqLX/img/445547e3-11c2-4732-aa11-a20701a34c42.png)