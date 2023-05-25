import { describe, expect, it } from 'vitest';
import { reactive } from '../src/reactive';

describe('reactive', () => {
    it('should different', () => {
        const original = { age: 10 }
        const after = reactive(original)

        expect(original).not.toBe(after)
        expect(after.age).toBe(10)
    });
});