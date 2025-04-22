import * as i18n from '../../../../src/i18n';
import type { NewModelAnswers } from '../../../../src';
import { isCFEnvironment } from '../../../../src/base/cf';
import { getPrompts } from '../../../../src/prompts/add-new-model';
import * as validators from '@sap-ux/project-input-validator';
import { getChangesByType } from '../../../../src/base/change-utils';

const getChangesByTypeMock = getChangesByType as jest.Mock;

const isCFEnvironmentMock = isCFEnvironment as jest.Mock;

jest.mock('../../../../src/base/change-utils.ts', () => ({
    ...jest.requireActual('../../../../src/base/change-utils.ts'),
    getChangesByType: jest.fn()
}));

jest.mock('../../../../src/base/cf.ts', () => ({
    isCFEnvironment: jest.fn()
}));

jest.mock('@sap-ux/project-input-validator', () => ({
    ...jest.requireActual('@sap-ux/project-input-validator'),
    hasContentDuplication: jest.fn().mockReturnValue(false),
    hasCustomerPrefix: jest.fn().mockReturnValue(true),
    validateJSON: jest.fn().mockReturnValue(true),
    validateSpecialChars: jest.fn().mockReturnValue(true),
    validateEmptyString: jest.fn().mockReturnValue(true),
    isDataSourceURI: jest.fn().mockReturnValue(true)
}));

describe('getPrompts', () => {
    const mockPath = '/path/to/project';

    beforeAll(async () => {
        await i18n.initI18n();
    });

    beforeEach(() => {
        getChangesByTypeMock.mockReturnValue([]);
    });

    it('should generate prompts with default settings for non-customer layers', () => {
        isCFEnvironmentMock.mockReturnValue(false);

        const vendorPrompts = getPrompts(mockPath, 'VENDOR');

        expect(vendorPrompts.length).toBeGreaterThan(0);
        expect(vendorPrompts[0].default).toBe('');
        expect(vendorPrompts.some((prompt) => prompt.name === 'version')).toBeTruthy();
    });

    it('should adjust defaults based on customer layer', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        expect(prompts[0].default).toBe('customer.');
    });

    it('should return true when validating service name prompt', () => {
        const hasContentDuplicationSpy = jest.spyOn(validators, 'hasContentDuplication');

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName', { dataSourceName: 'otherName' } as NewModelAnswers)).toBe(true);
        expect(hasContentDuplicationSpy).toHaveBeenCalledWith('customer.testName', 'dataSource', []);
    });

    it('should return error message when validating service name prompt and name does not include "customer."', () => {
        jest.spyOn(validators, 'hasCustomerPrefix').mockReturnValueOnce(false);

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('testName', { dataSourceName: 'otherName' } as NewModelAnswers)).toBe(
            "OData Service Name should start with 'customer.'"
        );
    });

    it('should return error message when validating service name prompt and name is only "customer."', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.', { dataSourceName: 'otherName' } as NewModelAnswers)).toBe(
            "OData Service Name should contain at least one character in addition to 'customer.'"
        );
    });

    it('should return error message when validating service name prompt and has special characters', () => {
        jest.spyOn(validators, 'validateSpecialChars').mockReturnValueOnce('general.invalidValueForSpecialChars');

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName@', { dataSourceName: 'otherName' } as NewModelAnswers)).toBe(
            'general.invalidValueForSpecialChars'
        );
    });

    it('should return error message when validating service name prompt has content duplication', () => {
        jest.spyOn(validators, 'hasContentDuplication').mockReturnValueOnce(true);

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(
            validation?.('customer.testName', {
                dataSourceName: 'otherName'
            } as NewModelAnswers)
        ).toBe('OData Annotation or OData Service with the same name was already added to the project');
    });

    it('should return error message when validating service name prompt has name duplication', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'name')?.validate;

        expect(typeof validation).toBe('function');
        expect(
            validation?.('customer.testName', {
                addAnnotationMode: true,
                dataSourceName: 'customer.testName'
            } as NewModelAnswers)
        ).toBe('OData Service Name must be different from OData Annotation Data Source Name');
    });

    it('should return true when validating service uri prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/odata/v4/')).toBe(true);
    });

    it('should return error message when validating empty service uri prompt', () => {
        jest.spyOn(validators, 'validateEmptyString').mockReturnValueOnce('general.inputCannotBeEmpty');

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('')).toBe('general.inputCannotBeEmpty');
    });

    it('should return error message when service uri is not valid uri', () => {
        jest.spyOn(validators, 'isDataSourceURI').mockReturnValueOnce(false);

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/opu /odata4/')).toBe(
            "Invalid URI. Should start and end with '/' and contain no spaces"
        );
    });

    it('should return default value for odata version when uri answer is present', () => {
        isCFEnvironmentMock.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result = getPrompts(mockPath, 'CUSTOMER_BASE');

        const dafaultFn = result.find((prompt) => prompt.name === 'version')?.default;

        expect(typeof dafaultFn).toBe('function');
        expect(dafaultFn({ uri: '/odata/v4/example' })).toBe('4.0');
    });

    it('should return default value for odata version when uri answer is not present', () => {
        isCFEnvironmentMock.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result = getPrompts(mockPath, 'CUSTOMER_BASE');

        const dafaultFn = result.find((prompt) => prompt.name === 'version')?.default;

        expect(typeof dafaultFn).toBe('function');
        expect(dafaultFn({ uri: undefined })).toBe('2.0');
    });

    it('should return default value for odata version based on uri answer in CF environment', () => {
        isCFEnvironmentMock.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result = getPrompts(mockPath, 'CUSTOMER_BASE');

        const dafaultFn = result.find((prompt) => prompt.name === 'version')?.default;

        expect(typeof dafaultFn).toBe('function');
        expect(dafaultFn({ uri: '/odata/v4/' })).toBe('4.0');
    });

    it('should return default value for odata version based on uri answer not in CF environment', () => {
        isCFEnvironmentMock.mockReturnValueOnce(false).mockReturnValueOnce(false);

        const result = getPrompts(mockPath, 'CUSTOMER_BASE');

        const dafaultFn = result.find((prompt) => prompt.name === 'version')?.default;

        expect(typeof dafaultFn).toBe('function');
        expect(dafaultFn({ uri: '/sap/opu/odata4/' })).toBe('4.0');
    });

    it('should return true when validating model name prompt', () => {
        const hasContentDuplicationSpy = jest.spyOn(validators, 'hasContentDuplication');

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName')).toBe(true);
        expect(hasContentDuplicationSpy).toHaveBeenCalledWith('customer.testName', 'model', []);
    });

    it('should return error message when validating model name prompt without "customer." prefix', () => {
        jest.spyOn(validators, 'hasCustomerPrefix').mockReturnValueOnce(false);

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('testName')).toBe("OData Service SAPUI5 Model Name should start with 'customer.'");
    });

    it('should return error message when validating model name contains only "customer."', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.')).toBe(
            "OData Service SAPUI5 Model Name should contain at least one character in addition to 'customer.'"
        );
    });

    it('should return error message when validating model name prompt and has special characters', () => {
        jest.spyOn(validators, 'validateSpecialChars').mockReturnValueOnce('general.invalidValueForSpecialChars');

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName@')).toBe('general.invalidValueForSpecialChars');
    });

    it('should return error message when validating model name prompt has content duplication', () => {
        jest.spyOn(validators, 'hasContentDuplication').mockReturnValueOnce(true);

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName')).toBe(
            'SAPUI5 Model with the same name was already added to the project'
        );
    });

    it('should return true when validating model settings prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('"key": "value"')).toBe(true);
    });

    it('should return true when validating model settings prompt with empty value', () => {
        jest.spyOn(validators, 'validateEmptyString').mockReturnValueOnce('general.inputCannotBeEmpty');

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('')).toBe(true);
    });

    it('should return error message when validating model settings prompt with incorrect input', () => {
        jest.spyOn(validators, 'validateJSON').mockReturnValueOnce('general.invalidJSON');

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('{"key": "value"}')).toBe('general.invalidJSON');
    });

    it('should return error message when validating data source name prompt without "customer." prefix', () => {
        jest.spyOn(validators, 'hasCustomerPrefix').mockReturnValueOnce(false);

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');
        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('testName', { name: 'testName' } as NewModelAnswers)).toBe(
            "OData Annotation Data Source Name should start with 'customer.'"
        );
    });

    it('should return error message when validating data source name prompt with only "customer." prefix', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.', { name: 'customer.testName' } as NewModelAnswers)).toBe(
            "OData Annotation Data Source Name should contain at least one character in addition to 'customer.'"
        );
    });

    it('should return true when validating data source name prompt', () => {
        const hasContentDuplicationSpy = jest.spyOn(validators, 'hasContentDuplication');

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(hasContentDuplicationSpy).toHaveBeenCalledWith('customer.testName', 'dataSource', []);
        expect(validation?.('customer.testName', { name: 'otherName' } as NewModelAnswers)).toBe(true);
    });

    it('should return error message when validating data source name prompt and has special characters', () => {
        jest.spyOn(validators, 'validateSpecialChars').mockReturnValueOnce('general.invalidValueForSpecialChars');

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName@', { name: 'otherName' } as NewModelAnswers)).toBe(
            'general.invalidValueForSpecialChars'
        );
    });

    it('should return error message when validating data source name prompt has content duplication', () => {
        jest.spyOn(validators, 'hasContentDuplication').mockReturnValueOnce(true);

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName', { name: 'otherName' } as NewModelAnswers)).toBe(
            'OData Annotation or OData Service with the same name was already added to the project'
        );
    });

    it('should return error message when validating data source name prompt has name duplication', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName', { name: 'customer.testName' } as NewModelAnswers)).toBe(
            'OData Service Name must be different from OData Annotation Data Source Name'
        );
    });

    it('should return true when validating data source uri prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceURI')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/opu/odata4Ann/')).toBe(true);
    });

    it('should return error message when data source uri is not valid uri', () => {
        jest.spyOn(validators, 'isDataSourceURI').mockReturnValueOnce(false);

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');
        const validation = prompts.find((p) => p.name === 'dataSourceURI')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/opu /odata4Ann/')).toBe(
            "Invalid URI. Should start and end with '/' and contain no spaces"
        );
    });

    it('should return true when validating annotation settings prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'annotationSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('"key": "value"')).toBe(true);
    });

    it('should display the dataSourceName, dataSourceURI, and annotationSettings prompts when addAnnotationMode is true', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');
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
