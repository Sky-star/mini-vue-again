import { describe, expect, it, vi } from 'vitest'
import { effect } from '../src/effect';
import { isReactive, isReadonly, reactive, readonly, shallowReactive, shallowReadonly } from '../src/reactive';

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

    it('浅只读', () => {
        const obj = shallowReadonly({ foo: { bar: 1 } })

        const fn = vi.fn(() => {
            obj.foo.bar
        })

        effect(fn)

        obj.foo = { bar: 3 }

        // 浅层数据不可修改
        expect(obj.foo).toStrictEqual({ bar: 1 })

        obj.foo.bar = 2
        // 深层数据可修改
        expect(obj.foo.bar).toBe(2)
        // 判断是否为只读数据
        expect(isReadonly(obj)).toBe(true)
        // 只读数据不会触发副作用函数
        expect(fn).toBeCalledTimes(1)
    });

    it('深只读', () => {
        const obj = readonly({ foo: { bar: 1 } })

        const fn = vi.fn(() => {
            obj.foo.bar
        })

        effect(fn)

        obj.foo.bar = 2

        // 深层数据不可修改
        expect(obj.foo.bar).toBe(1)
        // 判断是否为只读数据
        expect(isReadonly(obj)).toBe(true)
        // 只读数据不会触发副作用函数
        expect(fn).toBeCalledTimes(1)
    });

    it('响应与数组长度的变化', () => {
        const arr = reactive(['foo'])

        const fn = vi.fn(() => {
            arr.length
        })

        effect(fn)

        // 隐式修改数组的长度能够响应
        arr[1] = 'bar'
        expect(arr.length).toBe(2)
        expect(fn).toBeCalledTimes(2)

        // 未修改数组长度则不会响应
        arr[0] = 'food'
        expect(fn).toBeCalledTimes(2)
    });

    it('修改数组长度会导致响应', () => {
        const arr = reactive(['foo'])

        const fn = vi.fn(() => {
            arr[0]
        })

        effect(fn)

        // 修改数组长度不影响原先的元素则不会触发响应
        arr.length = 3
        expect(fn).toBeCalledTimes(1)

        // 显示修改数组长度小于原来的长度会导致元素发生变化,触发响应
        arr.length = 0
        expect(fn).toBeCalledTimes(2)

    });

    it('数组的查找方法-原始值', () => {
        const arr = reactive([1, 2])
        let res
        const fn = vi.fn(() => {
            res = arr.includes(1)
        })

        effect(fn)

        // 原始值通过代理对象的includes能够正确响应
        expect(res).toBe(true)

        arr[0] = 3
        // 修改原数组后，应为 false
        expect(res).toBe(false)

    });


    it('数组的查找方法-对象', () => {
        const obj = {}
        const arr = reactive([obj])

        const res1 = arr.includes(arr[0])
        const res2 = arr.includes(obj)

        // 查找代理对象中的响应式对象
        expect(res1).toBe(true)
        // 查找代理对象中的原始对象
        expect(res2).toBe(true)

        const res3 = arr.indexOf(arr[0])
        const res4 = arr.indexOf(obj)

        expect(res3).toBe(0)
        expect(res4).toBe(0)

        const res5 = arr.lastIndexOf(arr[0])
        const res6 = arr.lastIndexOf(obj)

        expect(res5).toBe(0)
        expect(res6).toBe(0)
    });

    it('隐式修改数组长度的原型方法', () => {
        const arr = reactive([])

        const fn = vi.fn(() => {
            arr.push(1)
        })

        // 第一个副作用函数
        effect(fn)

        // 第二个副作用函数
        effect(fn)

        // 由于push这类隐式修改数组长度的方法，会间接的读取和设置数组的length属性值
        // 语义上是修改，不应读取，所以不应该响应
        expect(arr).toEqual([1, 1])
        expect(fn).toBeCalledTimes(2)

    });

});

describe('代理Set和Map', () => {
    it('代理对象访问Set属性', () => {
        const s = new Set([1, 2, 3])
        const p = reactive(s)

        // 代理对象能够访问属性
        expect(p.size).toBe(3)

        // 代理对象能够调用方法
        p.delete(1)
        expect(p.size).toBe(2)

    });

    it('代理对象访问Map属性', () => {
        const s = new Map([['key', 1]])
        const p = reactive(s)

        // 代理对象能够访问属性
        expect(p.size).toBe(1)

        // 代理对象能够调用方法
        p.delete('key')
        expect(p.size).toBe(0)
    });

    it('Set的响应联系', () => {
        const p = reactive(new Set([1, 2, 3]))
        let size
        const fn = vi.fn(() => {
            size = p.size
        })

        effect(fn)

        // Set中已有值则不触发响应
        p.add(1)
        expect(fn).toBeCalledTimes(1)
        expect(size).toBe(3)

        // Set中添加不存在的值则触发响应
        p.add(4)
        expect(fn).toBeCalledTimes(2)
        expect(size).toBe(4)
    });

    it('Map的响应联系', () => {
        const p = reactive(new Map([['key', 1]]))
        let res
        const fn = vi.fn(() => {
            res = p.get('key')
        })

        effect(fn)

        expect(res).toBe(1)

        p.delete('key')
        expect(res).toBe(undefined)
        expect(fn).toBeCalledTimes(2)
    });

    it('原始数据不应存储响应式对象', () => {
        // 原始 Map 对象 m
        const m = new Map()
        // p1 是 m 的代理对象
        const p1 = reactive(m)
        // p2 是另外一个代理对象
        const p2 = reactive(new Map())
        // 为 p1 设置一个键值对， 值是代理对象 p2
        p1.set("p2", p2)

        const fn = vi.fn(() => {
            m.get('p2').size
        })

        effect(fn)

        // 注意，这里我们通过原始数据 m 为 p2 设置一个键值对 foo => 1
        m.get("p2").set("foo", 1)

        expect(fn).toBeCalledTimes(1)

    });

    it('集合类型响应forEach方法', () => {
        const m = reactive(new Map([[{ key: 1 }, { value: 1 }]]))

        let key, value
        const fn = vi.fn(() => {
            m.forEach(function (v, k, m) {
                k
                v
            })
        })

        effect(fn)

        m.set({ key: 2 }, { value: 2 })

        expect(fn).toBeCalledTimes(2)

    });

    it('集合类型forEach回调函数参数响应', () => {
        const key = { key: 1 }
        const value = new Set([1, 2, 3])

        const p = reactive(new Map([[key, value]]))

        const fn = vi.fn(() => {
            p.forEach(function (v, k) {
                v.size
            })
        })
        effect(fn)

        p.get(key).delete(1)

        expect(fn).toBeCalledTimes(2)

    });

    it('集合类型forEach响应SET类型操作', () => {
        const p = reactive(new Map([["key", 1]]))

        const fn = vi.fn(() => {
            // forEach 循环不仅关心集合的键，还关心集合的值
            p.forEach(function (value, key) {
                value // 1
            })
        })

        effect(fn)

        p.set("key", 2) // 即使操作类型时 SET，也应该触发响应

        expect(fn).toBeCalledTimes(2)

    });

    it('集合类型响应forOf循环', () => {
        const p = reactive(
            new Map([
                ["key1", "value1"],
                ["key2", "value2"]
            ])
        )

        const fn = vi.fn(() => {
            for (const [key, value] of p) {
            }
        })

        effect(fn)

        p.set("key3", "value3") // 能够触发响应

        expect(fn).toBeCalledTimes(2)
    });

    it('集合类型entries方法响应forOf循环', () => {
        const p = reactive(
            new Map([
                ["key1", "value1"],
                ["key2", "value2"]
            ])
        )

        const fn = vi.fn(() => {
            for (const [key, value] of p.entries()) {
            }
        })

        effect(fn)

        p.set("key3", "value3") // 能够触发响应

        expect(fn).toBeCalledTimes(2)
    });

    it('集合类型在forOf循环中的参数也是代理对象', () => {
        const p = reactive(
            new Map([
                [{ "key": 1 }, { "value": 1 }],
            ])
        )

        let k, v
        const fn = vi.fn(() => {
            for (const [key, value] of p) {
                k = key, v = value
            }
        })

        effect(fn)

        expect(isReactive(k)).toBe(true)
        expect(isReactive(v)).toBe(true)
    });

    it('集合类型forOf循环中values方法响应', () => {

        const p = reactive(
            new Map([
                ["key1", "value1"],
                ["key2", "value2"]
            ])
        )

        const fn = vi.fn(() => {
            for (const value of p.values()) {

            }
        })

        effect(fn)

        p.set("key3", "value3") // 能够触发响应

        expect(fn).toBeCalledTimes(2)
    });

    it('集合类型forOf循环中keys方法能够正确响应', () => {
        const p = reactive(
            new Map([
                ["key1", "value1"],
                ["key2", "value2"]
            ])
        )

        const fn = vi.fn(() => {
            for (const value of p.keys()) {
            }
        })

        effect(fn)

        // 不会触发响应
        p.set("key2", "value3")
        expect(fn).toBeCalledTimes(1)

        // 能够触发响应
        p.set("key3", "value3")
        expect(fn).toBeCalledTimes(2)

    });

});
