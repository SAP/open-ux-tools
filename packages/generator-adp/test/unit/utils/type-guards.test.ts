import { isCfJsonInput, isJsonInput, isJsonInputFile, isString } from '../../../src/utils/type-guards.js';

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

describe('isJsonInput', () => {
    it('should return true when all required fields are passed', () => {
        const inputWithRequiredFields = {
            system: 'system',
            application: 'application'
        };
        expect(isJsonInput(inputWithRequiredFields)).toBe(true);
        expect(
            isJsonInput({
                ...inputWithRequiredFields,
                targetFolder: 'targetFolder',
                projectName: 'projectName',
                namespace: 'namespace'
            })
        ).toBe(true);
    });

    it('should return true when the optional id is a string', () => {
        expect(isJsonInput({ id: 'correlation-id', system: 'system', application: 'application' })).toBe(true);
    });

    it('should return false when id is present but not a string', () => {
        expect(isJsonInput({ id: 123, system: 'system', application: 'application' })).toBe(false);
    });

    it('should return false if some of the required fields are missing', () => {
        expect(
            isJsonInput({
                system: 'system'
            })
        ).toBe(false);
        expect(isJsonInput({})).toBe(false);
    });

    it('should return false for non-object types', () => {
        expect(isJsonInput(null)).toBe(false);
        expect(isJsonInput(undefined)).toBe(false);
        expect(isJsonInput('string')).toBe(false);
        expect(isJsonInput(123)).toBe(false);
        expect(isJsonInput(['a', 'b'])).toBe(false);
        expect(isJsonInput(() => {})).toBe(false);
    });

    it('should return false for input object with non-plain prototype', () => {
        const input = Object.create(null); // not a plain object
        input.system = 'system';
        input.application = 'application';
        input.client = 'client';
        input.username = 'username';
        input.password = 'password';
        input.applicationTitle = 'applicationTitle';
        expect(isJsonInput(input)).toBe(false);
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
        expect(isJsonInput(new JsonInput())).toBe(false);
    });

    it('should return true when optional id is a string', () => {
        expect(isJsonInput({ system: 'system', application: 'application', id: '123.5' })).toBe(true);
    });

    it('should return false when optional id is not a string', () => {
        expect(isJsonInput({ system: 'system', application: 'application', id: 123 })).toBe(false);
    });

    it('should ignore extra keyUserChanges on CLI json', () => {
        const input = {
            system: 'system',
            application: 'application',
            keyUserChanges: 'not an array'
        };
        expect(isJsonInput(input)).toBe(true);
    });
});

describe('isCfJsonInput', () => {
    const validBusinessServiceInput = {
        targetEnv: 'CF',
        application: 'base.app.id',
        businessService: 'my-business-service'
    };

    const validServiceInstanceInput = {
        targetEnv: 'CF',
        application: 'base.app.id',
        serviceInstanceName: 'my-live-instance'
    };

    it('should return true for a valid businessService CF input', () => {
        expect(isCfJsonInput(validBusinessServiceInput)).toBe(true);
    });

    it('should return true for a valid serviceInstanceName CF input', () => {
        expect(isCfJsonInput(validServiceInstanceInput)).toBe(true);
    });

    it('should return true when all optional fields are present', () => {
        expect(
            isCfJsonInput({
                ...validBusinessServiceInput,
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
        expect(isCfJsonInput({ ...validBusinessServiceInput, targetEnv: 'ABAP' })).toBe(false);
        expect(isCfJsonInput({ application: 'base.app.id', businessService: 'svc' })).toBe(false);
    });

    it('should return false when application is missing', () => {
        expect(isCfJsonInput({ targetEnv: 'CF', businessService: 'svc' })).toBe(false);
    });

    it('should return false when neither businessService nor serviceInstanceName is provided', () => {
        expect(isCfJsonInput({ targetEnv: 'CF', application: 'base.app.id' })).toBe(false);
    });

    it('should return false when both businessService and serviceInstanceName are provided', () => {
        expect(
            isCfJsonInput({
                targetEnv: 'CF',
                application: 'base.app.id',
                businessService: 'svc',
                serviceInstanceName: 'inst'
            })
        ).toBe(false);
    });

    it('should return false when the service name is an empty or whitespace-only string', () => {
        expect(isCfJsonInput({ targetEnv: 'CF', application: 'base.app.id', businessService: '' })).toBe(false);
        expect(isCfJsonInput({ targetEnv: 'CF', application: 'base.app.id', businessService: '   ' })).toBe(false);
        expect(isCfJsonInput({ targetEnv: 'CF', application: 'base.app.id', serviceInstanceName: '' })).toBe(false);
    });

    it('should return false when application is an empty string', () => {
        expect(isCfJsonInput({ targetEnv: 'CF', application: '', businessService: 'svc' })).toBe(false);
    });

    it('should return false when mtaMode is not an allowed literal', () => {
        expect(isCfJsonInput({ ...validBusinessServiceInput, mtaMode: 'bogus' })).toBe(false);
    });

    it('should return false when an optional field has the wrong type', () => {
        expect(isCfJsonInput({ ...validBusinessServiceInput, projectName: 123 })).toBe(false);
        expect(isCfJsonInput({ ...validBusinessServiceInput, id: 123 })).toBe(false);
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
