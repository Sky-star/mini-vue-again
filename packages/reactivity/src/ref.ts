import { hasChanged, isObject } from "../../shared/src/general"
import { isTracking, trackEffects, trigger, triggerEffects } from "./effect"
import { toRaw, toReactive } from "./reactive"

class RefImpl {
    private _value: any
    private _rawValue: any
    public dep
    public __v_isRef = true

    constructor(value) {
        // 原始值
        this._rawValue = toRaw(value)
        this._value = toReactive(value)
        this.dep = new Set()
    }

    get value() {
        // 获取 value 触发依赖收集
        trackRefValue(this)
        return this._value
    }

    set value(newValue) {
        // 需要比较原始对象，非代理对象
        newValue = toRaw(newValue)
        // 防止相同的值重复触发
        if (hasChanged(this._rawValue, newValue)) {
            this._value = toReactive(newValue)
            this._rawValue = newValue
            triggerEffects(this.dep)
        }
    }
}

function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep)
    }
}

export function ref(val) {
    return new RefImpl(val)
}

export function isRef(ref) {
    return !!ref.__v_isRef
}

export function unRef(val) {
    return isRef(val) ? val.value : val
}

export function toRef(obj, key) {
    if (isRef(obj)) {
        return obj
    } else if (isObject(obj)) {
        return propertyToRef(obj, key)
    } else {
        return ref(obj)
    }
}

export function toRefs(obj) {
    const ret = {}

    for (const key in obj) {
        ret[key] = toRef(obj, key)
    }

    return ret
}

function propertyToRef(obj, key) {
    const val = obj[key]
    return isRef(val) ? val : new RefImpl(val)
}

// 自动脱 ref
export function proxyRefs(target) {
    return new Proxy(target, {
        get(target, key, receiver) {
            const value = Reflect.get(target, key, receiver)
            // 自动脱 ref 实现: 如果读取的值是 ref， 则返回它的 value 属性值
            return isRef(value) ? value.value : value
        },
        set(target, key, newValue, receiver) {
            // 通过 target 读取真实值
            const value = target[key]
            // 如果是 ref，则设置其对应的 value 属性值
            // 并且新设置的值也不能是 ref 类型
            if (isRef(value) && !isRef(newValue)) {
                value.value = newValue
                return true
            }

            return Reflect.set(target, key, newValue, receiver)
        },
    })
}
