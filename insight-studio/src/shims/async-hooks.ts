/** 浏览器 / Vite 下的 AsyncLocalStorage 垫片。Promise 回调会等到 settle 再恢复。 */
export class AsyncLocalStorage<T> {
  #store: T | undefined

  getStore(): T | undefined {
    return this.#store
  }

  run<R>(store: T, callback: () => R): R {
    const prev = this.#store
    this.#store = store
    try {
      const result = callback()
      if (result != null && typeof (result as { then?: unknown }).then === 'function') {
        return (Promise.resolve(result) as Promise<unknown>).finally(() => {
          this.#store = prev
        }) as R
      }
      this.#store = prev
      return result
    } catch (err) {
      this.#store = prev
      throw err
    }
  }
}
