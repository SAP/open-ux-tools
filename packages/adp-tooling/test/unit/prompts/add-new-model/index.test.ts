import { jest } from '@jest/globals';

const mockGetChangesByType = jest.fn();
const mockIsCFEnvironment = jest.fn();
const mockHasContentDuplication = jest.fn().mockReturnValue(false);
const mockHasCustomerPrefix = jest.fn().mockReturnValue(true);
const mockValidateJSON = jest.fn().mockReturnValue(true);
const mockValidateSpecialChars = jest.fn().mockReturnValue(true);
const mockValidateEmptyString = jest.fn().mockReturnValue(true);
const mockValidateEmptySpaces = jest.fn().mockReturnValue(true);
const mockIsDataSourceURI = jest.fn().mockReturnValue(true);

jest.unstable_mockModule('../../../../src/base/change-utils', () => ({
    getChangesByType: mockGetChangesByType
}));

jest.unstable_mockModule('../../../../src/base/cf', () => ({
    isCFEnvironment: mockIsCFEnvironment
}));

jest.unstable_mockModule('@sap-ux/project-input-validator', () => ({
    hasContentDuplication: mockHasContentDuplication,
    hasCustomerPrefix: mockHasCustomerPrefix,
    validateJSON: mockValidateJSON,
    validateSpecialChars: mockValidateSpecialChars,
    validateEmptyString: mockValidateEmptyString,
    validateEmptySpaces: mockValidateEmptySpaces,
    isDataSourceURI: mockIsDataSourceURI
}));

const { getPrompts } = await import('../../../../src/prompts/add-new-model');
const i18n = await import('../../../../src/i18n');
import type { NewModelAnswers } from '../../../../src/index.js';

describe('getPrompts', () => {
    const mockPath = '/path/to/project';

    beforeAll(async () => {
        await i18n.initI18n();
    });

    beforeEach(() => {
        mockGetChangesByType.mockReturnValue([]);
        mockHasContentDuplication.mockReturnValue(false);
        mockHasCustomerPrefix.mockReturnValue(true);
        mockValidateJSON.mockReturnValue(true);
        mockValidateSpecialChars.mockReturnValue(true);
        mockValidateEmptyString.mockReturnValue(true);
        mockIsDataSourceURI.mockReturnValue(true);
    });

    it('should generate prompts with default settings for non-customer layers', async () => {
        mockIsCFEnvironment.mockReturnValue(false);

        const vendorPrompts = await getPrompts(mockPath, 'VENDOR');

        expect(vendorPrompts.length).toBeGreaterThan(0);
        expect(vendorPrompts[0].default).toBe('');
        expect(vendorPrompts.some((prompt) => prompt.name === 'version')).toBeTruthy();
    });

    it('should adjust defaults based on customer layer', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        expect(prompts[0].default).toBe('customer.');
    });

    it('should return true when validating service name prompt', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName', { dataSourceName: 'otherName' } as NewModelAnswers)).toBe(true);
        expect(mockHasContentDuplication).toHaveBeenCalledWith('customer.testName', 'dataSource', []);
    });

    it('should return error message when validating service name prompt and name does not include "customer."', async () => {
        mockHasCustomerPrefix.mockReturnValueOnce(false);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('testName', { dataSourceName: 'otherName' } as NewModelAnswers)).toBe(
            "OData Service Name must start with 'customer.'."
        );
    });

    it('should return error message when validating service name prompt and name is only "customer."', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.', { dataSourceName: 'otherName' } as NewModelAnswers)).toBe(
            "OData Service Name must contain at least one character in addition to 'customer.'."
        );
    });

    it('should return error message when validating service name prompt and has special characters', async () => {
        mockValidateSpecialChars.mockReturnValueOnce('general.invalidValueForSpecialChars');

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName@', { dataSourceName: 'otherName' } as NewModelAnswers)).toBe(
            'general.invalidValueForSpecialChars'
        );
    });

    it('should return error message when validating service name prompt has content duplication', async () => {
        mockHasContentDuplication.mockReturnValueOnce(true);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(
            validation?.('customer.testName', {
                dataSourceName: 'otherName'
            } as NewModelAnswers)
        ).toBe(
            'An OData annotation or service with the same name was already added to the project. Rename and try again.'
        );
    });

    it('should return error message when validating service name prompt has name duplication', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(
            validation?.('customer.testName', {
                addAnnotationMode: true,
                dataSourceName: 'customer.testName'
            } as NewModelAnswers)
        ).toBe(
            'An OData Service Name must be different from an OData Annotation Data Source Name. Rename and try again.'
        );
    });

    it('should return true when validating service uri prompt', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/odata/v4/')).toBe(true);
    });

    it('should return error message when validating empty service uri prompt', async () => {
        mockValidateEmptyString.mockReturnValueOnce('general.inputCannotBeEmpty');

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('')).toBe('general.inputCannotBeEmpty');
    });

    it('should return error message when service uri is not valid uri', async () => {
        mockIsDataSourceURI.mockReturnValueOnce(false);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/opu /odata4/')).toBe(i18n.t('validators.errorInvalidDataSourceURI'));
    });

    it('should return default value for odata version when uri answer is present', async () => {
        mockIsCFEnvironment.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const dafaultFn = result.find((prompt) => prompt.name === 'version')?.default;

        expect(typeof dafaultFn).toBe('function');
        expect(dafaultFn({ uri: '/odata/v4/example' })).toBe('4.0');
    });

    it('should return default value for odata version when uri answer is not present', async () => {
        mockIsCFEnvironment.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const dafaultFn = result.find((prompt) => prompt.name === 'version')?.default;

        expect(typeof dafaultFn).toBe('function');
        expect(dafaultFn({ uri: undefined })).toBe('2.0');
    });

    it('should return default value for odata version based on uri answer in CF environment', async () => {
        mockIsCFEnvironment.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const dafaultFn = result.find((prompt) => prompt.name === 'version')?.default;

        expect(typeof dafaultFn).toBe('function');
        expect(dafaultFn({ uri: '/odata/v4/' })).toBe('4.0');
    });

    it('should return default value for odata version based on uri answer not in CF environment', async () => {
        mockIsCFEnvironment.mockReturnValueOnce(false).mockReturnValueOnce(false);

        const result = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const dafaultFn = result.find((prompt) => prompt.name === 'version')?.default;

        expect(typeof dafaultFn).toBe('function');
        expect(dafaultFn({ uri: '/sap/opu/odata4/' })).toBe('4.0');
    });

    it('should return true when validating model name prompt', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName')).toBe(true);
        expect(mockHasContentDuplication).toHaveBeenCalledWith('customer.testName', 'model', []);
    });

    it('should return error message when validating model name prompt without "customer." prefix', async () => {
        mockHasCustomerPrefix.mockReturnValueOnce(false);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('testName')).toBe("OData Service SAPUI5 Model Name must start with 'customer.'.");
    });

    it('should return error message when validating model name contains only "customer."', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.')).toBe(
            "OData Service SAPUI5 Model Name must contain at least one character in addition to 'customer.'."
        );
    });

    it('should return error message when validating model name prompt and has special characters', async () => {
        mockValidateSpecialChars.mockReturnValueOnce('general.invalidValueForSpecialChars');

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName@')).toBe('general.invalidValueForSpecialChars');
    });

    it('should return error message when validating model name prompt has content duplication', async () => {
        mockHasContentDuplication.mockReturnValueOnce(true);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName')).toBe(
            'An SAPUI5 model with the same name was already added to the project. Rename and try again.'
        );
    });

    it('should return true when validating model settings prompt', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('"key": "value"')).toBe(true);
    });

    it('should return true when validating model settings prompt with empty value', async () => {
        mockValidateEmptyString.mockReturnValueOnce('general.inputCannotBeEmpty');

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('')).toBe(true);
    });

    it('should return error message when validating model settings prompt with incorrect input', async () => {
        mockValidateJSON.mockReturnValueOnce('general.invalidJSON');

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('{"key": "value"}')).toBe('general.invalidJSON');
    });

    it('should return error message when validating data source name prompt without "customer." prefix', async () => {
        mockHasCustomerPrefix.mockReturnValueOnce(false);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('testName', { name: 'testName' } as NewModelAnswers)).toBe(
            "OData Annotation Data Source Name must start with 'customer.'."
        );
    });

    it('should return error message when validating data source name prompt with only "customer." prefix', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.', { name: 'customer.testName' } as NewModelAnswers)).toBe(
            "OData Annotation Data Source Name must contain at least one character in addition to 'customer.'."
        );
    });

    it('should return true when validating data source name prompt', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(mockHasContentDuplication).toHaveBeenCalledWith('customer.testName', 'dataSource', []);
        expect(validation?.('customer.testName', { name: 'otherName' } as NewModelAnswers)).toBe(true);
    });

    it('should return error message when validating data source name prompt and has special characters', async () => {
        mockValidateSpecialChars.mockReturnValueOnce('general.invalidValueForSpecialChars');

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName@', { name: 'otherName' } as NewModelAnswers)).toBe(
            'general.invalidValueForSpecialChars'
        );
    });

    it('should return error message when validating data source name prompt has content duplication', async () => {
        mockHasContentDuplication.mockReturnValueOnce(true);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName', { name: 'otherName' } as NewModelAnswers)).toBe(
            'An OData annotation or service with the same name was already added to the project. Rename and try again.'
        );
    });

    it('should return error message when validating data source name prompt has name duplication', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName', { name: 'customer.testName' } as NewModelAnswers)).toBe(
            'An OData Service Name must be different from an OData Annotation Data Source Name. Rename and try again.'
        );
    });

    it('should return true when validating data source uri prompt', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceURI')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/opu/odata4Ann/')).toBe(true);
    });

    it('should return error message when data source uri is not valid uri', async () => {
        mockIsDataSourceURI.mockReturnValueOnce(false);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const validation = prompts.find((p) => p.name === 'dataSourceURI')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/opu /odata4Ann/')).toBe(i18n.t('validators.errorInvalidDataSourceURI'));
    });

    it('should return true when validating annotation settings prompt', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'annotationSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('"key": "value"')).toBe(true);
    });

    it('should display the dataSourceName, dataSourceURI, and annotationSettings prompts when addAnnotationMode is true', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const answers = { addAnnotationMode: true } as NewModelAnswers;

        const dataSourceNamePromptWhen = prompts.find((p) => p.name === 'dataSourceName')?.when as Function;
        const dataSourceURIPromptWhen = prompts.find((p) => p.name === 'dataSourceURI')?.when as Function;
        const annotationSettingsPromptWhen = prompts.find((p) => p.name === 'annotationSettings')?.when as Function;

        expect(typeof dataSourceNamePromptWhen).toBe('function');
        expect(typeof dataSourceURIPromptWhen).toBe('function');
        expect(typeof annotationSettingsPromptWhen).toBe('function');
        expect(dataSourceNamePromptWhen(answers)).toBe(true);
        expect(dataSourceURIPromptWhen(answers)).toBe(true);
        expect(annotationSettingsPromptWhen(answers)).toBe(true);
    });
});
