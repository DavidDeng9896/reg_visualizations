import { describe, expect, it } from 'vitest'
import { buildMcpToolsBundle, mcpFunctionName } from '../../../src/modules/ai/mcpTools'
import { buildSkillsCatalogPrompt } from '../../../src/modules/ai/prompts'
import { OPENAI_TOOLS, TOOL_DEFS } from '../../../src/modules/ai/tools/registry'

describe('mcpTools bundle', () => {
  it('生成可解析的 OpenAI function 名', () => {
    const serverId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const fn = mcpFunctionName(serverId, 'search.docs')
    expect(fn.startsWith('mcp_')).toBe(true)
    expect(fn.length).toBeLessThanOrEqual(64)
    expect(fn).toContain('search_docs')
  })

  it('合并多 server tools 并可反向 resolve', () => {
    const bundle = buildMcpToolsBundle([
      {
        serverId: '11111111-1111-1111-1111-111111111111',
        serverName: 'Docs',
        name: 'search',
        description: 'search docs',
        inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
      },
      {
        serverId: '22222222-2222-2222-2222-222222222222',
        serverName: 'Calc',
        name: 'add',
        description: 'add numbers',
      },
    ])
    expect(bundle.tools).toHaveLength(2)
    expect(bundle.tools[0].type).toBe('function')
    expect(bundle.tools[0].function.description).toContain('[MCP:Docs]')
    const ref = bundle.resolve(bundle.tools[0].function.name)
    expect(ref).toEqual({ serverId: '11111111-1111-1111-1111-111111111111', name: 'search' })
    expect(bundle.resolve('list_tables')).toBeNull()
  })
})

describe('skills catalog prompt', () => {
  it('空列表返回空串', () => {
    expect(buildSkillsCatalogPrompt([])).toBe('')
  })

  it('注入 id/name/description', () => {
    const text = buildSkillsCatalogPrompt([
      { id: 'chart-best-practices', name: 'Chart best practices', description: '图表建议' },
    ])
    expect(text).toContain('chart-best-practices')
    expect(text).toContain('read_skill')
    expect(text).toContain('图表建议')
  })
})

describe('registry skills tools', () => {
  it('含 list_skills / read_skill 且 OPENAI_TOOLS 同步', () => {
    expect(TOOL_DEFS.some((t) => t.name === 'list_skills')).toBe(true)
    expect(TOOL_DEFS.some((t) => t.name === 'read_skill')).toBe(true)
    const names = OPENAI_TOOLS.map((t) => (t as { function: { name: string } }).function.name)
    expect(names).toContain('list_skills')
    expect(names).toContain('read_skill')
  })
})
