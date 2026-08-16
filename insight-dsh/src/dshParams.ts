/** 把 OpenAI JSON Schema 的 properties 压成 dsh defineTool 参数表。 */

type DshParam = {
  type: string
  description?: string
  required?: true
  items?: { type: string }
}

type JsonProp = {
  type?: string
  description?: string
  items?: { type?: string }
}

export function jsonSchemaToDshParams(schema: {
  properties?: Record<string, JsonProp>
  required?: string[]
}): Record<string, DshParam> {
  const required = new Set(schema.required ?? [])
  const out: Record<string, DshParam> = {}
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    const itemType = prop.items?.type
    const t =
      prop.type === 'array'
        ? 'array'
        : prop.type === 'number' || prop.type === 'integer'
          ? 'number'
          : prop.type === 'boolean'
            ? 'boolean'
            : prop.type === 'object'
              ? 'json'
              : 'string'
    const entry: DshParam = { type: t }
    if (typeof prop.description === 'string' && prop.description.trim()) {
      entry.description = prop.description
    }
    if (required.has(key)) entry.required = true
    if (t === 'array') {
      entry.items = {
        type:
          itemType === 'number' || itemType === 'integer'
            ? 'number'
            : itemType === 'object'
              ? 'json'
              : itemType === 'boolean'
                ? 'boolean'
                : 'string',
      }
    }
    out[key] = entry
  }
  return out
}
