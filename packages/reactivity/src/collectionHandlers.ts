import { hasOwn } from '../../shared/src/general';
import { track, trigger } from './effect';
import { ITERATE_KEY, ReactiveFlags, TriggerType, reactive, toRaw } from './reactive';

function get(key) {
    // 获取原始对象
    const target = this[ReactiveFlags.RAW]
    // 判断读取的 key 是否存在
    const hadKey = target.has(key)
    // 追踪依赖
    track(target, key)
    // 如果存在，则返回结果。 这里需要注意的是，如果的得到的结果是 res 仍然是可代理的数据,
    // 则要返回使用 reactive 包装后的响应式数据
    if (hadKey) {
        const res = target.get(key)
        return typeof res === 'object' ? reactive(res) : res
    }
}

function size(target) {
    // 获取原始对象
    target = target[ReactiveFlags.RAW]
    // 调用 track 函数建立响应联系
    track(target, ITERATE_KEY)
    // 调用原始对象的默认行为
    return Reflect.get(target, 'size', target)
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

function set(key, value) {
    const target = this[ReactiveFlags.RAW]
    const hadKey = target.has(key)
    // 获取旧值
    const oldValue = target.get(key)
    value = toRaw(value)
    // 设置新值
    target.set(key, value)
    // 如果不存在， 则说明是 ADD 类型的操作，意味着新增
    if (!hadKey) {
        trigger(target, key, TriggerType.ADD)
    } else if (oldValue !== value || (oldValue === oldValue && value === value)) {
        trigger(target, key, TriggerType.SET)
    }
}

function createForEach(isReadonly, isShallow) {
    return function forEach(callback, thisArg) {
        // wrap 函数可以用来把可代理的值转换为响应式数据
        const wrap = (val) => {
            return typeof val === 'object' ? reactive(val) : val
        }
        // 获取原始数据对象
        const target = this[ReactiveFlags.RAW]
        // 与 ITERATE_KEY 建立响应联系
        track(target, ITERATE_KEY)
        // 通过原始数据对象调用 forEach方法
        target.forEach((v, k) => {
            // 通过 .call 调用 callback, 并传递 thisArg
            callback.call(thisArg, wrap(v), wrap(k), this)
        })
    }
}


const [mutableInstrumentations] = createInstrumentations()

function createInstrumentations() {
    const mutableInstrumentations = {
        get,
        get size() {
            return size(this)
        },
        set,
        add,
        delete: deleteEntry,
        forEach: createForEach(false, false)
    }

    return [mutableInstrumentations]
}

function createInstrumentationsGetter(isReadonly, shallow) {
    // 根据条件获取适合的实例,这里暂时使用默认值
    const instrumentations = mutableInstrumentations

    // 实际调用入口
    return (target, key, receiver) => {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        } else if (key === ReactiveFlags.RAW) {
            return target
        }

        return Reflect.get(
            hasOwn(instrumentations, key) && key in target
                ? instrumentations
                : target,
            key,
            receiver
        )
    }
}


export const mutableCollectionHandlers = {
    get: createInstrumentationsGetter(false, false)
}
