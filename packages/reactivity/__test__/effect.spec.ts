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

    it('effect函数嵌套问题', () => {
        const obj = reactive({ foo: true, bar: true })
        let temp1, temp2
        const fn1 = vi.fn(() => {

            console.log('fn1 执行');

            effect(fn2)

            temp1 = obj.foo
        })

        const fn2 = vi.fn(() => {
            console.log('fn2 执行');
            temp2 = obj.bar
        })

        effect(fn1)

        expect(fn1).toBeCalledTimes(1)
        expect(fn2).toBeCalledTimes(1)

        obj.foo = false

        expect(fn1).toBeCalledTimes(2)
        expect(fn2).toBeCalledTimes(2)

        // obj.bar = false

        // expect(fn1).toBeCalledTimes(2)
        // expect(fn2).toBeCalledTimes(3)
    });

});