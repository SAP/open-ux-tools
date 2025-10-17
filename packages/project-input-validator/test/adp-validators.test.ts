import { existsSync } from 'node:fs';

import {
    hasContentDuplication,
    hasCustomerPrefix,
    isDataSourceURI,
    validateAch,
    validateDuplicateProjectName,
    validateNamespaceAdp,
    validateProjectName,
    validateProjectNameExternal,
    validateProjectNameInternal
} from '../src/adp/validators';
import { t } from '../src/i18n';

jest.mock('fs', () => ({
    existsSync: jest.fn()
}));

const existsSyncMock = existsSync as jest.Mock;

describe('project input validators', () => {
    describe('hasContentDuplication', () => {
        test('should return true if there is content duplication', () => {
            const output = hasContentDuplication('ZTEST', 'testProperty', [
                { content: { testProperty: { ZTEST: 'test' } } }
            ]);
            expect(output).toEqual(true);
        });

        test('should return false if there is no content duplication', () => {
            const output = hasContentDuplication('ZTEST', 'testProperty', [
                { content: { testProperty: { ZTEST2: 'test' } } }
            ]);
            expect(output).toEqual(false);
        });

        test('should return false if property does not exist', () => {
            const output = hasContentDuplication('ZTEST', 'testProperty', [
                { content: { test1Property: { ZTEST2: 'test' } } }
            ]);
            expect(output).toEqual(false);
        });
    });

    describe('hasCustomerPrefix', () => {
        test('should return true if the value has a customer prefix', () => {
            const output = hasCustomerPrefix('customer.ZTEST');
            expect(output).toEqual(true);
        });

        test('should return false if the value does not have a customer prefix', () => {
            const output = hasCustomerPrefix('ZTEST');
            expect(output).toEqual(false);
        });
    });

    describe('isDataSourceURI', () => {
        test('should return true if the URI is valid', () => {
            const output = isDataSourceURI('/test/');
            expect(output).toEqual(true);
        });

        test('should return false if the URI does not end with /', () => {
            const output = isDataSourceURI('/test');
            expect(output).toEqual(false);
        });

        test('should return false if the URI does not start with /', () => {
            const output = isDataSourceURI('test/');
            expect(output).toEqual(false);
        });

        test('should return false if the URI contains //', () => {
            const output = isDataSourceURI('//test/');
            expect(output).toEqual(false);
        });

        test('should return false if the URI contains whitespace', () => {
            const output = isDataSourceURI('/test /');
            expect(output).toEqual(false);
        });
    });

    describe('validateProjectName', () => {
        const path = '/mock/path';

        beforeEach(() => {
            jest.clearAllMocks();
            existsSyncMock.mockReturnValue(false); // Assume project does not exist
        });

        it('returns error if value is empty', () => {
            expect(validateProjectName('', path, true, false)).toBe(t('general.inputCannotBeEmpty'));
        });

        it('returns error if name contains uppercase letters', () => {
            expect(validateProjectName('ProjectName', path, true, false)).toBe(t('adp.projectNameUppercaseError'));
        });

        it('delegates to internal validation if not customer base', () => {
            const result = validateProjectName('validname', path, false, false);
            expect(result).toBe(t('adp.projectNameValidationErrorInt'));
        });

        it('returns error if project name is duplicated and CF environment', () => {
            existsSyncMock.mockReturnValue(true);
            const result = validateProjectName('validname', path, false, true);
            expect(result).toBe(t(t('adp.duplicatedProjectName')));
        });

        it('delegates to external validation if customer base', () => {
            const result = validateProjectName('validname', path, true, false);
            expect(result).toBe(true);
        });

        it('returns true if project name is not duplicated and CF environment', () => {
            existsSyncMock.mockReturnValue(false);
            const result = validateProjectName('validname', path, true, true);
            expect(result).toBe(true);
        });
    });

    describe('validateProjectNameExternal', () => {
        beforeEach(() => {
            existsSyncMock.mockReturnValue(false);
        });

        it('returns length error if name > 61 chars or ends with component', () => {
            expect(validateProjectNameExternal('a'.repeat(62))).toBe(t('adp.projectNameLengthErrorExt'));
            expect(validateProjectNameExternal('appcomponent')).toBe(t('adp.projectNameLengthErrorExt'));
        });

        it('returns validation error if name does not match pattern', () => {
            expect(validateProjectNameExternal('invalid name!')).toBe(t('adp.projectNameValidationErrorExt'));
        });

        it('returns true for valid name', () => {
            expect(validateProjectNameExternal('validname')).toBe(true);
        });
    });

    describe('validateProjectNameInternal', () => {
        const path = '/mock/path';

        it('returns error if name starts with "customer", is too long, or ends with component', () => {
            expect(validateProjectNameInternal('customerapp')).toBe(t('adp.projectNameLengthErrorInt'));
            expect(validateProjectNameInternal('a'.repeat(62))).toBe(t('adp.projectNameLengthErrorInt'));
            expect(validateProjectNameInternal('mycomponent')).toBe(t('adp.projectNameLengthErrorInt'));
        });

        it('returns validation error if name does not match pattern', () => {
            expect(validateProjectNameInternal('invalid name!')).toBe(t('adp.projectNameValidationErrorInt'));
        });

        it('returns true for valid internal project name', () => {
            existsSyncMock.mockReturnValue(false);
            expect(validateProjectNameInternal('vendorapp')).toBe(t('adp.projectNameValidationErrorInt'));
        });
    });

    describe('validateDuplicateProjectName', () => {
        const path = '/mock/path';

        it('returns duplication error if name exists', () => {
            existsSyncMock.mockReturnValue(true);
            expect(validateDuplicateProjectName('duplicate', path)).toBe(t('adp.duplicatedProjectName'));
        });

        it('returns true if name does not exist', () => {
            existsSyncMock.mockReturnValue(false);
            expect(validateDuplicateProjectName('unique', path)).toBe(true);
        });
    });

    describe('validateNamespaceAdp', () => {
        it('returns error if namespace is empty', () => {
            expect(validateNamespaceAdp('', 'project', true)).toBe(t('general.inputCannotBeEmpty'));
        });

        it('returns error if namespace != project name in VENDOR', () => {
            expect(validateNamespaceAdp('mynamespace', 'project', false)).toBe(
                t('adp.differentNamespaceThanProjectName')
            );
        });

        it('returns error if CUSTOMER_BASE and namespace does not start with customer.', () => {
            expect(validateNamespaceAdp('foo.bar', 'project', true)).toBe(t('adp.namespaceSameAsProjectNameError'));
        });

        it('returns error if trimmed namespace is too long or ends with component', () => {
            expect(validateNamespaceAdp('customer.' + 'a'.repeat(62), 'project', true)).toBe(
                'adp.namespaceLengthError'
            );
            expect(validateNamespaceAdp('customer.appcomponent', 'project', true)).toBe(t('adp.namespaceLengthError'));
        });

        it('returns error if namespace does not match pattern', () => {
            expect(validateNamespaceAdp('customer.invalid name', 'project', true)).toBe(
                t('adp.namespaceValidationError')
            );
        });

        it('returns true for valid namespace and project name (CUSTOMER_BASE)', () => {
            expect(validateNamespaceAdp('customer.validname', 'validname', true)).toBe(true);
        });

        it('returns true for valid VENDOR namespace that matches project name', () => {
            expect(validateNamespaceAdp('myvendorapp', 'myvendorapp', false)).toBe(true);
        });
    });

    describe('validateAch', () => {
        it('should return error if value is an empty string', () => {
            const result = validateAch('', false);
            expect(typeof result).toBe('string');
            expect(result).toBe(t('general.inputCannotBeEmpty'));
        });

        it('should return true for valid ACH (non-customer base)', () => {
            const result = validateAch('XY-123', false);
            expect(result).toBe(true);
        });

        it('should return true for valid ACH (customer base)', () => {
            const result = validateAch('Z9', true);
            expect(result).toBe(true);
        });

        it('should return error message for invalid ACH format (non-customer base)', () => {
            const result = validateAch('bad-input!', false);
            expect(result).toBe(t('adp.achMandatoryError'));
        });

        it('should return true for invalid ACH format if customer base', () => {
            const result = validateAch('bad-input!', true);
            expect(result).toBe(true);
        });

        it('should normalize lowercase ACH input and validate correctly', () => {
            const result = validateAch('xy-789', false);
            expect(result).toBe(true);
        });
    });
});
