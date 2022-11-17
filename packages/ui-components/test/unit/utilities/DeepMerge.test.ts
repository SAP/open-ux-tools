import { deepMerge } from '../../../src/utilities/DeepMerge';

describe('deepMerge', () => {
    test('do not mutate parameters', () => {
        expect(deepMerge(Object.freeze({ a: 1 }), Object.freeze({ a: 2, b: 3 }))).toStrictEqual({ a: 2, b: 3 });
    });

    test('simple objects', () => {
        expect(deepMerge({ a: 1 }, { a: 2, b: 3 })).toStrictEqual({ a: 2, b: 3 });
    });

    test('simple objects - handle undefined', () => {
        expect(deepMerge({ a: 1 }, { a: undefined })).toStrictEqual({ a: undefined });
    });

    test('simple objects - handle empty', () => {
        expect(deepMerge({ a: 1 }, {})).toStrictEqual({ a: 1 });
    });

    test('arrays', () => {
        expect(deepMerge({ a: [1, 2] }, { a: [3, 4], b: 3 })).toStrictEqual({ a: [3, 4], b: 3 });
    });

    test('nested value in the first parameter', () => {
        expect(deepMerge({ a: 1, nested: { x: 13 } }, { a: 2, b: 3 })).toStrictEqual({ a: 2, nested: { x: 13 }, b: 3 });
    });

    test('nested value in the second parameter', () => {
        expect(deepMerge({ a: 1 }, { a: 2, b: 3, nested: { x: 13 } })).toStrictEqual({ a: 2, nested: { x: 13 }, b: 3 });
    });

    test('nested value in both parameter', () => {
        expect(deepMerge({ a: 1, nested: { x: 13 } }, { a: 2, b: 3, nested: { y: 13 } })).toStrictEqual({
            a: 2,
            nested: { x: 13, y: 13 },
            b: 3
        });
    });

    test('throw if structures are not compatible', () => {
        expect(() => {
            deepMerge({ a: 1, nested: 'abc' }, { a: 2, b: 3, nested: { y: 13 } });
        }).toThrow('Object structures are not compatible!');
    });

    test('functions', () => {
        const fnTest1 = jest.fn();
        const fnTest2 = jest.fn();
        const fnTestOverwrite = jest.fn();
        const fnTestNested = jest.fn();
        expect(
            deepMerge({ a1: fnTest1, a2: jest.fn() }, { a2: fnTestOverwrite, b: fnTest2, nested: { x: fnTestNested } })
        ).toStrictEqual({ a1: fnTest1, a2: fnTestOverwrite, b: fnTest2, nested: { x: fnTestNested } });
    });
});
