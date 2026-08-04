/**
 * 将 Go 返回的已启用 MCP tools 转为 OpenAI function tools，并提供反向解析。
 * 函数名格式：mcp_<serverId12>_<safeName>（截断至 64）。
 */
import type { McpEnabledTool } from './client'

export interface McpToolRef {
  serverId: string
  name: string
}

export interface McpToolsBundle {
  tools: Array<{
    type: 'function'
    function: { name: string; description: string; parameters: Record<string, unknown> }
  }>
  resolve: (fnName: string) => McpToolRef | null
}

function safeSegment(s: string, max: number): string {
  const t = s.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_')
  return (t || 'tool').slice(0, max)
}

export function mcpFunctionName(serverId: string, toolName: string): string {
  const sid = serverId.replace(/-/g, '').slice(0, 12)
  const name = safeSegment(toolName, 40)
  return `mcp_${sid}_${name}`.slice(0, 64)
}

export function buildMcpToolsBundle(list: McpEnabledTool[]): McpToolsBundle {
  const map = new Map<string, McpToolRef>()
  const tools: McpToolsBundle['tools'] = []
  const used = new Set<string>()

  for (const t of list) {
    let fn = mcpFunctionName(t.serverId, t.name)
    if (used.has(fn)) {
      let i = 2
      while (used.has(`${fn}_${i}`.slice(0, 64))) i++
      fn = `${fn}_${i}`.slice(0, 64)
    }
    used.add(fn)
    map.set(fn, { serverId: t.serverId, name: t.name })
    const schema =
      t.inputSchema && typeof t.inputSchema === 'object'
        ? (t.inputSchema as Record<string, unknown>)
        : { type: 'object', properties: {} }
    tools.push({
      type: 'function',
      function: {
        name: fn,
        description: `[MCP:${t.serverName}] ${t.description || t.name}`,
        parameters: schema,
      },
    })
  }

  return {
    tools,
    resolve: (fnName: string) => map.get(fnName) ?? null,
  }
}
