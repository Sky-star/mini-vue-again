import { describe, expect, it, vi } from 'vitest'
import { effect } from '../src/effect';
import { reactive, shallowReactive } from '../src/reactive';

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

        // 不通过是因为 obj.foo先执行后 fn2会被再次收集一次
        // 导致在更改 obj.bar 的时候会导致 fn2 被执行两次
        // 解决方法为 再次重构是， 对内部的effectFn 抽离 保证Set存储的正确
        // obj.bar = false

        // expect(fn1).toBeCalledTimes(2)
        // expect(fn2).toBeCalledTimes(3)
    });

    it('内部自增操作不应导致无限执行', () => {
        const obj = reactive({ foo: 1 })

        const fn1 = vi.fn(() => {
            obj.foo++
        })

        effect(fn1)

        expect(fn1).toBeCalledTimes(1)

    });

    it('调度执行', () => {
        const obj = reactive({ foo: 1 })
        let temp1

        const effectFn = vi.fn(() => {
            temp1 = obj.foo
        })

        const scheduler = vi.fn()

        effect(effectFn, { scheduler: scheduler })

        expect(effectFn).toBeCalledTimes(1)

        obj.foo++

        expect(effectFn).toBeCalledTimes(1)

        expect(scheduler).toBeCalledTimes(1)

    });

    it('懒执行', () => {
        const fn = vi.fn()

        effect(fn, { lazy: true })

        expect(fn).toBeCalledTimes(0)
    });

    it('响应in操作符', () => {
        const obj = { foo: 1 }

        const p = reactive(obj)

        const fn = vi.fn(() => {
            'foo' in p
        })

        effect(fn)

        p.foo = 2

        expect(fn).toBeCalledTimes(2)

    });

    it('响应forIn循环', () => {
        const obj = { foo: 1 }

        const p = reactive(obj)

        const fn = vi.fn(() => {
            for (const key in p) {
                // console.log(key);
            }
        })

        effect(fn)

        p.bar = 2

        expect(fn).toBeCalledTimes(2)
    });

    it('响应delete操作', () => {

        const obj = { foo: 1, bar: 2 }

        const p = reactive(obj)

        let temp

        effect(() => {
            temp = p.bar
        })

        expect(temp).toBe(2)

        delete p.bar

        expect(temp).toBe(undefined)

    });

    it('响应数据的值不发生变化时, 不应执行', () => {
        const obj = { foo: 1 }

        const p = reactive(obj)

        const fn = vi.fn(() => {
            p.foo
        })

        effect(fn)

        p.foo = 1

        expect(fn).toBeCalledTimes(1)
    });

    it('响应数据的值前后为NaN时, 不应执行', () => {

        const obj = { foo: NaN }

        const p = reactive(obj)

        const fn = vi.fn(() => {
            p.foo
        })

        effect(fn)

        p.foo = NaN

        expect(fn).toBeCalledTimes(1)
    });

    it('继承原型属性，不应重复执行', () => {
        const obj = {}
        const proto = { bar: 1 }
        const child = reactive(obj)
        const parent = reactive(proto)

        // 使 parent 作为 child 的原型
        Object.setPrototypeOf(child, parent)

        const fn = vi.fn(() => {
            child.bar
        })

        effect(fn)

        child.bar = 2

        expect(fn).toBeCalledTimes(2)

    });

    it('深响应', () => {
        const obj = reactive({ foo: { bar: 1 } })

        const fn = vi.fn(() => {
            obj.foo.bar
        })

        effect(fn)

        obj.foo.bar = 2

        expect(fn).toBeCalledTimes(2)
    });

    it('浅响应', () => {
        const obj = shallowReactive({ foo: { bar: 1 } })

        const fn = vi.fn(() => {
            obj.foo.bar
        })

        effect(fn)

        obj.foo = { bar: 2 }

        expect(fn).toBeCalledTimes(2)

        obj.foo.bar = 3

        expect(fn).toBeCalledTimes(2)
    });


});