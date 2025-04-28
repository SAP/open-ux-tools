import { isAdpJsonInput, isString } from '../../../src/utils/type-guards';

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

describe('isAdpJsonInput', () => {
    it('should return true when all required fields are passed', () => {
        const inputWithRequiredFields = {
            system: 'system',
            application: 'application',
            client: 'client',
            username: 'username',
            password: 'password',
            applicationTitle: 'applicationTitle'
        };
        expect(isAdpJsonInput(inputWithRequiredFields)).toBe(true);
        expect(
            isAdpJsonInput({
                ...inputWithRequiredFields,
                targetFolder: 'targetFolder',
                projectName: 'projectName',
                namespace: 'namespace'
            })
        ).toBe(true);
    });

    it('should return false if some of required fields is missing', () => {
        expect(
            isAdpJsonInput({
                system: 'system'
            })
        ).toBe(false);
        expect(isAdpJsonInput({})).toBe(false);
    });

    it('should return false for non-object types', () => {
        expect(isAdpJsonInput(null)).toBe(false);
        expect(isAdpJsonInput(undefined)).toBe(false);
        expect(isAdpJsonInput('string')).toBe(false);
        expect(isAdpJsonInput(123)).toBe(false);
        expect(isAdpJsonInput(['a', 'b'])).toBe(false);
        expect(isAdpJsonInput(() => {})).toBe(false);
    });

    it('should return false for input object with non-plain prototype', () => {
        const input = Object.create(null); // not a plain object
        input.system = 'system';
        input.application = 'application';
        input.client = 'client';
        input.username = 'username';
        input.password = 'password';
        input.applicationTitle = 'applicationTitle';
        expect(isAdpJsonInput(input)).toBe(false);
    });

    it('should return false for input objects created with custom constructors', () => {
        class JsonInput {
            system = 'system';
            application = 'application';
            client = 'client';
            username = 'username';
            password = 'password';
            applicationTitle = 'applicationTitle';
        }
        expect(isAdpJsonInput(new JsonInput())).toBe(false);
    });
});
