// effect实现步骤
// 1. 利用 proxy 实现基本的响应式系统
// 2. 解决副作用函数硬编码在文件内部的问题。 引出 effect 函数的出现
// 3. 解决 effect 函数中，不同对象的属性的变化也会触发副作用函数的问题。 
//    引出存储副作用函数容器的结构的重新设计(树形结构)
// 4. 解决副作用函数内部分支切换导致遗留副作用函数的问题。
//    引出副作用函数的反向依赖收集,以及清除副作用函数的函数 cleanup
//    解决调用 cleanup 函数导致的无限循环问题。即引出对集合遍历时，内部一边对 Set 集合元素添加，一边删除,会导致无限循环
//    引出复制原始 Set 来解决
// 5. 解决 effect 函数嵌套导致的,副作用函数执行错误问题
//    引出 effectStack 模拟栈的操作来使 activeEffect 拥有正确的指向
// 6. 解决 effect 函数内部对象自增导致的无限循环
//    引出在 trigger 中处理当前执行的副作用函数与触发的副作用函数相同则不执行
// 7. 将副作用函数执行时机交由用户控制
//    引出 scheduler 的实现
// 8. 设计懒执行的 effect 模式，为了方便某些情境下的需求(computed)

import { toRawType } from "../../shared/src/general"
import { ITERATE_KEY, MAP_KEY_ITERATE_KEY, TriggerType } from "./reactive"

// 用一个全局变量存储被注册的副作用函数
let activeEffect
// 存储副作用函数的容器
const bucket = new WeakMap()
// 副作用函数栈
const effectStack: Function[] = []

function effect(fn: Function, options: any = {}) {

    // 不要将反向依赖集合挂载在原始的副作用函数上, 所以包裹一层
    const effectFn = () => {
        // 完成副作用函数清除工作
        cleanup(effectFn)
        // 当调用 effect 注册副作用函数时，将副作用函数 effectFn 赋值给 activeEffect
        // 不能用 fn， 否则反向收集的依赖就找不到了
        activeEffect = effectFn
        // 将当前执行的副作用函数压入栈顶
        effectStack.push(effectFn)
        // 执行副作用函数, 并且将 fn 的执行结果保存到 res 中
        const res = fn()
        // 副作用函数执行完毕后，将当前副作用函数出栈
        effectStack.pop()
        // 并将activeEffect还原为之前的值
        activeEffect = effectStack[effectStack.length - 1]

        return res
    }

    // 将 options 挂载到 effectFn 上
    effectFn.options = options

    // 初始化反向依赖收集的数组
    effectFn.deps = []

    // 只有在非 lazy 时执行
    if (!options.lazy) {
        effectFn()
    }

    // 将副作用函数作为返回值返回
    return effectFn
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
    // 没有 activeEffect 或者 不允许追踪 直接 return
    if (!activeEffect || !shouldTrack) return

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

    trackEffects(deps)
}

function trackEffects(deps) {

    if (deps.has(activeEffect)) return

    // 最后将当前激活的副作用函数添加到集合当中, 完成最终的树形结构
    deps.add(activeEffect)

    // 进行反向依赖收集
    activeEffect.deps.push(deps)
}

// 依赖触发
function trigger(target, key, type, newVal = undefined) {

    // 根据 target 从容器中取得depsMap
    const depsMap = bucket.get(target)

    if (!depsMap) return true

    // 根据 key 取得所有的副作用函数 effects
    const effects = depsMap.get(key)

    // 根据 ITERATE_KEY 取得所有相关的副作用函数
    const iterateEffects = depsMap.get(ITERATE_KEY)

    // 解决无限循环的问题
    const effectsToRun: Set<any> = new Set()

    // 解决自增操作导致的无限循环问题
    effects && effects.forEach(effectFn => {
        if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
        }
    })

    // 当操作类型为 ADD 并且目标对象是数组时，应该取出并执行那些与 length 属性相关联的副作用函数
    if (type === TriggerType.ADD && Array.isArray(target)) {
        // 取出与 length 相关联的副作用函数
        const lengthEffects = depsMap.get('length')

        lengthEffects && lengthEffects.forEach(effectFn => {
            if (effectFn !== activeEffect) {
                effectsToRun.add(effectFn)
            }
        });
    }

    // 如果操作目标是数组， 并修改了数组的 length 属性
    if (Array.isArray(target) && key === 'length') {
        // 对于索引大于或等于新的 length 值的元素
        // 需要把所有相关联的副作用喊函数取出并添加到 effectsToRun 中 待执行
        depsMap.forEach((effects, key) => {
            if (key >= Number(newVal)) {
                effects.forEach(effectFn => {
                    if (effectFn !== activeEffect) {
                        effectsToRun.add(effectFn)
                    }
                });
            }
        });
    }

    // 当操作类型为 ADD 或 DELETE 时，才会触发与 ITERATE_KEY 相关联的副作用函数
    // 比较特殊的情况就是集合类型 例如 Map、Set 类型也需要触发副作用函数
    if (
        type === TriggerType.ADD ||
        type === TriggerType.DELETE ||
        (type === TriggerType.SET && toRawType(target) === 'Map')
    ) {
        // 将与 ITERATE_KEY 相关联的副作用函数添加到 effectToRun
        iterateEffects && iterateEffects.forEach(effectFn => {
            if (effectFn !== activeEffect) {
                effectsToRun.add(effectFn)
            }
        })
    }

    if (
        // 操作类型为 ADD 或 DELETE
        (type === "ADD" || type === "DELETE") &&
        // 并且是 Map 类型的数据
        toRawType(target) === 'Map'
    ) {
        // 则取出那些与 MAP_KEY_ITERATE_KEY 相关联的副作用函数并执行
        const iterateEffects = depsMap.get(MAP_KEY_ITERATE_KEY)
        iterateEffects &&
            iterateEffects.forEach(effectFn => {
                if (effectFn !== activeEffect) {
                    effectsToRun.add(effectFn)
                }
            })
    }

    // 执行副作用函数
    triggerEffects(effectsToRun)
}

function triggerEffects(effectsToRun) {
    const effects: any = new Set(effectsToRun)
    // 执行副作用函数
    effects.forEach(effectFn => {
        if (effectFn.options.scheduler) {
            effectFn.options.scheduler(effectFn)
        } else {
            effectFn()
        }
    })
}

let shouldTrack = true

function pauseTracking() {
    shouldTrack = false
}

function enableTracking() {
    shouldTrack = true
}

function isTracking() {
    return shouldTrack && activeEffect !== undefined
}

export { trigger, track, effect, pauseTracking, enableTracking, trackEffects, triggerEffects, isTracking }