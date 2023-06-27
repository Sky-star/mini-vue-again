import { effect, track, trigger } from './effect';
import { TriggerType } from './reactive';

function computed(getter: Function) {
    // value 用来存储上一次计算的值
    let value

    //  dirty 用来标识是否需要重新计算， 为true 则意味着"脏", 需要重新计算
    let dirty = true

    // 把 getter 作为副作用函数， 创建一个 lazy 的 effect
    const effectFn = effect(getter, {
        lazy: true,
        // 添加调度器， 在调度器中将 dirty 重置为true
        scheduler() {
            if (!dirty) {
                dirty = true
                // 当计算属性依赖的响应式数据发生变化时， 手动调用 trigger 函数触发响应
                // 由于计算属性不存在添加属性和删除属性的情况发生, 所以默认类型为 SET
                trigger(obj, 'value', TriggerType.SET)
            }
        }
    })

    const obj = {
        // 当读取 value 时 才执行 effectFn
        get value() {
            // 只有"脏"时， 才计算值， 并且将得到的值缓存到value中
            if (dirty) {
                value = effectFn()
                // 将 dirty 设置为 false, 下一访问直接使用缓存到 value 中的值
                dirty = false
            }

            // 当读取 value 时， 手动调用 track 函数进行追踪
            track(obj, 'value')

            return value
        }
    }

    return obj
}

export { computed }