import { jest } from '@jest/globals';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import type { Destination, ServiceInfo } from '@sap-ux/btp-utils';
import { type ServiceInstanceInfo } from '@sap/cf-tools';
import type { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import LoggerHelper from '../../../../../src/prompts/logger-helper';

const serviceProviderMock = {} as Partial<ServiceProvider>;

const connectionValidatorMock = {
    validity: {} as ConnectionValidator['validity'],
    validateDestination: jest.fn().mockResolvedValue({ valResult: true }),
    serviceProvider: serviceProviderMock
};
jest.unstable_mockModule('../../../../../src/prompts/connectionValidator', () => ({
    ConnectionValidator: jest.fn().mockImplementation(() => connectionValidatorMock)
}));

const uaaCredsMock = {
    credentials: {
        uaa: {
            clientid: 'testClientId',
            clientsecret: 'abcd12345',
            url: 'http://testUrl'
        } as ServiceInfo['uaa'],
        url: 'http://123abcd-fully-resolved-host-url.abap.somewhereaws.hanavlab.ondemand.com'
    }
};
const actualCfTools = await import('@sap/cf-tools');
const mockApiGetInstanceCredentials = jest.fn<any>().mockImplementation(() => uaaCredsMock);
jest.unstable_mockModule('@sap/cf-tools', () => ({
    ...actualCfTools,
    apiGetInstanceCredentials: mockApiGetInstanceCredentials
}));

const createdDestinationMock: Destination = {
    Name: 'testDestName',
    Type: 'http',
    Authentication: 'OAuth2UserTokenExchange',
    Host: 'testDestHost',
    ProxyType: 'Internet',
    Description: 'testDescription'
};

const actualBtpUtils = await import('@sap-ux/btp-utils');
const mockCreateOAuth2Dest = jest.fn<any>().mockImplementation(async () => createdDestinationMock);
const mockGenerateABAPCloudDestinationName = jest
    .fn<any>()
    .mockImplementation((name: string) => `${name}-someCfOrg-someCfSpace`);
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    createOAuth2UserTokenExchangeDest: mockCreateOAuth2Dest,
    generateABAPCloudDestinationName: mockGenerateABAPCloudDestinationName,
    isAppStudio: jest.fn().mockImplementation(() => true)
}));

const actualUtils = await import('../../../../../src/utils');
const mockIsBackendSystemKeyExisting = jest.fn<any>(actualUtils.isBackendSystemKeyExisting);
jest.unstable_mockModule('../../../../../src/utils', () => ({
    ...actualUtils,
    isBackendSystemKeyExisting: mockIsBackendSystemKeyExisting
}));

const { initI18nOdataServiceInquirer } = await import('../../../../../src/i18n');
const { getCfAbapBASQuestions } = await import('../../../../../src/prompts/datasources/sap-system/cf-abap/questions');
const { PromptState } = await import('../../../../../src/utils');

beforeAll(async () => {
    await initI18nOdataServiceInquirer();
});
/**
 * Note `getCFDiscoverPrompts` is mostly tested as part of `abap-on-btp` tests.
 * Tests here are to cover BAS specific prompts.
 *
 */
describe('tests cf abap service dicovery prompts for BAS', () => {
    test('test getCfAbapBASQuestions correct questions are returned', () => {
        const prompts = getCfAbapBASQuestions();

        expect(prompts).toMatchInlineSnapshot(`
            [
              {
                "choices": [Function],
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": true,
                },
                "message": "ABAP environment",
                "name": "cfAbapBas:cloudFoundryAbapSystem",
                "type": "list",
                "validate": [Function],
              },
              {
                "name": "cliCfAbapService",
                "when": [Function],
              },
              {
                "additionalMessages": [Function],
                "choices": [Function],
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": "Service",
                  "mandatory": true,
                },
                "message": [Function],
                "name": "cfAbapBas:serviceSelection",
                "source": [Function],
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              {
                "name": "cfAbapBas:cliServiceSelection",
                "when": [Function],
              },
            ]
        `);
    });

    test('test getCfAbapBASQuestions validate() will create a new destination for services retreival', async () => {
        PromptState.isYUI = true;
        const questions = getCfAbapBASQuestions();
        const cfDiscoQuestion = questions.find((question) => question.name === `cfAbapBas:cloudFoundryAbapSystem`);
        expect(
            await (cfDiscoQuestion?.validate as Function)({
                label: 'test1-cFAbapService',
                serviceName: 'test1-cfServicetechnicalName'
            } as ServiceInstanceInfo)
        ).toBe(true);
        expect(mockApiGetInstanceCredentials).toHaveBeenCalledWith('test1-cFAbapService');
        expect(mockCreateOAuth2Dest).toHaveBeenCalledWith(
            'test1-cFAbapService',
            {
                uaaCredentials: uaaCredsMock.credentials.uaa,
                hostUrl: uaaCredsMock.credentials.url
            },
            expect.any(LoggerHelper.logger.constructor)
        );
        expect(connectionValidatorMock.validateDestination).toHaveBeenCalledWith(
            createdDestinationMock,
            undefined,
            undefined
        );
        expect(PromptState.odataService.connectedSystem?.destination).toEqual(createdDestinationMock);
        expect(mockIsBackendSystemKeyExisting).not.toHaveBeenCalled();
    });

    test('test getCfAbapBASQuestions validate() will throw an exception if the user is missing privileges on CF', async () => {
        PromptState.isYUI = true;
        const errMsg = `Couldn't create the destination from following error: Request failed with status code 403. Error code=403`;
        mockCreateOAuth2Dest.mockImplementation(() => {
            throw new Error(errMsg);
        });
        const questions = getCfAbapBASQuestions();
        const cfDiscoQuestion = questions.find((question) => question.name === `cfAbapBas:cloudFoundryAbapSystem`);
        expect(
            await (cfDiscoQuestion?.validate as Function)({
                label: 'test1-cFAbapService',
                serviceName: 'test1-cfServicetechnicalName'
            } as ServiceInstanceInfo)
        ).toEqual(errMsg);
        expect(mockApiGetInstanceCredentials).toHaveBeenCalledWith('test1-cFAbapService');
        expect(mockCreateOAuth2Dest).toHaveBeenCalled();
    });

    test('Should include value help download prompt when promptOptions.valueHelpDownload.hide is false', () => {
        const questions = getCfAbapBASQuestions({ valueHelpDownload: { hide: false } });
        const valueHelpPrompt = questions.find((question) => question.name === 'cfAbapBas:valueHelpDownload');
        expect(valueHelpPrompt).toBeDefined();
        expect(valueHelpPrompt?.type).toBe('confirm');
    });

    test('Should not include value help download prompt when promptOptions.valueHelpDownload.hide is true', () => {
        const questions = getCfAbapBASQuestions({ valueHelpDownload: { hide: true } });
        const valueHelpPrompt = questions.find((question) => question.name === 'cfAbapBas:valueHelpDownload');
        expect(valueHelpPrompt).toBeUndefined();
    });

    test('Should not include value help download prompt by default when promptOptions is not provided', () => {
        const questions = getCfAbapBASQuestions();
        const valueHelpPrompt = questions.find((question) => question.name === 'cfAbapBas:valueHelpDownload');
        expect(valueHelpPrompt).toBeUndefined();
    });
});
