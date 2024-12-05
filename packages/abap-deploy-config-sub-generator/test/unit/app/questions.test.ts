import { type Destination, isAppStudio } from '@sap-ux/btp-utils';
import * as abapInquirer from '@sap-ux/abap-deploy-config-inquirer';
import { getAbapQuestions } from '../../../src/app/questions';
import { readUi5Yaml } from '@sap-ux/project-access';
import { AuthenticationType, BackendSystem } from '@sap-ux/store';

jest.mock('@sap-ux/btp-utils', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/btp-utils') as {}),
    isAppStudio: jest.fn()
}));
const mockIsAppStudio = isAppStudio as jest.Mock;

jest.mock('@sap-ux/project-access', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as {}),
    readUi5Yaml: jest.fn()
}));
const mockReadUi5Yaml = readUi5Yaml as jest.Mock;

jest.mock('@sap-ux/abap-deploy-config-inquirer', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/abap-deploy-config-inquirer') as {}),
    getPrompts: jest.fn()
}));

describe('Test getAbapQuestions', () => {
    test('should return questions for destination', async () => {
        const getPromptsSpy = jest.spyOn(abapInquirer, 'getPrompts');
        mockIsAppStudio.mockReturnValue(true);
        mockReadUi5Yaml.mockRejectedValueOnce(new Error('No yaml config found'));
        await getAbapQuestions({
            projectPath: 'mock/path/to/project',
            connectedSystem: {
                destination: {
                    Name: 'mock-destination',
                    Host: 'mock-host'
                } as Destination
            },
            backendConfig: undefined,
            indexGenerationAllowed: true,
            showOverwriteQuestion: false
        });

        expect(getPromptsSpy).toBeCalledWith(
            {
                backendTarget: {
                    abapTarget: {
                        'authenticationType': undefined,
                        client: '',
                        destination: 'mock-destination',
                        scp: undefined,
                        url: undefined
                    },
                    systemName: undefined,
                    serviceProvider: undefined,
                    type: 'application'
                },
                ui5AbapRepo: { default: undefined },
                description: { default: undefined },
                packageManual: { default: undefined },
                transportManual: { default: undefined },
                index: { indexGenerationAllowed: true },
                packageAutocomplete: { useAutocomplete: true },
                overwrite: { hide: true }
            },
            expect.any(Object),
            false
        );
    });

    test('should return questions for backend system', async () => {
        const getPromptsSpy = jest.spyOn(abapInquirer, 'getPrompts');
        mockIsAppStudio.mockReturnValue(true);
        mockReadUi5Yaml.mockRejectedValueOnce(new Error('No yaml config found'));
        await getAbapQuestions({
            projectPath: 'mock/path/to/project',
            connectedSystem: {
                backendSystem: {
                    name: 'mock-backend-system',
                    url: 'https://mock-url',
                    client: '100',
                    authenticationType: AuthenticationType.ReentranceTicket,
                    scp: false
                } as BackendSystem
            },
            backendConfig: undefined,
            configFile: 'ui5-deploy.yaml'
        });

        expect(getPromptsSpy).toBeCalledWith(
            {
                backendTarget: {
                    abapTarget: {
                        url: 'https://mock-url',
                        client: '100',
                        authenticationType: AuthenticationType.ReentranceTicket,
                        scp: false,
                        destination: undefined
                    },
                    systemName: 'mock-backend-system',
                    serviceProvider: undefined,
                    type: 'application'
                },
                ui5AbapRepo: { default: undefined },
                description: { default: undefined },
                packageManual: { default: undefined },
                transportManual: { default: undefined },
                index: { indexGenerationAllowed: false },
                packageAutocomplete: { useAutocomplete: true },
                overwrite: { hide: true }
            },
            expect.any(Object),
            false
        );
    });
});
