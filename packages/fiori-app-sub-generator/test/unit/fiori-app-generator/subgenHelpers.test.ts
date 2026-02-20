import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import type { Destination } from '@sap-ux/btp-utils';
import { DefaultLogger } from '@sap-ux/fiori-generator-shared';
import { addDeployGen, addFlpGen } from '../../../src/fiori-app-generator/subgenHelpers';
import { ApiHubType } from '../../../src/types';
import { join } from 'node:path';

describe('Subgen (flp/deploy) are correctly composedWith', () => {
    it('Should call composeWith `@sap/fiori:flp-config` with correct options', async () => {
        const composeWithMock = jest.fn();
        addFlpGen(
            {
                projectName: 'testAppName',
                targetFolder: '/test/target/folder',
                title: 'testAppName',
                skipPrompt: false
            },
            composeWithMock,
            DefaultLogger,
            {} as AppWizard,
            {} as any
        );

        expect(composeWithMock).toHaveBeenCalledWith('@sap/fiori:flp-config', {
            launchFlpConfigAsSubGenerator: true,
            appRootPath: join('/test/target/folder', 'testAppName'),
            appWizard: {},
            logWrapper: DefaultLogger,
            vscode: {}
        });

        composeWithMock.mockClear();

        addFlpGen(
            {
                projectName: 'testAppName',
                targetFolder: '/test/target/folder',
                title: 'testTitle',
                skipPrompt: true
            },
            composeWithMock,
            DefaultLogger,
            {} as AppWizard,
            {} as any
        );
        expect(composeWithMock).toHaveBeenCalledWith('@sap/fiori:flp-config', {
            launchFlpConfigAsSubGenerator: true,
            appRootPath: join('/test/target/folder', 'testAppName'),
            appWizard: {},
            logWrapper: DefaultLogger,
            vscode: {},
            skipPrompt: true,
            inboundConfig: {
                action: 'display',
                semanticObject: 'testAppName',
                title: 'testTitle'
            }
        });
    });

    it('Should call composeWith `@sap/fiori:fiori-deployment` with correct options', async () => {
        const composeWithMock = jest.fn();
        const addDeployGenOpts = {
            service: {
                host: 'http://mockhost:1234',
                servicePath: 'some/service/path',
                client: '010',
                destinationName: 'mockDestinationName',
                connectedSystem: {
                    destination: {
                        Name: 'mockDestinationName',
                        Type: 'HTTP',
                        Authentication: 'NoAuthentication'
                    } as Destination,
                    serviceProvider: {} as ServiceProvider
                }
            },
            projectName: 'testAppName',
            targetFolder: '/test/target/folder',
            applicationType: 'telemetryData_appType1'
        };

        addDeployGen(addDeployGenOpts, composeWithMock, DefaultLogger, {} as AppWizard, {
            packageManual: { default: 'PKG123' }
        });

        expect(composeWithMock).toHaveBeenCalledWith('@sap/fiori:deploy-config', {
            apiHubConfig: undefined,
            appGenClient: '010',
            appGenDestination: 'mockDestinationName',
            appGenServiceHost: 'http://mockhost:1234',
            appGenServicePath: 'some/service/path',
            appWizard: {},
            connectedSystem: {
                destination: {
                    Authentication: 'NoAuthentication',
                    Name: 'mockDestinationName',
                    Type: 'HTTP'
                },
                serviceProvider: {}
            },
            launchDeployConfigAsSubGenerator: true,
            logWrapper: DefaultLogger,
            projectName: 'testAppName',
            projectPath: '/test/target/folder',
            telemetryData: {
                appType: 'telemetryData_appType1'
            },
            subGenPromptOptions: {
                packageManual: { default: 'PKG123' }
            }
        });

        const apiHubConfig = { apiHubKey: 'mockApiHub', apiHubType: ApiHubType.apiHubEnterprise };
        addDeployGen(
            {
                ...addDeployGenOpts,
                service: {
                    ...addDeployGenOpts.service,
                    apiHubConfig,
                    connectedSystem: undefined
                }
            },
            composeWithMock,
            DefaultLogger,
            {} as AppWizard,
            { packageManual: { default: 'PKG123' } }
        );

        expect(composeWithMock).toHaveBeenCalledWith('@sap/fiori:deploy-config', {
            apiHubConfig: apiHubConfig,
            appGenClient: '010',
            appGenDestination: 'mockDestinationName',
            appGenServiceHost: 'http://mockhost:1234',
            appGenServicePath: 'some/service/path',
            appWizard: {},
            connectedSystem: undefined,
            launchDeployConfigAsSubGenerator: true,
            logWrapper: DefaultLogger,
            projectName: 'testAppName',
            projectPath: '/test/target/folder',
            telemetryData: {
                appType: 'telemetryData_appType1'
            },
            subGenPromptOptions: {
                packageManual: { default: 'PKG123' }
            }
        });
    });
});
