// effect实现步骤
// 1. 利用 proxy 实现基本的响应式系统
// 2. 解决副作用函数硬编码在文件内部的问题。 引出effect函数的出现
// 3. 解决effect函数中，不同对象的属性的变化也会触发副作用函数的问题。 
//    引出存储副作用函数容器的结构的重新设计(树形结构)
// 4. 解决副作用函数内部分支切换导致遗留副作用函数的问题。
//    引出副作用函数的反向依赖收集,以及清除副作用函数的函数cleanup
//    解决调用cleanup函数导致的无限循环问题。即引出对集合遍历时，内部一边对Set集合元素添加，一边删除,会导致无限循环
//    引出复制原始Set来解决
// 5. 解决effect函数嵌套导致的,副作用函数执行错误问题
//    引出effectStack模拟栈的操作来使activeEffect拥有正确的指向

// 用一个全局变量存储被注册的副作用函数
let activeEffect
// 存储副作用函数的容器
const bucket = new WeakMap()
// 副作用函数栈
const effectStack: Function[] = []

function effect(fn: Function) {

    // 不要将反向依赖集合挂载在原始的副作用函数上, 所以包裹一层
    const effectFn = () => {
        // 完成副作用函数清除工作
        cleanup(effectFn)
        // 当调用 effect 注册副作用函数时，将副作用函数 effectFn 赋值给 activeEffect
        // 不能用 fn， 否则反向收集的依赖就找不到了
        activeEffect = effectFn
        // 将当前执行的副作用函数压入栈顶
        effectStack.push(effectFn)
        // 执行副作用函数
        fn()
        // 副作用函数执行完毕后，将当前副作用函数出栈
        effectStack.pop()
        // 并将activeEffect还原为之前的值
        activeEffect = effectStack[effectStack.length - 1]
    }

    // 初始化反向依赖收集的数组
    effectFn.deps = []

    effectFn()
}

// 解决分支切换导致的副作用函数遗留的问题
function cleanup(effectFn) {
    // 遍历反向收集的依赖集合
    for (let i = 0; i < effectFn.deps.length; i++) {
        // 获取依赖集合
        const deps = effectFn.deps[i]
        // 将 effectFn 从依赖集合中删除
        deps.delete(effectFn)
    }

    // 重置 effectFn.deps 数组
    effectFn.deps.length = 0
}


// 依赖收集
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

    // 进行反向依赖收集
    activeEffect.deps.push(deps)
}


// 依赖触发
function trigger(target, key) {

    // 根据 target 从容器中取得depsMap
    const depsMap = bucket.get(target)

    if (!depsMap) return true

    // 根据 key 取得所有的副作用函数 effects
    const effects = depsMap.get(key)

    // 解决无限循环的问题
    const effectsToRun: Set<Function> = new Set(effects)

    // 执行副作用函数
    effectsToRun.forEach(effectFn => effectFn())
}

export { trigger, track, effect }