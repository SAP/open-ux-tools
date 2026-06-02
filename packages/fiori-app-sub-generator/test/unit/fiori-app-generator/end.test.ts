import { jest } from '@jest/globals';
import type { BackendSystem } from '@sap-ux/store';
import { PLATFORMS, ApiHubType, EventName, State } from '../../../src/types';
import type { ILogWrapper } from '@sap-ux/fiori-generator-shared';
import type { CapService } from '@sap-ux/odata-service-inquirer';
import { DatasourceType, OdataVersion } from '@sap-ux/odata-service-inquirer';
import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import { join } from 'node:path';

// Pre-import actual modules
const actualUtils = await import('../../../src/utils');
const actualStore = await import('@sap-ux/store');
const actualFioriGenShared = await import('@sap-ux/fiori-generator-shared');

const mockGenerateLaunchConfig = jest.fn();
const mockRunHooks = jest.fn();
const storeServiceWriteMock = jest.fn().mockResolvedValue({});
const mockGetService = jest.fn().mockImplementation(() => ({
    write: storeServiceWriteMock
}));
const mockSendTelemetry = jest.fn();
const mockGetHostEnvironment = jest.fn();

jest.unstable_mockModule('../../../src/utils', () => ({
    ...actualUtils,
    generateLaunchConfig: mockGenerateLaunchConfig,
    getPlatform: jest.fn(),
    runHooks: mockRunHooks
}));

jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: mockGetService
}));

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...actualFioriGenShared,
    sendTelemetry: mockSendTelemetry,
    TelemetryHelper: {
        telemetryData: {}
    },
    getHostEnvironment: mockGetHostEnvironment
}));

const { runPostGenerationTasks } = await import('../../../src/fiori-app-generator/end');
const { t } = await import('../../../src/utils');
const { hostEnvironment } = await import('@sap-ux/fiori-generator-shared');

describe('runPostGenerationTasks', () => {
    const logger = {
        info: jest.fn(),
        error: jest.fn()
    } as unknown as Logger & ILogWrapper;
    const fs = {} as Editor;
    const vscode = {};
    const appWizard = {
        showInformation: jest.fn()
    } as unknown as AppWizard;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should generate launch config for non-cap projects', async () => {
        const service = {
            sapClient: '100',
            odataVersion: OdataVersion.v2,
            datasourceType: DatasourceType.sapSystem,
            capService: undefined
        };
        const project = {
            targetFolder: '/path/to/project',
            name: 'testProject',
            flpAppId: 'testAppId',
            enableVirtualEndpoints: false
        };

        await runPostGenerationTasks({ service, project }, fs, logger, vscode, appWizard);

        expect(mockGenerateLaunchConfig).toHaveBeenCalledWith(
            {
                targetFolder: project.targetFolder,
                projectName: project.name,
                flpAppId: project.flpAppId,
                sapClientParam: 'sap-client=100',
                odataVersion: service.odataVersion,
                datasourceType: DatasourceType.sapSystem,
                enableVirtualEndpoints: project.enableVirtualEndpoints
            },
            fs,
            vscode,
            logger
        );
    });

    it('should persist backend system connection information', async () => {
        const service = {
            backendSystem: {
                newOrUpdated: true
            } as unknown as BackendSystem,
            sapClient: '100',
            odataVersion: OdataVersion.v2,
            datasourceType: DatasourceType.sapSystem
        };
        const project = {
            targetFolder: '/path/to/project',
            name: 'testProject',
            flpAppId: 'testAppId'
        };

        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);

        await runPostGenerationTasks({ service, project }, fs, logger, vscode, appWizard);

        expect(mockGetService).toHaveBeenCalledWith({
            logger,
            entityName: 'system'
        });
        expect(storeServiceWriteMock).toHaveBeenCalledWith(service.backendSystem, { force: true });
    });

    it('should NOT persist backend system when newOrUpdated is false', async () => {
        const service = {
            backendSystem: {
                newOrUpdated: false
            } as unknown as BackendSystem,
            sapClient: '100',
            odataVersion: OdataVersion.v2,
            datasourceType: DatasourceType.sapSystem
        };
        const project = {
            targetFolder: '/path/to/project',
            name: 'testProject',
            flpAppId: 'testAppId'
        };

        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);

        await runPostGenerationTasks({ service, project }, fs, logger, vscode, appWizard);

        // Should not call getService or write when newOrUpdated is false
        expect(mockGetService).not.toHaveBeenCalled();
        expect(storeServiceWriteMock).not.toHaveBeenCalled();
    });

    it('should show information message for cap projects', async () => {
        const service = {
            capService: {} as unknown as CapService,
            sapClient: '100',
            odataVersion: OdataVersion.v2,
            datasourceType: DatasourceType.capProject
        };
        const project = {
            targetFolder: '/path/to/project',
            name: 'testProject',
            flpAppId: 'testAppId'
        };

        await runPostGenerationTasks({ service, project }, fs, logger, vscode, appWizard);

        expect(appWizard.showInformation).toHaveBeenCalledWith(
            t('wizardMessages.filesGenerated'),
            MessageType.notification
        );
    });

    it('should save API Hub API key if applicable', async () => {
        const service = {
            sapClient: '100',
            odataVersion: OdataVersion.v2,
            datasourceType: DatasourceType.businessHub,
            apiHubConfig: {
                apiHubType: ApiHubType.apiHub,
                apiHubKey: 'testKey1234'
            }
        };
        const project = {
            targetFolder: '/path/to/project',
            name: 'testProject',
            flpAppId: 'testAppId'
        };

        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);

        await runPostGenerationTasks({ service, project }, fs, logger, vscode, appWizard);

        expect(storeServiceWriteMock).toHaveBeenCalledWith({ apiKey: 'testKey1234' });
    });

    it('should send telemetry and run post generation hooks', async () => {
        const service = {
            sapClient: '100',
            odataVersion: OdataVersion.v2,
            datasourceType: DatasourceType.none
        };
        const project = {
            targetFolder: '/path/to/project',
            name: 'testProject',
            flpAppId: 'testAppId'
        };

        await runPostGenerationTasks({ service, project }, fs, logger, vscode, appWizard);

        const projectPath = join(project.targetFolder, project.name);
        expect(logger.info).toHaveBeenCalledWith(
            t('logMessages.applicationGenerationSuccess', { targetFolder: projectPath })
        );
        expect(mockSendTelemetry).toHaveBeenCalledWith('GENERATION_SUCCESS', {}, projectPath);
        expect(mockRunHooks).toHaveBeenCalledWith(
            'app-generated',
            {
                hookParameters: { fsPath: projectPath },
                vscodeInstance: vscode,
                options: { command: undefined }
            },
            logger
        );
    });
});
