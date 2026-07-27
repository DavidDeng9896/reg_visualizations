/** 限制并发的异步队列，避免 RDKit 同步绘制打满主线程。 */
const MAX_CONCURRENT = 2
let active = 0
const waiting: Array<() => void> = []

function pump(): void {
  while (active < MAX_CONCURRENT && waiting.length) {
    const next = waiting.shift()
    next?.()
  }
}

/** 将任务排入队列；同一时刻最多 MAX_CONCURRENT 个在跑。 */
export function enqueueStructureJob<T>(job: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      active++
      job()
        .then(resolve, reject)
        .finally(() => {
          active--
          pump()
        })
    }
    if (active < MAX_CONCURRENT) start()
    else waiting.push(start)
  })
}
