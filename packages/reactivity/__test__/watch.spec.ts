import { describe, expect, it, vi } from 'vitest'
import { watch } from '../src/watch';
import { reactive } from '../src/reactive';

describe('watch', () => {
    it('监听所有数据变化', () => {

        const obj = reactive({ foo: 1, bar: 1 })
        const fn = vi.fn()
        watch(obj, fn)

        expect(fn).toBeCalledTimes(0)

        obj.foo++
        expect(fn).toBeCalledTimes(1)

        obj.bar++
        expect(fn).toBeCalledTimes(2)
    });

    it('可以监听单独某项数据的变化', () => {

        const obj = reactive({ foo: 1, bar: 1 })
        const fn = vi.fn()
        watch(() => obj.foo, fn)

        expect(fn).toBeCalledTimes(0)

        obj.bar++
        expect(fn).toBeCalledTimes(0)

        obj.foo++
        expect(fn).toBeCalledTimes(1)

    });

    it('可以获取新旧值的变化', () => {

        const obj = reactive({ foo: 1, bar: 1 })
        let oldVal, newVal
        watch(() => obj.foo, (newValue, oldValue) => {
            newVal = newValue
            oldVal = oldValue
        })

        expect(newVal).toBe(undefined)
        expect(oldVal).toBe(undefined)

        obj.foo++

        expect(newVal).toBe(2)
        expect(oldVal).toBe(1)
    });

    it('立即执行', () => {
        const obj = reactive({ foo: 1, bar: 1 })
        const fn = vi.fn()
        watch(() => obj.foo, fn, { immediate: true })

        expect(fn).toBeCalledTimes(1)
    });

    it('回调执行时机-pre', () => {

        const obj = reactive({ foo: 1, bar: 1 })
        let newValue = obj.foo
        const fn = vi.fn((newVal, oldVal) => {
            newValue = newVal
            expect(obj.foo).toBe(2)
        })

        watch(() => obj.foo, fn, { flush: 'pre' })

        obj.foo++
        expect(newValue).toBe(2)
    });

    it('回调执行时机-post', () => {

        const obj = reactive({ foo: 1, bar: 1 })
        let newValue = obj.foo
        const fn = vi.fn((newVal, oldVal) => {
            newValue = newVal
            expect(obj.foo).toBe(2)
        })

        watch(() => obj.foo, fn, { flush: 'post' })

        obj.foo++
        expect(newValue).toBe(1)
    });
});