import * as i18n from '../../../../src/i18n';
import type { NewModelAnswers } from '../../../../src';
import { isCustomerBase } from '../../../../src';
import { isCFEnvironment } from '../../../../src/base/cf';
import { getPrompts } from '../../../../src/prompts/add-new-model';

import { getChangesByType } from '../../../../src/base/change-utils';

const getChangesByTypeMock = getChangesByType as jest.Mock;

const isCustomerBaseMock = isCustomerBase as jest.Mock;
const isCFEnvironmentMock = isCFEnvironment as jest.Mock;

jest.mock('../../../../src/base/change-utils.ts', () => ({
    ...jest.requireActual('../../../../src/base/change-utils.ts'),
    getChangesByType: jest.fn()
}));

jest.mock('../../../../src/base/helper.ts', () => ({
    isCustomerBase: jest.fn()
}));

jest.mock('../../../../src/base/cf.ts', () => ({
    isCFEnvironment: jest.fn()
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
        isCustomerBaseMock.mockReturnValue(false);
        isCFEnvironmentMock.mockReturnValue(false);

        const vendorPrompts = getPrompts(mockPath, 'VENDOR');

        expect(vendorPrompts.length).toBeGreaterThan(0);
        expect(vendorPrompts[0].default).toBe('');
        expect(vendorPrompts.some((prompt) => prompt.name === 'version')).toBeTruthy();
    });

    it('should adjust defaults based on customer layer', () => {
        isCustomerBaseMock.mockReturnValue(true);

        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        expect(prompts[0].default).toBe('customer.');
    });

    it('should return true when validating service name prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const namePrompt = prompts.find((p) => p.name === 'name');

        const validation =
            namePrompt?.validate &&
            namePrompt?.validate('customer.testName', { dataSourceName: 'otherName' } as NewModelAnswers);

        expect(validation).toBe(true);
    });

    it('should retur error message when validating service name prompt and name does not include "customer."', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const namePrompt = prompts.find((p) => p.name === 'name');

        const validation =
            namePrompt?.validate &&
            namePrompt?.validate('testName', { dataSourceName: 'otherName' } as NewModelAnswers);

        expect(validation).toBe("OData Service Name should start with 'customer.'");
    });

    it('should return true when validating service uri prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const uriPrompt = prompts.find((p) => p.name === 'uri');

        const validation = uriPrompt?.validate && uriPrompt?.validate('/sap/odata/v4');

        expect(validation).toBe(true);
    });

    it('should return default value for odata version when uri answer is present', () => {
        isCFEnvironmentMock.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result = getPrompts(mockPath, 'CUSTOMER_BASE');

        const versionPrompt = result.find((prompt) => prompt.name === 'version');

        expect(versionPrompt?.default({ uri: 'odata/v4/example' })).toBe('4.0');
    });

    it('should return default value for odata version when uri answer is not present', () => {
        isCFEnvironmentMock.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result = getPrompts(mockPath, 'CUSTOMER_BASE');

        const versionPrompt = result.find((prompt) => prompt.name === 'version');

        expect(versionPrompt?.default({ uri: undefined })).toBe('2.0');
    });

    it('should return true when validating model name prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const modelNamePrompt = prompts.find((p) => p.name === 'modelName');

        const validation = modelNamePrompt?.validate && modelNamePrompt?.validate('customer.testName');

        expect(validation).toBe(true);
    });

    it('should return error message when validating model name prompt without "customer." prefix', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const modelNamePrompt = prompts.find((p) => p.name === 'modelName');

        const validation = modelNamePrompt?.validate && modelNamePrompt?.validate('testName');

        expect(validation).toBe("OData Service SAPUI5 Model Name should start with 'customer.'");
    });

    it('should return true when validating model settings prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const modelSettPrompt = prompts.find((p) => p.name === 'modelSettings');

        const validation = modelSettPrompt?.validate && modelSettPrompt?.validate('"key": "value"');

        expect(validation).toBe(true);
    });

    it('should return error message when validating model settings prompt with incorrect input', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');

        const modelSettPrompt = prompts.find((p) => p.name === 'modelSettings');

        const validation = modelSettPrompt?.validate && modelSettPrompt?.validate('{"key": "value"}');

        expect(validation).toBe('Invalid OData Service SAPUI5 Model Settings');
    });

    it('should return error message when validating data source name prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');
        const dataSourcePrompt = prompts.find((p) => p.name === 'dataSourceName');

        const validation =
            dataSourcePrompt?.validate &&
            dataSourcePrompt?.validate('testName', { dataSourceName: 'testName' } as NewModelAnswers);

        expect(validation).toBe("OData Annotation Data Source Name should start with 'customer.'");
    });

    it('should return true when validating data source name prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');
        const dataSourcePrompt = prompts.find((p) => p.name === 'dataSourceName');

        const validation =
            dataSourcePrompt?.validate &&
            dataSourcePrompt?.validate('customer.testName', { dataSourceName: 'otherName' } as NewModelAnswers);

        expect(validation).toBe(true);
    });

    it('should return true when validating data source uri prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');
        const dataSourceUriPrompt = prompts.find((p) => p.name === 'dataSourceURI');

        const validation = dataSourceUriPrompt?.validate && dataSourceUriPrompt?.validate('customer.testName');

        expect(validation).toBe(true);
    });

    it('should return true when validating annotation settings prompt', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');
        const annotationSettPrompt = prompts.find((p) => p.name === 'annotationSettings');

        const validation = annotationSettPrompt?.validate && annotationSettPrompt?.validate('"key": "value"');

        expect(validation).toBe(true);
    });

    it('should display the dataSourceName, dataSourceURI, and annotationSettings prompts when addAnnotationMode is true', () => {
        const prompts = getPrompts(mockPath, 'CUSTOMER_BASE');
        const answers = { addAnnotationMode: true } as NewModelAnswers;

        const dataSourceNamePrompt = prompts.find((p) => p.name === 'dataSourceName');
        const dataSourceURIPrompt = prompts.find((p) => p.name === 'dataSourceURI');
        const annotationSettingsPrompt = prompts.find((p) => p.name === 'annotationSettings');

        const showDataSourceName =
            typeof dataSourceNamePrompt?.when === 'function' && dataSourceNamePrompt.when(answers);
        const showDataSourceURI = typeof dataSourceURIPrompt?.when === 'function' && dataSourceURIPrompt.when(answers);
        const showAnnotationSettings =
            typeof annotationSettingsPrompt?.when === 'function' && annotationSettingsPrompt.when(answers);

        expect(showDataSourceName).toBe(true);
        expect(showDataSourceURI).toBe(true);
        expect(showAnnotationSettings).toBe(true);
    });
});
