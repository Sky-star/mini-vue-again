import { extend } from '../../shared/src/general';
import { enableTracking, pauseTracking, track, trigger } from './effect';
import { ReactiveFlags, TriggerType, reactive, readonly, isReadonly, ITERATE_KEY } from './reactive';


const get = createGetter()
const shallowGet = createGetter(true)
const readonlyGet = createGetter(false, true)
const shallowReadonlyGet = createGetter(true, true)

const arrayInstrumentations = createArrayInstrumentations()

function createArrayInstrumentations() {
    const instrumentations: Record<string, Function> = {}

        ;['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
            // 取得原始方法
            const originMethod = Array.prototype[method]

            instrumentations[method] = function (...args) {
                // this 是代理对象， 先在代理对象中查找，将结果存储到 res 中
                let res = originMethod.apply(this, args)

                if (res === false || res === -1) {
                    // res 为 false 说明为找到， 通过this.RAW_kEY拿到原始数组，再去其中查找并更新 res 值
                    res = originMethod.apply(this[ReactiveFlags.RAW], args)
                }

                // 返回最终结果
                return res
            }
        })

        //  重写数组的 push、pop、shift、unshift以及splice方法
        ;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
            // 取得原始方法
            const originMethod = Array.prototype[method]
            // 重写
            instrumentations[method] = function (...args) {
                // 在调用原始方法之前禁止追踪
                pauseTracking()
                // 原始方法的默认行为
                let res = originMethod.apply(this, args)
                // 在调用原始方法之后，恢复原来的行为，即允许追踪
                enableTracking()
                // 返回最终结果
                return res
            }
        })

    return instrumentations
}

const set = /*#__PURE__*/ createSetter()

// 拦截读取操作
// 接收一个参数 isShallow, 代表是否为浅响应， 默认为 false, 即非浅响应
// 接收一个参数 isReadonly, 代表是否为只读， 默认为 false, 即非只读
function createGetter(isShallow = false, isReadonly = false) {
    return function get(target, key, receiver) {
        // 代理对象可以通过 raw 属性访问原始数据
        if (key === ReactiveFlags.RAW) {
            return target
        }
        // 代理对象可以通过 IS_REACTIVE 来获取是否是只读对象
        if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        }
        // 通过是否只读，可知该对象是否为响应式对象
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        }

        // 如果操作的目标对象是数组，并且 key 存在于 arrayInstrumentations 上，
        // 那么返回定义在arrayInstrumentations 上的值
        if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
            return Reflect.get(arrayInstrumentations, key, receiver)
        }

        // 得到原始值结果
        const res = Reflect.get(target, key, receiver)
        // 将 副作用函数 activeEffect 存储到容器当中
        // 非只读的时候才需要建立响应联系
        // 如果 key 的类型是 symbol， 则不进行追踪
        if (!isReadonly && typeof key !== 'symbol') {
            track(target, key)
        }

        // 如果是浅响应
        if (isShallow) {
            return res
        }

        if (typeof res === 'object' && res !== null) {
            // 调用 reactive 将结果包装成响应式数据并返回
            return isReadonly ? readonly(res) : reactive(res)
        }
        // 返回属性值
        return res
    }
}

// 拦截设置操作
function createSetter() {
    return function set(target, key, value, receiver) {
        // 先获取旧值
        const oldValue = target[key];
        // 如果是只读的， 则打印警告信息并返回
        if (isReadonly(target)) {
            console.warn(`属性 ${String(key)} 是只读的`)
            return true
        }
        // 如果代理目标时数组， 则检测被设置的索引值是否小于数组长度,
        // 如果是，则视作 SET 操作， 否则是 ADD 操作
        // 如果属性不存在，则说明是在添加新的属性，否者是设置已有属性
        const type = Array.isArray(target)
            ? Number(key) < target.length ? TriggerType.SET : TriggerType.ADD
            : Object.prototype.hasOwnProperty.call(target, key) ? TriggerType.SET : TriggerType.ADD;
        // 设置属性值
        const res = Reflect.set(target, key, value, receiver);
        // 只有当 receiver 是 target 的代理对象时才进行响应(原型继承的问题)
        if (target === receiver[ReactiveFlags.RAW]) {
            // 如果值发生了变化再触发响应，并且需要处理下 NaN 的问题
            if (value !== oldValue && (oldValue === oldValue || value === value)) {
                // 将副作用函数从容器中取出并执行
                trigger(target, key, type, value);
            }
        }

        return res;
    }
}

// 拦截 in 操作
function has(target, key) {
    track(target, key);
    return Reflect.has(target, key);
}

// 拦截 for...in 操作
function ownKeys(target) {
    // 将副作用函数与 ITERATE_KEY 相关联
    track(target, ITERATE_KEY);
    return Reflect.ownKeys(target);
}

// 拦截 delete操作
function deleteProperty(target, key) {
    // 如果是只读的， 则打印警告信息并返回
    if (isReadonly(target)) {
        console.warn(`属性 ${String(key)} 是只读的`)
        return true
    }
    // 检查被操作的属性是否是对象自己的属性
    const hadKey = Object.prototype.hasOwnProperty.call(target, key);

    // 使用 Reflect.deleteProperty 完成属性删除
    const res = Reflect.deleteProperty(target, key);

    if (hadKey && res) {
        // 只有当删除的属性时对象自己的属性并且成功删除时，才触发更新
        trigger(target, key, TriggerType.DELETE);
    }

    return res;
}

const mutableHandlers = {
    get,
    set,
    deleteProperty,
    has,
    ownKeys
}

const readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
        console.warn(
            `Set operation on key "${String(key)}" failed: target is readonly.`,
            target
        )
        return true
    }
}

const shallowReactiveHandlers = extend({}, mutableHandlers, {
    get: shallowGet,
    set,
})

const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
})

export { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers }