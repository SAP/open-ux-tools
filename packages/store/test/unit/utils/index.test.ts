import { debug } from 'debug';
import { enableDebugLogger, pick } from '../../../src/utils';

describe('pick', () => {
    it('returns undefined when called on undefined target', () => {
        expect(pick(undefined, 'prop1', 'prop2')).toBeUndefined();
    });

    it('returns undefined when called with no properties', () => {
        expect(pick({ a: 1, b: 2 })).toBeUndefined();
    });

    it('returns a subset of the properties', () => {
        expect(pick({ a: 1, b: 2, c: 3 }, 'a', 'b')).toEqual({ a: 1, b: 2 });
    });

    it('returns all the properties, if asked for', () => {
        expect(pick({ a: 1, b: 2, c: 3 }, 'a', 'c', 'b')).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('returns all the properties, including undefined values, if asked for', () => {
        expect(pick({ a: 1, b: undefined, c: 3 }, 'a', 'c', 'b')).toEqual({ a: 1, b: undefined, c: 3 });
    });

    it('non-existent props get an undefined value', () => {
        const o: { a: number; b?: string; c: number; d?: string } = { a: 1, b: undefined, c: 3 };
        expect(pick(o, 'a', 'd', 'b')).toEqual({ a: 1, b: undefined, d: undefined });
    });
});

describe('enableDebugLogger', () => {
    it('enables debug logging for the correct namespace', () => {
        const mockDebugLogger = jest.spyOn(debug, 'enable');
        const namespace = 'some_random_namespace';

        enableDebugLogger(namespace);

        expect(mockDebugLogger).toBeCalledWith(namespace);
    });
});
