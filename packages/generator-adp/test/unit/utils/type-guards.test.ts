import { isCfJsonInput, isAbapJsonInput, isJsonInputFile, isString } from '../../../src/utils/type-guards.js';

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

describe('isAbapJsonInput', () => {
    it('should return true when all required fields are passed', () => {
        const inputWithRequiredFields = {
            system: 'system',
            application: 'application'
        };
        expect(isAbapJsonInput(inputWithRequiredFields)).toBe(true);
        expect(
            isAbapJsonInput({
                ...inputWithRequiredFields,
                targetFolder: 'targetFolder',
                projectName: 'projectName',
                namespace: 'namespace'
            })
        ).toBe(true);
    });

    it('should return true when the optional id is a string', () => {
        expect(isAbapJsonInput({ id: 'correlation-id', system: 'system', application: 'application' })).toBe(true);
    });

    it('should return false when id is present but not a string', () => {
        expect(isAbapJsonInput({ id: 123, system: 'system', application: 'application' })).toBe(false);
    });

    it('should return false if some of the required fields are missing', () => {
        expect(
            isAbapJsonInput({
                system: 'system'
            })
        ).toBe(false);
        expect(isAbapJsonInput({})).toBe(false);
    });

    it('should return false for non-object types', () => {
        expect(isAbapJsonInput(null)).toBe(false);
        expect(isAbapJsonInput(undefined)).toBe(false);
        expect(isAbapJsonInput('string')).toBe(false);
        expect(isAbapJsonInput(123)).toBe(false);
        expect(isAbapJsonInput(['a', 'b'])).toBe(false);
        expect(isAbapJsonInput(() => {})).toBe(false);
    });

    it('should return false for input object with non-plain prototype', () => {
        const input = Object.create(null); // not a plain object
        input.system = 'system';
        input.application = 'application';
        input.client = 'client';
        input.username = 'username';
        input.password = 'password';
        input.applicationTitle = 'applicationTitle';
        expect(isAbapJsonInput(input)).toBe(false);
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
        expect(isAbapJsonInput(new JsonInput())).toBe(false);
    });

    it('should return true when optional id is a string', () => {
        expect(isAbapJsonInput({ system: 'system', application: 'application', id: '123.5' })).toBe(true);
    });

    it('should return false when optional id is not a string', () => {
        expect(isAbapJsonInput({ system: 'system', application: 'application', id: 123 })).toBe(false);
    });

    it('should ignore extra keyUserChanges on CLI json', () => {
        const input = {
            system: 'system',
            application: 'application',
            keyUserChanges: 'not an array'
        };
        expect(isAbapJsonInput(input)).toBe(true);
    });
});

describe('isCfJsonInput', () => {
    const validServiceInstanceInput = {
        targetEnv: 'CF',
        application: 'base.app.id',
        serviceInstanceName: 'my-live-instance'
    };

    it('should return true for a valid serviceInstanceName CF input', () => {
        expect(isCfJsonInput(validServiceInstanceInput)).toBe(true);
    });

    it('should return true when all optional fields are present', () => {
        expect(
            isCfJsonInput({
                ...validServiceInstanceInput,
                id: 'correlation-id',
                applicationTitle: 'My App',
                approuter: 'Managed HTML5 Application Runtime',
                businessSolutionName: 'solution',
                mtaMode: 'existing',
                mtaId: 'my-mta',
                targetFolder: '/abs/path',
                projectName: 'app.variant',
                namespace: 'customer.app.variant'
            })
        ).toBe(true);
    });

    it('should return false when targetEnv is not CF', () => {
        expect(isCfJsonInput({ ...validServiceInstanceInput, targetEnv: 'ABAP' })).toBe(false);
        expect(isCfJsonInput({ application: 'base.app.id', serviceInstanceName: 'inst' })).toBe(false);
    });

    it('should return false when application is missing', () => {
        expect(isCfJsonInput({ targetEnv: 'CF', serviceInstanceName: 'inst' })).toBe(false);
    });

    it('should return false when serviceInstanceName is not provided', () => {
        expect(isCfJsonInput({ targetEnv: 'CF', application: 'base.app.id' })).toBe(false);
    });

    it('should return false when serviceInstanceName is an empty or whitespace-only string', () => {
        expect(isCfJsonInput({ targetEnv: 'CF', application: 'base.app.id', serviceInstanceName: '' })).toBe(false);
        expect(isCfJsonInput({ targetEnv: 'CF', application: 'base.app.id', serviceInstanceName: '   ' })).toBe(false);
    });

    it('should return false when application is an empty string', () => {
        expect(isCfJsonInput({ targetEnv: 'CF', application: '', serviceInstanceName: 'inst' })).toBe(false);
    });

    it('should return false when mtaMode is not an allowed literal', () => {
        expect(isCfJsonInput({ ...validServiceInstanceInput, mtaMode: 'bogus' })).toBe(false);
    });

    it('should return true for both supported approuter literals', () => {
        expect(isCfJsonInput({ ...validServiceInstanceInput, approuter: 'Managed HTML5 Application Runtime' })).toBe(
            true
        );
        expect(isCfJsonInput({ ...validServiceInstanceInput, approuter: 'Standalone HTML5 Application Runtime' })).toBe(
            true
        );
    });

    it('should return false when approuter is not an allowed literal', () => {
        expect(isCfJsonInput({ ...validServiceInstanceInput, approuter: 'Managed' })).toBe(false);
        expect(isCfJsonInput({ ...validServiceInstanceInput, approuter: 'bogus-router' })).toBe(false);
    });

    it('should return false when an optional field has the wrong type', () => {
        expect(isCfJsonInput({ ...validServiceInstanceInput, projectName: 123 })).toBe(false);
        expect(isCfJsonInput({ ...validServiceInstanceInput, id: 123 })).toBe(false);
    });

    it('should return false for non-plain / non-object values', () => {
        expect(isCfJsonInput(null)).toBe(false);
        expect(isCfJsonInput(undefined)).toBe(false);
        expect(isCfJsonInput('string')).toBe(false);
        expect(isCfJsonInput(['a'])).toBe(false);
        expect(isCfJsonInput(Object.create(null))).toBe(false);
    });
});

describe('isJsonInputFile', () => {
    it('should return true for an empty object', () => {
        expect(isJsonInputFile({})).toBe(true);
    });

    it('should return true when keyUserChanges is a valid array', () => {
        expect(
            isJsonInputFile({
                keyUserChanges: [
                    { content: { fileName: 'change1' } },
                    { content: { fileName: 'change2' }, texts: { i18n: 'text' } }
                ]
            })
        ).toBe(true);
    });

    it('should return true when keyUserChanges is an empty array', () => {
        expect(isJsonInputFile({ keyUserChanges: [] })).toBe(true);
    });

    it('should return true when extra fields are present', () => {
        expect(isJsonInputFile({ keyUserChanges: [], extraField: 'ok' })).toBe(true);
    });

    it('should return false when keyUserChanges is not an array', () => {
        expect(isJsonInputFile({ keyUserChanges: 'not an array' })).toBe(false);
    });

    it('should return false when keyUserChanges item is missing content', () => {
        expect(isJsonInputFile({ keyUserChanges: [{ texts: {} }] })).toBe(false);
    });

    it('should return false when keyUserChanges item content is not an object', () => {
        expect(isJsonInputFile({ keyUserChanges: [{ content: 'not an object' }] })).toBe(false);
    });

    it('should return false for a raw array', () => {
        expect(isJsonInputFile([{ content: { fileName: 'change' } }])).toBe(false);
    });
});
