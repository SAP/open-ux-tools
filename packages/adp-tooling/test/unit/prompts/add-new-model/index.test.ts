import * as i18n from '../../../../src/i18n';
import type { NewModelAnswers, DescriptorVariant } from '../../../../src';
import type { NewModelDataWithAnnotations } from '../../../../src/types';
import { isCFEnvironment } from '../../../../src/base/cf';
import { getAdpConfig } from '../../../../src/base/helper';
import { getPrompts, createNewModelData } from '../../../../src/prompts/add-new-model';
import * as validators from '@sap-ux/project-input-validator';
import { getChangesByType } from '../../../../src/base/change-utils';
import { listDestinations, isOnPremiseDestination } from '@sap-ux/btp-utils';
import { getBtpDestinations } from '../../../../src/cf/services/destinations';
import { Severity } from '@sap-devx/yeoman-ui-types';
import { readFileSync } from 'node:fs';
import type { ToolsLogger } from '@sap-ux/logger';

const getChangesByTypeMock = getChangesByType as jest.Mock;
const isCFEnvironmentMock = isCFEnvironment as jest.Mock;
const getAdpConfigMock = getAdpConfig as jest.Mock;
const listDestinationsMock = listDestinations as jest.Mock;
const getDestinationsMock = getBtpDestinations as jest.Mock;
const isOnPremiseDestinationMock = isOnPremiseDestination as jest.Mock;

const readFileSyncMock = readFileSync as jest.Mock;

jest.mock('../../../../src/base/change-utils.ts', () => ({
    ...jest.requireActual('../../../../src/base/change-utils.ts'),
    getChangesByType: jest.fn()
}));

jest.mock('../../../../src/base/cf.ts', () => ({
    isCFEnvironment: jest.fn()
}));

jest.mock('../../../../src/base/helper.ts', () => ({
    ...jest.requireActual('../../../../src/base/helper.ts'),
    getAdpConfig: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    listDestinations: jest.fn(),
    isOnPremiseDestination: jest.fn()
}));

jest.mock('../../../../src/cf/services/destinations', () => ({
    getBtpDestinations: jest.fn()
}));

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    readFileSync: jest.fn()
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
        isCFEnvironmentMock.mockResolvedValue(false);
        getAdpConfigMock.mockRejectedValue(new Error('ui5.yaml not found'));
        listDestinationsMock.mockResolvedValue({});
        getDestinationsMock.mockResolvedValue({});
        readFileSyncMock.mockClear();
        readFileSyncMock.mockReturnValue('{"routes": []}');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should generate prompts with default settings for non-customer layers', async () => {
        const vendorPrompts = await getPrompts(mockPath, 'VENDOR');

        expect(vendorPrompts.length).toBeGreaterThan(0);
        expect(vendorPrompts.some((prompt) => prompt.name === 'serviceType')).toBeTruthy();
    });

    it('should adjust defaults based on customer layer', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        expect(prompts.find((p) => p.name === 'modelAndDatasourceName')?.default).toBe('customer.');
    });

    it('should return true when validating service name prompt', async () => {
        const hasContentDuplicationSpy = jest.spyOn(validators, 'hasContentDuplication');

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelAndDatasourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName')).toBe(true);
        expect(hasContentDuplicationSpy).toHaveBeenCalledWith('customer.testName', 'dataSource', []);
    });

    it('should return error message when validating service name prompt and name does not include "customer."', async () => {
        jest.spyOn(validators, 'hasCustomerPrefix').mockReturnValueOnce(false);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelAndDatasourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('testName')).toBe("Model and Data Source Name must start with 'customer.'.");
    });

    it('should return error message when validating service name prompt and name is only "customer."', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelAndDatasourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.')).toBe('The input must end with an alphanumeric character.');
    });

    it('should return error message when validating service name prompt and has special characters', async () => {
        jest.spyOn(validators, 'validateSpecialChars').mockReturnValueOnce('general.invalidValueForSpecialChars');

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const validation = prompts.find((p) => p.name === 'modelAndDatasourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName@')).toBe('general.invalidValueForSpecialChars');
    });

    it('should return error message when validating service name prompt and name ends with a non-alphanumeric character', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelAndDatasourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName.')).toBe('The input must end with an alphanumeric character.');
        expect(validation?.('customer.testName-')).toBe('The input must end with an alphanumeric character.');
        expect(validation?.('customer.testName$')).toBe('The input must end with an alphanumeric character.');
    });

    it('should return error message when validating service name prompt and has content duplication', async () => {
        jest.spyOn(validators, 'hasContentDuplication').mockReturnValueOnce(true);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelAndDatasourceName')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('customer.testName')).toBe(
            'A data source and SAPUI5 model with the same name were already added to the project. Rename and try again.'
        );
    });

    it('should return true when validating service uri prompt', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/odata/v4/')).toBe(true);
    });

    it('should return error message when validating empty service uri prompt', async () => {
        jest.spyOn(validators, 'validateEmptyString').mockReturnValueOnce('general.inputCannotBeEmpty');

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('')).toBe('general.inputCannotBeEmpty');
    });

    it('should return error message when service uri is not valid uri', async () => {
        jest.spyOn(validators, 'isDataSourceURI').mockReturnValueOnce(false);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/opu /odata4/')).toBe(i18n.t('validators.errorInvalidDataSourceURI'));
    });

    it('should return information message with resulting service URL for ABAP VS Code project (url in ui5.yaml)', async () => {
        getAdpConfigMock.mockResolvedValue({ target: { url: 'https://abap.example.com' } });

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const additionalMessages = prompts.find((p) => p.name === 'uri')?.additionalMessages as Function;

        expect(typeof additionalMessages).toBe('function');
        const result = await additionalMessages('/sap/odata/v4/', undefined);
        expect(result).toEqual({
            message: i18n.t('prompts.resultingServiceUrl', {
                url: 'https://abap.example.com/sap/odata/v4/',
                interpolation: { escapeValue: false }
            }),
            severity: Severity.information
        });
    });

    it('should return information message with resulting service URL for ABAP BAS project (destination in ui5.yaml)', async () => {
        getAdpConfigMock.mockResolvedValue({ target: { destination: 'MY_DEST' } });
        listDestinationsMock.mockResolvedValue({ MY_DEST: { Host: 'https://bas.dest.example.com', Name: 'MY_DEST' } });

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const additionalMessages = prompts.find((p) => p.name === 'uri')?.additionalMessages as Function;

        expect(typeof additionalMessages).toBe('function');
        const result = await additionalMessages('/sap/odata/v4/', undefined);
        expect(result).toEqual({
            message: i18n.t('prompts.resultingServiceUrl', {
                url: 'https://bas.dest.example.com/sap/odata/v4/',
                interpolation: { escapeValue: false }
            }),
            severity: Severity.information
        });
    });

    it('should return information message with resulting service URL for CF project using selected destination', async () => {
        isCFEnvironmentMock.mockResolvedValue(true);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const additionalMessages = prompts.find((p) => p.name === 'uri')?.additionalMessages as Function;

        expect(typeof additionalMessages).toBe('function');
        const previousAnswers = {
            destination: { Host: 'https://cf.dest.example.com', Name: 'CF_DEST' }
        } as unknown as NewModelAnswers;
        const result = await additionalMessages('/sap/odata/v4/', previousAnswers);
        expect(result).toEqual({
            message: i18n.t('prompts.resultingServiceUrl', {
                url: 'https://cf.dest.example.com/sap/odata/v4/',
                interpolation: { escapeValue: false }
            }),
            severity: Severity.information
        });
    });

    it('should return undefined from additionalMessages when uri is invalid', async () => {
        jest.spyOn(validators, 'isDataSourceURI').mockReturnValueOnce(false);
        getAdpConfigMock.mockResolvedValue({ target: { url: 'https://abap.example.com' } });

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const additionalMessages = prompts.find((p) => p.name === 'uri')?.additionalMessages as Function;

        expect(typeof additionalMessages).toBe('function');
        const result = await additionalMessages('not-a-valid-uri', undefined);
        expect(result).toBeUndefined();
    });

    it('should return undefined from additionalMessages when no destination URL is available', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const additionalMessages = prompts.find((p) => p.name === 'uri')?.additionalMessages as Function;

        expect(typeof additionalMessages).toBe('function');
        const result = await additionalMessages('/sap/odata/v4/', undefined);
        expect(result).toBeUndefined();
    });

    it('should return true when validating model settings prompt', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('"key": "value"')).toBe(true);
    });

    it('should return true when validating model settings prompt with empty value', async () => {
        jest.spyOn(validators, 'validateEmptyString').mockReturnValueOnce('general.inputCannotBeEmpty');

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('')).toBe(true);
    });

    it('should return error message when validating model settings prompt with incorrect input', async () => {
        jest.spyOn(validators, 'validateJSON').mockReturnValueOnce('general.invalidJSON');

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'modelSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('{"key": "value"}')).toBe('general.invalidJSON');
    });

    it('should return true when validating data source uri prompt', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'dataSourceURI')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/opu/odata4Ann/')).toBe(true);
    });

    it('should return error message when data source uri is not valid uri', async () => {
        jest.spyOn(validators, 'isDataSourceURI').mockReturnValueOnce(false);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const validation = prompts.find((p) => p.name === 'dataSourceURI')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/opu /odata4Ann/')).toBe(i18n.t('validators.errorInvalidDataSourceURI'));
    });

    it('should return information message with resulting annotation URL for ABAP VS Code project (url in ui5.yaml)', async () => {
        getAdpConfigMock.mockResolvedValue({ target: { url: 'https://abap.example.com' } });

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const additionalMessages = prompts.find((p) => p.name === 'dataSourceURI')?.additionalMessages as Function;

        expect(typeof additionalMessages).toBe('function');
        const result = await additionalMessages('/sap/opu/odata4Ann/', undefined);
        expect(result).toEqual({
            message: i18n.t('prompts.resultingAnnotationUrl', {
                url: 'https://abap.example.com/sap/opu/odata4Ann/',
                interpolation: { escapeValue: false }
            }),
            severity: Severity.information
        });
    });

    it('should return information message with resulting annotation URL for ABAP BAS project (destination in ui5.yaml)', async () => {
        getAdpConfigMock.mockResolvedValue({ target: { destination: 'MY_DEST' } });
        listDestinationsMock.mockResolvedValue({ MY_DEST: { Host: 'https://bas.dest.example.com', Name: 'MY_DEST' } });

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const additionalMessages = prompts.find((p) => p.name === 'dataSourceURI')?.additionalMessages as Function;

        expect(typeof additionalMessages).toBe('function');
        const result = await additionalMessages('/sap/opu/odata4Ann/', undefined);
        expect(result).toEqual({
            message: i18n.t('prompts.resultingAnnotationUrl', {
                url: 'https://bas.dest.example.com/sap/opu/odata4Ann/',
                interpolation: { escapeValue: false }
            }),
            severity: Severity.information
        });
    });

    it('should return information message with resulting annotation URL for CF project using selected destination', async () => {
        isCFEnvironmentMock.mockResolvedValue(true);

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const additionalMessages = prompts.find((p) => p.name === 'dataSourceURI')?.additionalMessages as Function;

        expect(typeof additionalMessages).toBe('function');
        const previousAnswers = {
            destination: { Host: 'https://cf.dest.example.com', Name: 'CF_DEST' }
        } as unknown as NewModelAnswers;
        const result = await additionalMessages('/sap/opu/odata4Ann/', previousAnswers);
        expect(result).toEqual({
            message: i18n.t('prompts.resultingAnnotationUrl', {
                url: 'https://cf.dest.example.com/sap/opu/odata4Ann/',
                interpolation: { escapeValue: false }
            }),
            severity: Severity.information
        });
    });

    it('should return undefined from dataSourceURI additionalMessages when uri is invalid', async () => {
        jest.spyOn(validators, 'isDataSourceURI').mockReturnValueOnce(false);
        getAdpConfigMock.mockResolvedValue({ target: { url: 'https://abap.example.com' } });

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const additionalMessages = prompts.find((p) => p.name === 'dataSourceURI')?.additionalMessages as Function;

        expect(typeof additionalMessages).toBe('function');
        const result = await additionalMessages('not-a-valid-uri', undefined);
        expect(result).toBeUndefined();
    });

    it('should return undefined from dataSourceURI additionalMessages when no destination URL is available', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const additionalMessages = prompts.find((p) => p.name === 'dataSourceURI')?.additionalMessages as Function;

        expect(typeof additionalMessages).toBe('function');
        const result = await additionalMessages('/sap/opu/odata4Ann/', undefined);
        expect(result).toBeUndefined();
    });

    it('should return true when validating annotation settings prompt', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');

        const validation = prompts.find((p) => p.name === 'annotationSettings')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('"key": "value"')).toBe(true);
    });

    it('should display the dataSourceURI and annotationSettings prompts when addAnnotationMode is true', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const answers = { addAnnotationMode: true } as NewModelAnswers;

        const dataSourceURIPromptWhen = prompts.find((p) => p.name === 'dataSourceURI')?.when as Function;
        const annotationSettingsPromptWhen = prompts.find((p) => p.name === 'annotationSettings')?.when as Function;

        expect(typeof dataSourceURIPromptWhen).toBe('function');
        expect(typeof annotationSettingsPromptWhen).toBe('function');
        expect(dataSourceURIPromptWhen(answers)).toBe(true);
        expect(annotationSettingsPromptWhen(answers)).toBe(true);
    });

    it('should show "Datasource Name" label for modelAndDatasourceName prompt when service type is HTTP', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const messageFn = prompts.find((p) => p.name === 'modelAndDatasourceName')?.message as Function;

        expect(typeof messageFn).toBe('function');
        expect(messageFn({ serviceType: 'HTTP' })).toBe(i18n.t('prompts.datasourceNameLabel'));
    });

    it('should show "Model and Datasource Name" label for modelAndDatasourceName prompt when service type is OData', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const messageFn = prompts.find((p) => p.name === 'modelAndDatasourceName')?.message as Function;

        expect(typeof messageFn).toBe('function');
        expect(messageFn({ serviceType: 'OData v2' })).toBe(i18n.t('prompts.modelAndDatasourceNameLabel'));
    });

    it('should hide modelSettings and addAnnotationMode prompts when service type is HTTP', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const httpAnswers = { serviceType: 'HTTP' } as unknown as NewModelAnswers;

        const modelSettingsWhen = prompts.find((p) => p.name === 'modelSettings')?.when as Function;
        const addAnnotationModeWhen = prompts.find((p) => p.name === 'addAnnotationMode')?.when as Function;

        expect(typeof modelSettingsWhen).toBe('function');
        expect(typeof addAnnotationModeWhen).toBe('function');
        expect(modelSettingsWhen(httpAnswers)).toBe(false);
        expect(addAnnotationModeWhen(httpAnswers)).toBe(false);
    });

    it('should show modelSettings and addAnnotationMode prompts when service type is OData', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const odataAnswers = { serviceType: 'OData v2' } as unknown as NewModelAnswers;

        const modelSettingsWhen = prompts.find((p) => p.name === 'modelSettings')?.when as Function;
        const addAnnotationModeWhen = prompts.find((p) => p.name === 'addAnnotationMode')?.when as Function;

        expect(typeof modelSettingsWhen).toBe('function');
        expect(typeof addAnnotationModeWhen).toBe('function');
        expect(modelSettingsWhen(odataAnswers)).toBe(true);
        expect(addAnnotationModeWhen(odataAnswers)).toBe(true);
    });

    it('should return error when xs-app.json already has a route with the same target for CF project', async () => {
        isCFEnvironmentMock.mockResolvedValue(true);
        readFileSyncMock.mockReturnValueOnce(
            JSON.stringify({
                routes: [{ source: '^some/route/(.*)', target: '/sap/opu/odata/v4/$1', destination: 'DEST' }]
            }) as any
        );

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/opu/odata/v4/')).toBe(i18n.t('validators.errorRouteAlreadyExists'));
    });

    it('should return true when xs-app.json has no matching route for CF project', async () => {
        isCFEnvironmentMock.mockResolvedValue(true);
        readFileSyncMock.mockReturnValueOnce(
            JSON.stringify({
                routes: [{ source: '^other/route/(.*)', target: '/other/route/$1', destination: 'DEST' }]
            }) as any
        );

        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        expect(validation?.('/sap/opu/odata/v4/')).toBe(true);
    });

    it('should not check xs-app.json for duplicate routes in a non-CF project', async () => {
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE');
        const validation = prompts.find((p) => p.name === 'uri')?.validate;

        expect(typeof validation).toBe('function');
        validation?.('/sap/opu/odata/v4/');

        expect(readFileSyncMock).not.toHaveBeenCalledWith(expect.stringContaining('xs-app.json'), expect.anything());
    });

    it('should log the error and set a generic UI error message when fetching destinations fails in CF', async () => {
        isCFEnvironmentMock.mockResolvedValue(true);
        getDestinationsMock.mockRejectedValue(new Error('Network error'));

        const logger = { error: jest.fn() } as Partial<ToolsLogger> as ToolsLogger;
        const prompts = await getPrompts(mockPath, 'CUSTOMER_BASE', logger);

        const destinationPrompt = prompts.find((p) => p.name === 'destination');
        const validate = destinationPrompt?.validate as Function;

        expect(logger.error).toHaveBeenCalledWith('Network error');
        expect(validate?.(undefined)).toBe(i18n.t('error.errorFetchingDestinations'));
    });
});

describe('createNewModelData', () => {
    const mockPath = '/path/to/project';
    const variant = { id: 'my.variant', layer: 'CUSTOMER_BASE' } as unknown as DescriptorVariant;

    beforeAll(async () => {
        await i18n.initI18n();
    });

    beforeEach(() => {
        isCFEnvironmentMock.mockResolvedValue(false);
        isOnPremiseDestinationMock.mockReturnValue(false);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should build data for a non-CF OData v2 project', async () => {
        const logger = { error: jest.fn() } as Partial<ToolsLogger> as ToolsLogger;
        const answers = {
            modelAndDatasourceName: 'customer.MyService',
            uri: '/sap/opu/odata/svc/',
            serviceType: 'OData v2' as NewModelAnswers['serviceType'],
            modelSettings: '{}',
            addAnnotationMode: false
        } as NewModelAnswers;

        const result = await createNewModelData(mockPath, variant, answers, logger);

        expect(result.variant).toBe(variant);
        expect(result.isCloudFoundry).toBe(false);
        expect(result.destinationName).toBeUndefined();
        expect(result.logger).toBe(logger);
        expect(result.service).toEqual({
            name: 'customer.MyService',
            uri: '/sap/opu/odata/svc/',
            modelName: 'customer.MyService',
            version: '2.0',
            modelSettings: '{}'
        });
    });

    it('should set modelName to undefined for HTTP service type', async () => {
        const answers = {
            modelAndDatasourceName: 'customer.MyDatasource',
            uri: '/sap/opu/odata/svc/',
            serviceType: 'HTTP' as NewModelAnswers['serviceType'],
            modelSettings: '{}',
            addAnnotationMode: false
        } as NewModelAnswers;

        const result = await createNewModelData(mockPath, variant, answers);

        expect(result.service.modelName).toBeUndefined();
        expect(result.service.version).toBeUndefined();
    });

    it('should include annotation when addAnnotationMode is true', async () => {
        const answers = {
            modelAndDatasourceName: 'customer.MyService',
            uri: '/sap/opu/odata/svc/',
            serviceType: 'OData v2' as NewModelAnswers['serviceType'],
            modelSettings: '{}',
            addAnnotationMode: true,
            dataSourceURI: '/sap/opu/odata/ann/',
            annotationSettings: '"key": "value"'
        } as NewModelAnswers;

        const result = (await createNewModelData(mockPath, variant, answers)) as NewModelDataWithAnnotations;

        expect(result.annotation).toEqual({
            dataSourceName: 'customer.MyService.annotation',
            dataSourceURI: '/sap/opu/odata/ann/',
            settings: '"key": "value"'
        });
    });

    it('should set CF fields and isOnPremiseDestination for CF on-premise projects', async () => {
        isCFEnvironmentMock.mockResolvedValue(true);
        isOnPremiseDestinationMock.mockReturnValue(true);

        const destination = { Host: 'https://cf.dest.example.com', Name: 'CF_DEST' };
        const answers = {
            modelAndDatasourceName: 'customer.MyService',
            uri: '/sap/opu/odata/svc/',
            serviceType: 'OData v2' as NewModelAnswers['serviceType'],
            modelSettings: '{}',
            addAnnotationMode: false,
            destination
        } as unknown as NewModelAnswers;

        const result = await createNewModelData(mockPath, variant, answers);

        expect(result.isCloudFoundry).toBe(true);
        expect(result.destinationName).toBe('CF_DEST');
        expect(result.isOnPremiseDestination).toBe(true);
        expect(isOnPremiseDestinationMock).toHaveBeenCalledWith(destination);
    });
});
