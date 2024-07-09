import { t } from '../../../src/i18n';
import {
    isNotEmptyString,
    isValidJSON,
    isValidSapClient,
    validateEmptyAndUserState,
    validateSpecialChars,
    validateContentDuplication,
    hasEmptySpaces,
    validateJSON,
    validateNonEmptyNoSpaces
} from '../../../src/base/validators';
import type { ManifestChangeProperties } from '../../../src';
import { validateDuplicateName } from '../../../src/prompts/add-new-model';

describe('validators', () => {
    describe('isNotEmptyString', () => {
        test('should return correct value based on input', () => {
            expect(isNotEmptyString(undefined)).toBe(false);
            expect(isNotEmptyString('')).toBe(false);
            expect(isNotEmptyString(' ')).toBe(false);
            expect(isNotEmptyString('a')).toBe(true);
        });
    });

    describe('isValidSapClient', () => {
        test('should return correct value based on input', () => {
            expect(isValidSapClient(undefined)).toBe(true);
            expect(isValidSapClient('')).toBe(true);
            expect(isValidSapClient('1')).toBe(true);
            expect(isValidSapClient('123')).toBe(true);
            expect(isValidSapClient('1234')).toBe(false);
            expect(isValidSapClient('a')).toBe(false);
        });
    });

    describe('hasEmptySpaces', () => {
        test('should return correct value based on input', () => {
            expect(hasEmptySpaces('hello world')).toBe(true);
            expect(hasEmptySpaces('helloworld')).toBe(false);
            expect(hasEmptySpaces('')).toBe(false);
            expect(hasEmptySpaces(' hello ')).toBe(true);
            expect(hasEmptySpaces(' ')).toBe(true);
        });
    });

    describe('validateNonEmptyNoSpaces', () => {
        const label = t('prompts.oDataServiceUriLabel');

        it('should return true for valid URIs', () => {
            expect(validateNonEmptyNoSpaces('/sap/opu/odata/', label)).toBe(true);
        });

        it('should return an error message if the URI is empty and mandatory', () => {
            expect(validateNonEmptyNoSpaces('', label, true)).toBe(`${label} cannot be empty.`);
        });

        it('should return true if the URI is empty but not mandatory', () => {
            expect(validateNonEmptyNoSpaces('', label, false)).toBe(true);
        });

        it('should return an error message if the URI contains spaces', () => {
            expect(validateNonEmptyNoSpaces('/sap/opu /odata/', label)).toBe(`${label} cannot contain spaces.`);
        });
    });

    describe('validateJSON', () => {
        const label = t('prompts.oDataServiceModelSettingsLabel');

        it('should return true for valid JSON strings', () => {
            expect(validateJSON('"key":"value"', label)).toBe(true);
        });

        it('should return true for an empty string', () => {
            expect(validateJSON('', label)).toBe(true);
        });

        it('should return an error message for invalid JSON strings', () => {
            expect(validateJSON('{key:value}', label)).toBe(`Invalid ${label}`);
        });
    });

    describe('isValidJSON', () => {
        it('should return true for valid JSON', () => {
            expect(isValidJSON('"key": "value"')).toBe(true);
        });

        it('should return false for invalid JSON', () => {
            expect(isValidJSON('key: "value"')).toBe(false);
        });
    });

    describe('validateContentDuplication', () => {
        const mockChangeFiles = [
            {
                content: {
                    dataSource: {
                        'customer.test': {
                            uri: '/sap/opu/odata/test',
                            type: 'OData',
                            settings: {
                                'odataVersion': '2.0',
                                'annotations': ['customer.sample']
                            }
                        },
                        'customer.sample': {
                            uri: '/sap/opu/odata/er1',
                            type: 'ODataAnnotation'
                        }
                    }
                }
            },
            { content: { model: { anotherValue: {} } } }
        ] as ManifestChangeProperties[];

        it('should return true if no duplication is found', () => {
            expect(
                validateContentDuplication(
                    'newValue',
                    'dataSource',
                    mockChangeFiles,
                    false,
                    t('prompts.oDataServiceNameLabel'),
                    t('prompts.oDataService')
                )
            ).toBe(true);
        });

        it('should return an error message if duplication is found', () => {
            expect(
                validateContentDuplication(
                    'customer.test',
                    'dataSource',
                    mockChangeFiles,
                    false,
                    t('prompts.oDataServiceNameLabel'),
                    t('prompts.oDataService')
                )
            ).toBe(`${t('prompts.oDataService')} with the same name was already added to the project`);
        });
    });

    describe('validateEmptyAndUserState', () => {
        it('should return true for valid non-customer input', () => {
            expect(validateEmptyAndUserState('newValue', false, t('prompts.oDataServiceNameLabel'))).toBe(true);
        });

        it('should return an error for customer input without correct prefix', () => {
            expect(validateEmptyAndUserState('invalidValue', true, t('prompts.oDataServiceNameLabel'))).toBe(
                `${t('prompts.oDataServiceNameLabel')} should start with 'customer.'`
            );
        });

        it('should validate empty values correctly', () => {
            expect(validateEmptyAndUserState('', false, t('prompts.oDataServiceNameLabel'))).toBe(
                'OData Service Name cannot be empty.'
            );
        });
    });

    describe('validateSpecialChars', () => {
        it('should return true for valid input', () => {
            expect(validateSpecialChars('validInput', t('prompts.oDataServiceNameLabel'))).toBe(true);
        });

        it('should return an error message for input with spaces', () => {
            expect(validateSpecialChars('invalid input', t('prompts.oDataServiceNameLabel'))).toBe(
                `${t('prompts.oDataServiceNameLabel')} cannot contain spaces.`
            );
        });

        it('should validate special characters correctly', () => {
            expect(validateSpecialChars('value@', t('prompts.oDataServiceNameLabel'))).toBe(
                "value@ must contain only Latin alphanumeric characters or the following symbols: '-','_','$' and '.'"
            );
        });
    });

    describe('validateDuplicateName', () => {
        it('should return true when there is no duplication', () => {
            expect(
                validateDuplicateName(
                    'service-name',
                    'data-source-name',
                    t('prompts.oDataServiceNameLabel'),
                    t('prompts.oDataAnnotationDataSourceNameLabel')
                )
            ).toBe(true);
        });

        it('should return an error message for duplicate values', () => {
            expect(
                validateDuplicateName(
                    'service-name',
                    'service-name',
                    t('prompts.oDataServiceNameLabel'),
                    t('prompts.oDataAnnotationDataSourceNameLabel')
                )
            ).toBe(
                `${t('prompts.oDataServiceNameLabel')} must be different from ${t(
                    'prompts.oDataAnnotationDataSourceNameLabel'
                )}`
            );
        });
    });
});
