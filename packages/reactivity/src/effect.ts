// 用一个全局变量存储被注册的副作用函数
let activeEffect

function effect(fn: Function) {
    // 当调用 effect 注册副作用函数时，将副作用函数 fn 赋值给 activeEffect
    activeEffect = fn
    // 执行副作用函数
    fn()
}

const data = { text: 1 }

// 存储副作用函数的容器
const bucket = new WeakMap()

const obj = new Proxy(data, {
    // 拦截读取操作
    get(target, key) {
        // 将 副作用函数 activeEffect 存储到容器当中
        track(target, key)
        // 返回属性值
        return target[key]
    },
    // 拦截设置操作
    set(target, key, newValue) {
        // 设置属性值
        target[key] = newValue
        // 将副作用函数从容器中取出并执行
        trigger(target, key)

        return true
    },
})



function track(target, key) {
    // 没有 activeEffect 直接 return
    if (!activeEffect) return

    // 从容器中取得 depsMap, 它是一个Map类型: key -> effects
    let depsMap = bucket.get(target)

    // 如果不存在， 那么新建一个 Map 并与 target 关联
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()))
    }

    // 再根据 key 从 depsMap 中取得 deps, 它是一个Set类型
    // deps 中存储与 key 相关联的副作用函数集合
    let deps = depsMap.get(key)

    // 如果 deps 不存在， 同样新建一个 Set 并与 key 关联
    if (!deps) {
        depsMap.set(key, (deps = new Set()))
    }

    // 最后将当前激活的副作用函数添加到集合当中, 完成最终的树形结构
    deps.add(activeEffect)
}

function trigger(target, key) {

    // 根据 target 从容器中取得depsMap
    const depsMap = bucket.get(target)

    if (!depsMap) return true

    // 根据 key 取得所有的副作用函数 effects
    const effects = depsMap.get(key)

    // 执行副作用函数
    effects && effects.forEach((fn) => fn())
}

export { trigger, track, effect }