// 任务缓存队列，用一个 Set 数据结构来表示，这样就可以自动对任务进行去重
const queue = new Set<Function>()
// 一个标志， 代表是否正在刷新任务队列
let isFlushing = false
// 创意一个立即 resolve 的 Promise 实例
const p = Promise.resolve()

// 调度器的主要函数，用来将一个任务添加到缓冲队列中，并开始刷新队列
function queueJob(job) {
    // 将 job 添加到任务队列 queue 中
    queue.add(job)
    // 如果还没有开始刷新队列，则刷新之
    if (!isFlushing) {
        // 将该标志设置为 true 以避免重复刷新
        isFlushing = true
        // 在微任务中刷新缓冲队列
        p.then(() => {
            try {
                // 执行任务队列中的任务
                queue.forEach((job) => job())
            } finally {
                // 重置状态
                isFlushing = false
                queue.clear()
            }
        })
    }
}

export { queueJob }
