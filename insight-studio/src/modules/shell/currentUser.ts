import { computed, ref } from 'vue'

/** 模拟用户（后续可换成 SSO claim）。 */
export interface MockUser {
  id: string
  displayName: string
}

export const MOCK_USERS: readonly MockUser[] = [
  { id: 'david', displayName: 'David' },
  { id: 'dengxiaowei', displayName: 'dengxiaowei' },
] as const

export const DEFAULT_USER_ID = 'david'
export const USER_STORAGE_KEY = 'insight.currentUserId'
export const USER_ID_HEADER = 'X-User-Id'

function readStoredId(): string {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)?.trim().toLowerCase()
    if (raw && MOCK_USERS.some((u) => u.id === raw)) return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_USER_ID
}

const currentId = ref(typeof localStorage !== 'undefined' ? readStoredId() : DEFAULT_USER_ID)

export function getCurrentUserId(): string {
  return currentId.value
}

export function useCurrentUser() {
  const user = computed(() => MOCK_USERS.find((u) => u.id === currentId.value) ?? MOCK_USERS[0])
  const users = MOCK_USERS

  function setUser(id: string): boolean {
    const next = MOCK_USERS.find((u) => u.id === id)
    if (!next || next.id === currentId.value) return false
    currentId.value = next.id
    try {
      localStorage.setItem(USER_STORAGE_KEY, next.id)
    } catch {
      /* ignore */
    }
    return true
  }

  return { user, users, currentId, setUser }
}
