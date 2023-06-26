import { track, trigger } from './effect';

const ITERATE_KEY = Symbol()

const RAW_KEY = Symbol()

const TriggerType = {
    SET: 'SET',
    ADD: 'ADD',
    DELETE: 'DELETE'
}


function reactive(data) {
    return createReactive(data);
}

function shallowReactive(data) {
    return createReactive(data, true)
}

// 封装 createReactive 函数， 接收一个参数 isShallow, 代表是否为浅响应， 默认为 false, 即非浅响应
function createReactive(data: any, isShallow = false) {
    const proxy = new Proxy(data, {
        // 拦截读取操作
        get(target, key, receiver) {
            // 代理对象可以通过 raw 属性访问原始数据
            if (key === RAW_KEY) {
                return target
            }
            // 得到原始值结果
            const res = Reflect.get(target, key, receiver)
            // 将 副作用函数 activeEffect 存储到容器当中
            track(target, key)

            // 如果是浅响应
            if (isShallow) {
                return res
            }

            if (typeof res === 'object' && res !== null) {
                // 调用 reactive 将结果包装成响应式数据并返回
                return reactive(res)
            }
            // 返回属性值
            return res
        },
        // 拦截设置操作
        set(target, key, newValue, receiver) {
            // 先获取旧值
            const oldValue = target[key];
            // 如果属性不存在， 则说明添加新属性， 否则是设置已有属性
            const type = Object.prototype.hasOwnProperty.call(target, key) ? TriggerType.SET : TriggerType.ADD;
            // 设置属性值
            const res = Reflect.set(target, key, newValue, receiver);
            // 只有当 receiver 是 target 的代理对象时才进行响应(原型继承的问题)
            if (target === receiver[RAW_KEY]) {
                // 如果值发生了变化再触发响应，并且需要处理下 NaN 的问题
                if (newValue !== oldValue && (oldValue === oldValue || newValue === newValue)) {
                    // 将副作用函数从容器中取出并执行
                    trigger(target, key, type);
                }
            }

            return res;
        },
        // 拦截 in 操作
        has(target, key) {
            track(target, key);
            return Reflect.has(target, key);
        },
        // 拦截 for...in 操作
        ownKeys(target) {
            // 将副作用函数与 ITERATE_KEY 相关联
            track(target, ITERATE_KEY);
            return Reflect.ownKeys(target);
        },
        // 拦截 delete操作
        deleteProperty(target, key) {
            // 检查被操作的属性是否是对象自己的属性
            const hadKey = Object.prototype.hasOwnProperty.call(target, key);

            // 使用 Reflect.deleteProperty 完成属性删除
            const res = Reflect.deleteProperty(target, key);

            if (hadKey && res) {
                // 只有当删除的属性时对象自己的属性并且成功删除时，才触发更新
                trigger(target, key, TriggerType.DELETE);
            }

            return res;
        },
    });

    return proxy;
}

export { reactive, shallowReactive, ITERATE_KEY, TriggerType }