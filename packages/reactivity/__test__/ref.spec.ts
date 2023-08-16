import { describe, expect, it, vi } from 'vitest'
import { isRef, proxyRefs, ref, toRef, unRef } from '../src/ref';
import { effect } from '../src/effect';
import { reactive } from '../src/reactive';
describe('ref', () => {
    it('ref 有 value 属性', () => {
        const a = ref(0)
        expect(a.value).toBe(0)
        a.value = 2
        expect(a.value).toBe(2)
    });

    it('具有响应式', () => {
        const a = ref(1)
        let dummy
        const fn = vi.fn(() => {
            dummy = a.value
        })
        effect(fn)
        expect(fn).toBeCalledTimes(1)
        expect(dummy).toBe(1)
        a.value = 2
        expect(fn).toBeCalledTimes(2)
        expect(dummy).toBe(2)
        // 相同的值不应该被触发
        a.value = 2
        expect(fn).toBeCalledTimes(2)
    });

    it('可以响应非原始值数据', () => {
        const a = ref({ count: 1 })
        let dummy

        effect(() => {
            dummy = a.value.count
        })

        expect(dummy).toBe(1)
        a.value.count = 2
        expect(dummy).toBe(2)
    });

    it('isRef', () => {
        const a = ref(1)
        const user = reactive({
            age: 1
        })
        expect(isRef(a)).toBe(true)
        expect(isRef(1)).toBe(false)
        expect(isRef(user)).toBe(false)
    });

    it('unRef', () => {
        const a = ref(1)
        expect(unRef(a)).toBe(1)
        expect(unRef(1)).toBe(1)
    });

    it('proxyRefs', () => {
        const user = {
            age: ref(10),
            name: "kevin"
        }

        const proxyUser = proxyRefs(user)
        expect(user.age.value).toBe(10)
        expect(proxyUser.age).toBe(10)
        expect(proxyUser.name).toBe("kevin")

        proxyUser.age = 20
        expect(proxyUser.age).toBe(20)
        expect(user.age.value).toBe(20)

        proxyUser.age = ref(10)
        expect(proxyUser.age).toBe(10)
        expect(user.age.value).toBe(10)
    });
});