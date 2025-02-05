import type { ServiceProvider } from '@sap-ux/axios-extension';
import { getCfAbapBASQuestions } from '../../../../../src/prompts/datasources/sap-system/cf-abap/questions';
import type { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import type { Destination, ServiceInfo } from '@sap-ux/btp-utils';
import * as btpUtils from '@sap-ux/btp-utils';
import { type ServiceInstanceInfo } from '@sap/cf-tools';
import * as cfTools from '@sap/cf-tools';
import { PromptState } from '../../../../../src/utils/prompt-state';
import LoggerHelper from '../../../../../src/prompts/logger-helper';

const serviceProviderMock = {} as Partial<ServiceProvider>;

const connectionValidatorMock = {
    validity: {} as ConnectionValidator['validity'],
    validateDestination: jest.fn().mockResolvedValue({ valResult: true }),
    serviceProvider: serviceProviderMock
};

jest.mock('../../../../../src/prompts/connectionValidator', () => {
    return {
        ConnectionValidator: jest.fn().mockImplementation(() => connectionValidatorMock)
    };
});

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
jest.mock('@sap/cf-tools', () => {
    return {
        ...jest.requireActual('@sap/cf-tools'),
        apiGetInstanceCredentials: jest.fn().mockImplementation(() => uaaCredsMock)
    };
});

const createdDestinationMock: Destination = {
    Name: 'testDestName',
    Type: 'http',
    Authentication: 'OAuth2UserTokenExchange',
    Host: 'testDestHost',
    ProxyType: 'Internet',
    Description: 'testDescription'
};

jest.mock('@sap-ux/btp-utils', () => {
    return {
        ...jest.requireActual('@sap-ux/btp-utils'),
        createOAuth2UserTokenExchangeDest: jest.fn().mockImplementation(async () => createdDestinationMock),
        generateABAPCloudDestinationName: jest
            .fn()
            .mockImplementation((name: string) => `${name}-someCfOrg-someCfSpace`),
        isAppStudio: jest.fn().mockImplementation(() => true)
    };
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
                "message": "prompts.cloudFoundryAbapSystem.message",
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
                  "breadcrumb": "prompts.systemService.breadcrumb",
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
        const getCredsSpy = jest.spyOn(cfTools, 'apiGetInstanceCredentials');
        const createDestSpy = jest.spyOn(btpUtils, 'createOAuth2UserTokenExchangeDest');
        const validateDestSpy = jest.spyOn(connectionValidatorMock, 'validateDestination');
        const questions = getCfAbapBASQuestions();
        const cfDiscoQuestion = questions.find((question) => question.name === `cfAbapBas:cloudFoundryAbapSystem`);
        expect(
            await (cfDiscoQuestion?.validate as Function)({
                label: 'test1-cFAbapService',
                serviceName: 'test1-cfServicetechnicalName'
            } as ServiceInstanceInfo)
        ).toBe(true);
        expect(getCredsSpy).toBeCalledWith('test1-cFAbapService');
        expect(createDestSpy).toHaveBeenCalledWith(
            'test1-cFAbapService',
            {
                uaaCredentials: uaaCredsMock.credentials.uaa,
                hostUrl: uaaCredsMock.credentials.url
            },
            expect.any(LoggerHelper.logger.constructor)
        );
        expect(validateDestSpy).toHaveBeenCalledWith(createdDestinationMock, undefined, undefined);
        expect(PromptState.odataService.connectedSystem?.destination).toEqual(createdDestinationMock);
    });
});
