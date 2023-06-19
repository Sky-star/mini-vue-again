import { track, trigger } from './effect';

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
            // 设置属性值
            Reflect.set(target, key, newValue, receiver)
            // 将副作用函数从容器中取出并执行
            trigger(target, key)

            return true
        }
    })

    return proxy
}

export { reactive }