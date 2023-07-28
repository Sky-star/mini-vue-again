import { track, trigger } from './effect';
import { ITERATE_KEY, ReactiveFlags, TriggerType } from './reactive';
const get = createGetter()

function createGetter() {
    return function get(target, key, receiver) {
        // 如果读取的是 raw 属性， 则返回原始数据 target
        if (key === ReactiveFlags.RAW) return target
        if (key === 'size') {
            // 调用 track 函数建立响应联系
            track(target, ITERATE_KEY)
            return Reflect.get(target, key, target)
        }

        // 返回定义在 mutableInstrumentations 对象下的方法
        return mutableInstrumentations[key]
    }
}

function add(key) {
    // this 仍然指向的是代理对象， 通过 raw 属性获取原始数据对象
    const target = this[ReactiveFlags.RAW]
    // 先判断值是否已经存在
    const hadKey = target.has(key)
    // 通过原始数据对象执行 add 方法添加具体的值
    // 注意，这里不再需要 .bind了，因为是直接通过 target 调用并执行的
    const res = target.add(key)
    // 调用 trigger 函数触发响应，并指定操作类型为 ADD
    // 只有在值不存在的情况下，才需要触发响应
    if (!hadKey) {
        trigger(target, key, TriggerType.ADD)
    }
    // 返回操作结果
    return res
}

function deleteEntry(key) {
    // this 仍然指向的是代理对象， 通过 raw 属性获取原始数据对象
    const target = this[ReactiveFlags.RAW]
    // 先判断值是否已经存在
    const hadKey = target.has(key)
    // 通过原始数据对象执行 delete 方法删除具体的值
    // 注意，这里不再需要 .bind了，因为是直接通过 target 调用并执行的
    const res = target.delete(key)
    // 调用 trigger 函数触发响应， 并指定操作类型为 DELETE
    // 只有在要删除的值存在的情况下，才需要触发响应
    if (hadKey) {
        trigger(target, key, TriggerType.DELETE)
    }
    // 返回操作结果
    return res
}

const mutableInstrumentations = {
    add,
    delete: deleteEntry
}

export const collectionHandlers = {
    get,
}
