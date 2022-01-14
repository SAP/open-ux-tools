import { Transport } from '../../src/types';

describe('Transport', () => {
    describe('copy()', () => {
        it('Cannot change a property of the returned object', () => {
            const copiedObj = new (class extends Transport {})().copy({ a: 42, b: { nestedKey: 13 } });
            expect(() => {
                copiedObj.a = 13;
            }).toThrow(TypeError);
        });
        it('Cannot add a property of the returned object', () => {
            const copiedObj = new (class extends Transport {})().copy({ a: 42, b: { nestedKey: 13 } });
            expect(() => {
                (copiedObj as any).noSuchProperty = 13;
            }).toThrow(TypeError);
        });
        it('Deep clones the object passed in', () => {
            const originalObj = { a: [1, 2, 3], b: { foo: 42 } };
            const copiedObj = new (class extends Transport {})().copy(originalObj);
            originalObj.a.push(4);
            originalObj.b.foo = 13;
            expect(copiedObj).not.toBe(originalObj);
            expect(copiedObj).toStrictEqual({ a: [1, 2, 3], b: { foo: 42 } });
        });
    });
});
