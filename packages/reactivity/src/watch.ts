import { effect } from "./effect"

function watch(source, cb) {
    // 定义 getter
    let getter

    // 如果 source 是函数， 说明用户传递的是 getter，所以直接把 source 赋值给 getter
    if (typeof source === 'function') {
        getter = source
    } else {
        // 否则按照原来的实现调用 traverse 递归地读取
        getter = () => traverse(source)
    }

    // 定义旧值与新值
    let oldValue, newValue
    // 使用 effect 注册副作用函数时， 开启 lazy选项， 并把返回值存储到 effectFn中以便后续手动调用
    const effectFn = effect(
        // 执行 getter
        () => getter(),
        {
            lazy: true,
            scheduler() {
                // 在 scheduler 中重新执行副作用函数，得到的是新值
                newValue = effectFn()
                // 将旧值和新值作为回调函数参数
                cb(newValue, oldValue)
                // 更新旧值， 不然下一次会得到错误的旧值
                oldValue = newValue
            }
        }
    )

    // 手动调用副作用函数， 拿到的值就是旧值
    oldValue = effectFn()
}

function traverse(value: any, seen = new Set()) {
    // 如果要读取的数据是原始值， 或者已经被读取过了，那么什么都不做
    if (typeof value !== 'object' || value === null || seen.has(value)) return

    // 将数据添加到seen中，代表遍历地读取过了，避免循环引用引起的死循环
    seen.add(value)

    // 暂不考虑数组等其他结构
    // 假设 value 就是一个对象，使用 for...in 读取对象的每一个值，并递归地调用 traverse 进行处理
    for (const k in value) {
        traverse(value[k], seen)
    }

    return value
}

export { watch }