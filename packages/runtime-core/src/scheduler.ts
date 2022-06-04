
const queue = []
let isFlushing = false

export const resolvePromise = Promise.resolve()
export function queueJob(job) {
  debugger
  if (!queue.includes(job)) {
    queue.push(job)
  }

  // 如果有两个任务，第一个任务会先进入Flushing=true状态，下一个任务就不会走后门的逻辑
  // 直到第一个任务promise resolve后，执行所有job, 组件会统一更新
  if (!isFlushing) {
    isFlushing = true
    resolvePromise.then(() => {
      isFlushing = false
      let copy = queue.slice()
      // 这里之所以要先清空是因为：执行job可能产生新的任务，如果放在后面清空就有问题了
      queue.length = 0
      for (let i = 0;i < queue.length;i++) {
        const job = copy[i]
        job()
      }
      copy.length = 0
    })
  }
}