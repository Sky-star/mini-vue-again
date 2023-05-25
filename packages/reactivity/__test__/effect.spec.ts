import { describe, expect, it, vi } from 'vitest'
import { effect } from '../src/effect';
import { reactive } from '../src/reactive';

describe('effect', () => {

    it('默认执行一次副作用函数', () => {
        const fn = vi.fn(() => 0)

        effect(fn)

        expect(fn).toBeCalledTimes(1)
    });

    it('响应式数据发生变化会触发副作用函数', () => {
        const foo = reactive({ age: 10 })

        const fn = vi.fn(() => {
            nextAge = foo.age + 1
        })

        let nextAge

        effect(fn)

        expect(nextAge).toBe(11)

        foo.age = 20

        expect(nextAge).toBe(21);

        expect(fn).toBeCalledTimes(2)
    });

    it('副作用函数与响应式属性相关联', () => {

        const foo = reactive({ age: 10 })
        let nextAge

        const fn = vi.fn(() => {
            nextAge = foo.age + 1
        })

        effect(fn)

        foo.age = 20

        expect(fn).toBeCalledTimes(2)

        foo.sex = '1'

        expect(fn).toBeCalledTimes(2)
    });

    it('分支切换不应该使副作用函数重复触发', () => {

        const foo = reactive({ ok: true, text: 'hello world' })
        let text

        const fn = vi.fn(() => {
            text = foo.ok ? foo.text : 'not'
        })

        effect(fn)

        foo.ok = false

        expect(fn).toBeCalledTimes(2)

        foo.text = 'hello vue3'

        expect(fn).toBeCalledTimes(2)

        expect(text).toBe('not');
    });

});