import { toRawType } from '../../shared/src/general';
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from './baseHandlers';
import { collectionHandlers } from './collectionHandlers';
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

const enum TargetType {
    INVALID = 0,
    COMMON = 1,
    COLLECTION = 2
}

function targetTypeMap(rawType: string) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return TargetType.COMMON
        case 'Map':
        case 'Set':
            return TargetType.COLLECTION
        default:
            return TargetType.INVALID
    }
}

function getTargetType(target) {
    return targetTypeMap(toRawType(target))
}

// 定义一个 Map 实例，存储原始对象与代理对象的映射
const reactiveMap = new Map()

function reactive(obj) {
    return createReactiveObject(obj, mutableHandlers, collectionHandlers);
}

function shallowReactive(obj) {
    return createReactiveObject(obj, shallowReactiveHandlers, collectionHandlers)
}

function readonly(obj) {
    return createReactiveObject(obj, readonlyHandlers, collectionHandlers)
}

function shallowReadonly(obj) {
    return createReactiveObject(obj, shallowReadonlyHandlers, collectionHandlers)
}

function createReactiveObject(target, baseHandlers, collectionHandlers) {
    // 优先通过原始对象 data 寻找之前创建的代理对象， 如果找到了，直接返回已有的代理对象
    const existProxy = reactiveMap.get(target);
    if (existProxy) return existProxy;

    // 获取原始对象的类型
    const targetType = getTargetType(target)

    // 否则， 创建新的代理对象
    const proxy = new Proxy(
        target,
        // 根据不同的类型选择不同处理方式
        targetType == TargetType.COLLECTION ? collectionHandlers : baseHandlers
    );

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