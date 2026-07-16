/** Lazy Element Plus feedback APIs — keep message/box out of the critical sync path. */

type MessageType = 'success' | 'warning' | 'info' | 'error'

async function loadMessage() {
  await import('element-plus/es/components/message/style/css')
  const mod = await import('element-plus')
  return mod.ElMessage
}

async function loadMessageBox() {
  await Promise.all([
    import('element-plus/es/components/message/style/css'),
    import('element-plus/es/components/message-box/style/css'),
  ])
  const mod = await import('element-plus')
  return mod.ElMessageBox
}

export function toast(type: MessageType, message: string) {
  void loadMessage().then((ElMessage) => {
    ElMessage[type](message)
  })
}

export async function confirm(
  message: string,
  title: string,
  options?: { type?: 'warning' | 'info' | 'success' | 'error'; confirmButtonText?: string; cancelButtonText?: string },
) {
  const ElMessageBox = await loadMessageBox()
  return ElMessageBox.confirm(message, title, {
    type: options?.type || 'warning',
    confirmButtonText: options?.confirmButtonText || '确定',
    cancelButtonText: options?.cancelButtonText || '取消',
  })
}

export async function prompt(
  message: string,
  title: string,
  options?: { inputValue?: string },
) {
  const ElMessageBox = await loadMessageBox()
  return ElMessageBox.prompt(message, title, {
    inputValue: options?.inputValue,
  })
}
