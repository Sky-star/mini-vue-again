import { track, trigger } from './effect';

const ITERATE_KEY = Symbol()

const TriggerType = {
    SET: 'SET',
    ADD: 'ADD',
    DELETE: 'DELETE'
}

function reactive(data) {
    const proxy = new Proxy(data, {
        // 拦截读取操作
        get(target, key, receiver) {
            // 将 副作用函数 activeEffect 存储到容器当中
            track(target, key)
            // 返回属性值
            return Reflect.get(target, key, receiver)
        },
        // 拦截设置操作
        set(target, key, newValue, receiver) {
            // 如果属性不存在， 则说明添加新属性， 否则是设置已有属性
            const type = Object.prototype.hasOwnProperty.call(target, key) ? TriggerType.SET : TriggerType.ADD
            // 设置属性值
            const res = Reflect.set(target, key, newValue, receiver)
            // 将副作用函数从容器中取出并执行
            trigger(target, key, type)

            return res
        },
        // 拦截 in 操作
        has(target, key) {
            track(target, key)
            return Reflect.has(target, key)
        },
        // 拦截 for...in 操作
        ownKeys(target) {
            // 将副作用函数与 ITERATE_KEY 相关联
            track(target, ITERATE_KEY)
            return Reflect.ownKeys(target)
        },
        // 拦截 delete操作
        deleteProperty(target, key) {
            // 检查被操作的属性是否是对象自己的属性
            const hadKey = Object.prototype.hasOwnProperty.call(target, key)

            // 使用 Reflect.deleteProperty 完成属性删除
            const res = Reflect.deleteProperty(target, key)

            if (hadKey && res) {
                // 只有当删除的属性时对象自己的属性并且成功删除时，才触发更新
                trigger(target, key, TriggerType.DELETE)
            }

            return res
        },

    })

    return proxy
}

export { reactive, ITERATE_KEY, TriggerType }