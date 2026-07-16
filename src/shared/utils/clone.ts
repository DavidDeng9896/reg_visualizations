import { toRaw } from 'vue'

/** Deep clone plain data; safe with Vue reactive proxies (structuredClone cannot). */
export function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(toRaw(value as object))) as T
}
