import { describe, expect, it, vi } from 'vitest'
import { reactive } from '../src/reactive';
import { computed } from '../src/computed';
import { effect } from '../src/effect';

describe('computed', () => {
    it('读取计算属性', () => {
        const obj = reactive({ foo: 1, bar: 2 })

        const sumRes = computed(() => {
            return obj.foo + obj.bar
        })

        expect(sumRes.value).toBe(3)
    });

    it('计算属性值的缓存', () => {

        const obj = reactive({ foo: 1, bar: 2 })

        const fn = vi.fn(() => {
            return obj.foo + obj.bar
        })

        const sumRes = computed(fn)

        expect(sumRes.value).toBe(3)
        expect(sumRes.value).toBe(3)
        expect(fn).toBeCalledTimes(1)
    });

    it('effect 内嵌套 computed', () => {

        const obj = reactive({ foo: 1, bar: 2 })

        const sumRes = computed(() => {
            return obj.foo + obj.bar
        })

        let res
        effect(() => {
            res = sumRes.value
        })

        obj.foo++

        expect(res).toBe(4)
    });

});