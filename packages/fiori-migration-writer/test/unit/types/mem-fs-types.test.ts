import { hasStore } from '../../../src/types/mem-fs-types.js';
import { createMemFsEditor } from '../../../src/utils/fs-adapter.js';

describe('mem-fs-types', () => {
    describe('hasStore', () => {
        test('should return true for mem-fs editor with store', () => {
            const editor = createMemFsEditor();
            expect(hasStore(editor)).toBe(true);
        });

        test('should return false for object without store', () => {
            const fakeEditor = {
                read: jest.fn(),
                write: jest.fn(),
                delete: jest.fn()
            } as any;
            expect(hasStore(fakeEditor)).toBe(false);
        });

        test('should return false for object with store but no each method', () => {
            const fakeEditor = {
                store: {},
                read: jest.fn(),
                write: jest.fn(),
                delete: jest.fn()
            } as any;
            expect(hasStore(fakeEditor)).toBe(false);
        });

        test('should return false for object with store.each not a function', () => {
            const fakeEditor = {
                store: { each: 'not a function' },
                read: jest.fn(),
                write: jest.fn(),
                delete: jest.fn()
            } as any;
            expect(hasStore(fakeEditor)).toBe(false);
        });
    });
});
