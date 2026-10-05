import { doesPropertyExist, stripSpaces, escapeSingleQuotes, escapeDoubleQuotes, initI18n } from '../src/index.js';

describe('File System Utils', () => {
    beforeAll(async () => {
        await initI18n();
    });

    describe('doesPropertyExist', () => {
        test('should return true for existing property', () => {
            const obj = { foo: { bar: 'value' }, baz: 123 };
            expect(doesPropertyExist(obj, 'foo')).toBe(true);
            expect(doesPropertyExist(obj, 'baz')).toBe(true);
        });

        test('should return false for non-existing property', () => {
            const obj = { foo: { bar: 'value' } };
            expect(doesPropertyExist(obj, 'missing')).toBe(false);
            expect(doesPropertyExist(obj, 'notThere')).toBe(false);
        });

        test('should handle objects with nested properties', () => {
            const obj = { foo: { bar: 'value' } };
            expect(doesPropertyExist(obj, 'foo')).toBe(true);
            expect(doesPropertyExist(obj.foo, 'bar')).toBe(true);
        });
    });

    describe('stripSpaces', () => {
        test('should remove spaces from string', () => {
            expect(stripSpaces('  hello  world  ')).toBe('helloworld');
            expect(stripSpaces('no spaces')).toBe('nospaces');
        });

        test('should handle empty string', () => {
            expect(stripSpaces('')).toBe('');
            expect(stripSpaces('   ')).toBe('');
        });
    });

    describe('escapeSingleQuotes', () => {
        test('should escape single quotes', () => {
            expect(escapeSingleQuotes("it's a test")).toBe("it\\'s a test");
            expect(escapeSingleQuotes("don't")).toBe("don\\'t");
        });

        test('should handle string without quotes', () => {
            expect(escapeSingleQuotes('no quotes')).toBe('no quotes');
        });
    });

    describe('escapeDoubleQuotes', () => {
        test('should escape double quotes', () => {
            expect(escapeDoubleQuotes('say "hello"')).toBe('say \\"hello\\"');
        });

        test('should handle string without quotes', () => {
            expect(escapeDoubleQuotes('no quotes')).toBe('no quotes');
        });
    });
});
