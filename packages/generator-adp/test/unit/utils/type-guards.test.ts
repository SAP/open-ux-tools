import { isRecordOfStrings, isString } from '../../../src/utils/type-guards';

describe('isString', () => {
    it('should return true for string literals', () => {
        expect(isString('hello')).toBe(true);
        expect(isString('')).toBe(true);
        expect(isString(String('test'))).toBe(true);
    });

    it('should return false for non-string types', () => {
        expect(isString(123)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString({})).toBe(false);
        expect(isString([])).toBe(false);
        expect(isString(() => {})).toBe(false);
        expect(isString(Symbol('s'))).toBe(false);
        expect(isString(true)).toBe(false);
    });

    it('should return false for objects created with new String()', () => {
        expect(isString(new String('abc'))).toBe(false); // because typeof is 'object'
    });
});

describe('isRecordOfStrings', () => {
    it('should return true for plain objects with only string values', () => {
        expect(isRecordOfStrings({ a: 'hello', b: 'world' })).toBe(true);
        expect(isRecordOfStrings({})).toBe(true); // empty object is valid
    });

    it('should return false for plain objects with non-string values', () => {
        expect(isRecordOfStrings({ a: 123 })).toBe(false);
        expect(isRecordOfStrings({ a: 'str', b: true })).toBe(false);
        expect(isRecordOfStrings({ a: undefined })).toBe(false);
        expect(isRecordOfStrings({ a: null })).toBe(false);
        expect(isRecordOfStrings({ a: 'valid', b: {} })).toBe(false);
    });

    it('should return false for non-object types', () => {
        expect(isRecordOfStrings(null)).toBe(false);
        expect(isRecordOfStrings(undefined)).toBe(false);
        expect(isRecordOfStrings('string')).toBe(false);
        expect(isRecordOfStrings(123)).toBe(false);
        expect(isRecordOfStrings(['a', 'b'])).toBe(false);
        expect(isRecordOfStrings(() => {})).toBe(false);
    });

    it('should return false for object with non-plain prototype', () => {
        const obj = Object.create(null); // not a plain object
        obj.a = 'value';
        expect(isRecordOfStrings(obj)).toBe(false);
    });

    it('should return false for objects created with custom constructors', () => {
        class MyClass {
            a = 'hello';
        }
        expect(isRecordOfStrings(new MyClass())).toBe(false);
    });
});
