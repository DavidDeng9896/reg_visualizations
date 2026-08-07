/** Agent 工具注册表：OpenAI function calling 的 tools 定义（JSON Schema）。
 * 实现见 impl.ts；协议级工具 submit_plan / mark_step_done / ask_user 与 delegate_*_worker 在 agentLoop 内置处理。
 */

type JsonSchema = Record<string, unknown>

interface ToolDef {
  name: string
  description: string
  parameters: JsonSchema
}

const str = (description: string): JsonSchema => ({ type: 'string', description })
const strArr = (description: string): JsonSchema => ({ type: 'array', items: { type: 'string' }, description })

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'submit_plan',
    description: '开工前必须调用：提交执行计划（3-6 个步骤），之后严格按计划执行。',
    parameters: { type: 'object', properties: { steps: strArr('步骤简述，按执行顺序') }, required: ['steps'] },
  },
  {
    name: 'mark_step_done',
    description: '每完成计划中的一个步骤后调用，用于更新进展。',
    parameters: { type: 'object', properties: { index: { type: 'number', description: '完成的步骤序号（从 0 开始）' } }, required: ['index'] },
  },
  {
    name: 'ask_user',
    description: '需要用户拍板时调用：以卡片形式向用户提问并暂停等待作答（方案选择、关键参数缺失、口径确认）。用户的回答会作为工具结果返回。',
    parameters: {
      type: 'object',
      properties: {
        question: str('向用户提出的问题（一句话说清要决策什么）'),
        options: strArr('可选答案（2-4 个，用户单选）；为空时退化为纯提问'),
        allowOther: { type: 'boolean', description: '是否允许用户输入自定义回答（默认 true）' },
      },
      required: ['question'],
    },
  },
  {
    name: 'list_analyses',
    description: '列出平台中全部分析（id、名称、项目、表/视图数量、更新时间）。',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_tables',
    description: '列出指定分析（默认当前分析）中的所有表（id、名称、行数、是否步骤产出）。',
    parameters: { type: 'object', properties: { analysisId: str('分析 id；缺省为当前打开的分析') } },
  },
  {
    name: 'get_table_schema',
    description: '获取表的列信息与前 5 行样例数据，用于了解字段含义。',
    parameters: { type: 'object', properties: { tableId: str('表 id'), analysisId: str('分析 id；缺省为当前分析') }, required: ['tableId'] },
  },
  {
    name: 'create_analysis',
    description: '创建一个新分析并打开它。',
    parameters: {
      type: 'object',
      properties: { name: str('分析名称'), project: str('项目代码（可选）'), department: str('部门 id（可选）') },
      required: ['name'],
    },
  },
  {
    name: 'import_csv_text',
    description: '把 CSV 文本导入为当前分析的一张新表（自动推断列类型，并生成上传步骤节点）。',
    parameters: { type: 'object', properties: { tableName: str('表名'), csv: str('完整 CSV 文本，首行为表头') }, required: ['tableName', 'csv'] },
  },
  {
    name: 'add_filter_step',
    description: '在某表下游添加 Filter 过滤步骤并执行，产出新表。conditions 操作符：eq/neq/gt/gte/lt/lte/between/contains/isBlank/notBlank。',
    parameters: {
      type: 'object',
      properties: {
        tableId: str('输入表 id'),
        conditions: {
          type: 'array',
          description: '过滤条件（and 组合）',
          items: {
            type: 'object',
            properties: { column: str('列 field'), operator: str('操作符'), value: { description: '比较值（between 时与 value2 组成区间）' }, value2: { description: '区间上界（仅 between）' } },
            required: ['column', 'operator'],
          },
        },
      },
      required: ['tableId', 'conditions'],
    },
  },
  {
    name: 'add_join_step',
    description: '以 key 连接两表（joinType: left/inner/right/full），产出合并表。',
    parameters: {
      type: 'object',
      properties: {
        leftTableId: str('左表 id'),
        rightTableId: str('右表 id'),
        joinType: { type: 'string', enum: ['left', 'inner', 'right', 'full'], description: '连接类型' },
        keys: { type: 'array', items: { type: 'object', properties: { left: str('左表列'), right: str('右表列') }, required: ['left', 'right'] } },
      },
      required: ['leftTableId', 'rightTableId', 'joinType', 'keys'],
    },
  },
  {
    name: 'add_union_step',
    description: '纵向合并多张结构兼容的表（append）。',
    parameters: { type: 'object', properties: { tableIds: strArr('要合并的表 id（2 张以上）') }, required: ['tableIds'] },
  },
  {
    name: 'add_computed_column_step',
    description: '添加派生列步骤（表达式引用列名，如 `yield_pct / 100`、`kon_1e5 * koff_1e4`），产出新表。',
    parameters: {
      type: 'object',
      properties: { tableId: str('输入表 id'), name: str('新列名'), expression: str('表达式') },
      required: ['tableId', 'name', 'expression'],
    },
  },
  {
    name: 'add_hide_columns_step',
    description: '隐藏表的指定列，产出只含剩余列的新表。',
    parameters: { type: 'object', properties: { tableId: str('输入表 id'), columns: strArr('要隐藏的列 field') }, required: ['tableId', 'columns'] },
  },
  {
    name: 'add_custom_code_step',
    description: '添加 Python Custom Code 步骤（list[IOData] 契约）。tableId 为上游表；可选 code（完整脚本，须含 custom_code）与 name。创建后立即执行。',
    parameters: {
      type: 'object',
      properties: { tableId: str('上游表 id'), code: str('Python 脚本（可选）'), name: str('步骤名（可选）') },
      required: ['tableId'],
    },
  },
  {
    name: 'update_custom_code_step',
    description: '更新 Custom Code 步骤的 code/name 并重新执行。',
    parameters: {
      type: 'object',
      properties: { stepId: str('步骤 id'), code: str('Python 脚本（可选）'), name: str('步骤名（可选）') },
      required: ['stepId'],
    },
  },
  {
    name: 'run_step',
    description: '重新执行一个步骤（配置变更或源数据更新后）。',
    parameters: { type: 'object', properties: { stepId: str('步骤 id') }, required: ['stepId'] },
  },
  {
    name: 'rerun_stale_steps',
    description: '重新运行当前分析中所有 stale 状态的步骤。',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'refresh_sql_source',
    description:
      '重新查询 query-sql 数据源并替换产出表快照，自动传播下游 stale/重跑。stepId 可省略（仅一个 SQL 源时）。',
    parameters: { type: 'object', properties: { stepId: str('query-sql 步骤 id（可选）') } },
  },
  {
    name: 'create_view',
    description: '在表上新建视图（type: table/bar/line/scatter/box/pie/heatmap/bignumber）。',
    parameters: { type: 'object', properties: { tableId: str('表 id'), type: str('视图类型'), name: str('视图名（可选）') }, required: ['tableId', 'type'] },
  },
  {
    name: 'set_chart_config',
    description: '配置图表视图：图种、映射（x/y/values/series/color/shape/categories/measure）、聚合、误差棒、回归（model: none/point-to-point/linear/quadratic/4pl）、样式（标题/图例/边距/透明度/线型/拟合注释/参考线/柱模式/箱形态/bignumber 布局）。',
    parameters: {
      type: 'object',
      properties: {
        tableId: str('表 id'),
        viewId: str('视图 id'),
        chartType: str('图种（可选，改图种时必填）'),
        configure: { type: 'object', description: '映射与回归配置（部分更新，深合并）' },
        style: { type: 'object', description: '样式（部分更新，深合并）' },
      },
      required: ['tableId', 'viewId'],
    },
  },
  {
    name: 'create_dashboard',
    description: '创建一个看板并打开。',
    parameters: { type: 'object', properties: { name: str('看板名称'), project: str('项目代码（可选）'), department: str('部门 id（可选）') }, required: ['name'] },
  },
  {
    name: 'add_dashboard_widget',
    description: '往看板添加组件：某分析的表或图表视图（viewId 省略时为表格组件）。',
    parameters: {
      type: 'object',
      properties: {
        dashboardId: str('看板 id'),
        analysisId: str('分析 id'),
        tableId: str('表 id'),
        viewId: str('视图 id（可选，给定时为图表组件）'),
      },
      required: ['dashboardId', 'analysisId', 'tableId'],
    },
  },
  {
    name: 'delete_table',
    description: '【危险】删除一张表（连带其步骤与下游依赖检查）。',
    parameters: { type: 'object', properties: { tableId: str('表 id') }, required: ['tableId'] },
  },
  {
    name: 'delete_view',
    description: '【危险】删除一个视图。',
    parameters: { type: 'object', properties: { tableId: str('表 id'), viewId: str('视图 id') }, required: ['tableId', 'viewId'] },
  },
  {
    name: 'delete_step',
    description: '【危险】删除一个步骤及其产出表。',
    parameters: { type: 'object', properties: { stepId: str('步骤 id') }, required: ['stepId'] },
  },
  {
    name: 'clear_analysis',
    description:
      '【危险】清空当前分析的全部表与步骤（保留分析本身）。用户要求「全部删掉/清空分析」时优先用此工具，勿逐张 delete_table。',
    parameters: {
      type: 'object',
      properties: {
        analysisId: str('分析 id；缺省为当前打开的分析'),
      },
    },
  },
  {
    name: 'list_skills',
    description: '列出已安装的 AI Skills（id、名称、描述、是否启用）。需要细节时再 read_skill。',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'read_skill',
    description: '读取某个 Skill 的完整 SKILL.md 说明书正文。',
    parameters: { type: 'object', properties: { skillId: str('Skill id（来自 list_skills）') }, required: ['skillId'] },
  },
  {
    name: 'save_memory',
    description:
      '将用户纠正过的错误分析思路沉淀为记忆，供后续会话遵守。content 应是简短、可复用的教训（勿贴整段对话）。',
    parameters: { type: 'object', properties: { content: str('教训正文') }, required: ['content'] },
  },
  {
    name: 'delegate_skill_worker',
    description:
      '派发「规划师」：在独立短循环中 list/read Skill，提炼与 goal 相关的要点后摘要返回。适合隔离 Skill 全文，避免塞进主对话。',
    parameters: { type: 'object', properties: { goal: str('规划师要完成的具体目标（含相关 skill 线索）') }, required: ['goal'] },
  },
  {
    name: 'delegate_mcp_worker',
    description:
      '派发「MCP 专家」：在独立短循环中调用已启用的 mcp_* 工具，返回结构化摘要。外部系统多步查询/写入时可用。',
    parameters: { type: 'object', properties: { goal: str('MCP 专家要完成的具体目标') }, required: ['goal'] },
  },
  {
    name: 'delegate_analysis_worker',
    description:
      '派发「分析师」：独立循环做表加工、Custom Code、出图、看板（不含删除）。主循环也可直接做同类操作；步骤很多或需隔离时再派。goal 须含表 id 与字段线索。',
    parameters: { type: 'object', properties: { goal: str('分析师要完成的分析/出图目标（含表 id、字段名）') }, required: ['goal'] },
  },
  {
    name: 'delegate_code_worker',
    description:
      '派发「工程师」：编写/更新 Python Custom Code 步骤并执行自测，返回结论与步骤/表 id。短代码主循环可直接写。',
    parameters: { type: 'object', properties: { goal: str('工程师要完成的代码目标') }, required: ['goal'] },
  },
]

/** OpenAI tools 数组（可直接放进 chat payload）。 */
export const OPENAI_TOOLS = TOOL_DEFS.map((t) => ({
  type: 'function',
  function: { name: t.name, description: t.description, parameters: t.parameters },
}))
