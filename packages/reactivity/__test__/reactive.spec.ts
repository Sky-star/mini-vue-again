import { describe, expect, it } from 'vitest';
import { reactive } from '../src/reactive';

describe('reactive', () => {
    it('should different', () => {
        const original = { age: 10 }
        const after = reactive(original)

        expect(original).not.toBe(after)
        expect(after.age).toBe(10)
    });

    it('this指向问题应该正确响应', () => {
        const obj = {
            foo: 1,
            get bar() {
                return this.foo
            }
        }

        const p = reactive(obj)

        p.foo++

        expect(p.foo).toBe(2)
    });
});
