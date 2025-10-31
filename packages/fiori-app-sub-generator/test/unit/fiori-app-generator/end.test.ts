import { runPostGenerationTasks } from '../../../src/fiori-app-generator/end';
import { DEFAULT_POST_APP_GEN_COMMAND, generateLaunchConfig, runHooks, t } from '../../../src/utils';
import type { BackendSystem } from '@sap-ux/store';
import { getService } from '@sap-ux/store';
import { PLATFORMS, ApiHubType, EventName, State } from '../../../src/types';
import type { ILogWrapper } from '@sap-ux/fiori-generator-shared';
import { sendTelemetry, TelemetryHelper, getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { CapService } from '@sap-ux/odata-service-inquirer';
import { DatasourceType, OdataVersion } from '@sap-ux/odata-service-inquirer';
import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import { join } from 'node:path';

jest.mock('../../../src/utils', () => ({
    ...jest.requireActual('../../../src/utils'),
    generateLaunchConfig: jest.fn(),
    getPlatform: jest.fn(),
    runHooks: jest.fn()
}));

const storeServiceWriteMock = jest.fn().mockResolvedValue({});

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn().mockImplementation(() => ({
        write: storeServiceWriteMock
    }))
}));

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    sendTelemetry: jest.fn(),
    TelemetryHelper: {
        telemetryData: {}
    },
    getHostEnvironment: jest.fn()
}));

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

        expect(generateLaunchConfig).toHaveBeenCalledWith(
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

        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);

        await runPostGenerationTasks({ service, project }, fs, logger, vscode, appWizard);

        expect(getService).toHaveBeenCalledWith({
            logger,
            entityName: 'system'
        });
        expect(storeServiceWriteMock).toHaveBeenCalledWith(service.backendSystem, { force: true });
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

        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);

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
        expect(sendTelemetry).toHaveBeenCalledWith('GENERATION_SUCCESS', TelemetryHelper.telemetryData, projectPath);
        expect(runHooks).toHaveBeenCalledWith(
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
