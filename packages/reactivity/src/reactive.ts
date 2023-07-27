import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from './baseHandlers';
import { track, trigger } from './effect';

const ITERATE_KEY = Symbol()

const TriggerType = {
    SET: 'SET',
    ADD: 'ADD',
    DELETE: 'DELETE'
}

const ReactiveFlags = {
    IS_REACTIVE: '__v_isReactive',
    IS_READONLY: '__v_isReadonly',
    RAW: '__v_raw'
}

// 定义一个 Map 实例，存储原始对象与代理对象的映射
const reactiveMap = new Map()

function reactive(obj) {
    return createReactiveObject(obj, mutableHandlers);
}

function shallowReactive(obj) {
    return createReactiveObject(obj, shallowReactiveHandlers)
}

function readonly(obj) {
    return createReactiveObject(obj, readonlyHandlers)
}

function shallowReadonly(obj) {
    return createReactiveObject(obj, shallowReadonlyHandlers)
}

function createReactiveObject(target, baseHandlers) {
    // 优先通过原始对象 data 寻找之前创建的代理对象， 如果找到了，直接返回已有的代理对象
    const existProxy = reactiveMap.get(target);
    if (existProxy) return existProxy;

    // 否则， 创建新的代理对象
    const proxy = new Proxy(target, baseHandlers);

    // 存储到 Map 中，从而避免重复创建
    reactiveMap.set(target, proxy);

    return proxy;
}

function isReadonly(obj) {
    return !!obj[ReactiveFlags.IS_READONLY]
}

function isReactive(obj) {
    return !!obj[ReactiveFlags.IS_REACTIVE]
}

export { reactive, shallowReactive, readonly, shallowReadonly, isReactive, isReadonly, ITERATE_KEY, TriggerType, ReactiveFlags }