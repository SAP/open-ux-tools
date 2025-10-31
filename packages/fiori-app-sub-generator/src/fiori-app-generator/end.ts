import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { CapService } from '@sap-ux/cap-config-writer';
import type { OdataVersion } from '@sap-ux/fiori-elements-writer';
import type { ILogWrapper, VSCodeInstance } from '@sap-ux/fiori-generator-shared';
import { getHostEnvironment, hostEnvironment, sendTelemetry, TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import type { Logger } from '@sap-ux/logger';
import type { DatasourceType } from '@sap-ux/odata-service-inquirer';
import {
    ApiHubSettings,
    type ApiHubSettingsKey,
    type ApiHubSettingsService,
    type BackendSystem,
    type BackendSystemKey,
    getService
} from '@sap-ux/store';
import type { Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import type { ApiHubConfig } from '../types';
import { ApiHubType } from '../types';
import { buildSapClientParam, generateLaunchConfig, runHooks, t } from '../utils';

/**
 * Save API Hub key to the store.
 *
 * @param apiKey - API key to save
 * @param logger - optional logger
 * @returns - true if the API key was saved successfully, false otherwise
 */
async function saveApiHubApiKey(apiKey: string, logger: Logger & ILogWrapper): Promise<boolean> {
    let result: ApiHubSettings | undefined;
    if (!isAppStudio()) {
        const apiHubStore = (await getService<ApiHubSettings, ApiHubSettingsKey>({
            logger,
            entityName: 'api-hub'
        })) as ApiHubSettingsService;
        const apiHubSettings = new ApiHubSettings({ apiKey });
        result = await apiHubStore.write(apiHubSettings);
    }
    return Boolean(result);
}

/**
 * Run post generation hooks: delegates to `runHooks` with `'app-generated'` as the event name.
 *
 * @param projectPath - path to the project
 * @param logger - logger instance
 * @param vscode - vscode instance
 * @param followUpCommand - post generation command (with optional params) which will be ran instead of the default
 * @param followUpCommand.cmdName - name of the command
 * @param followUpCommand.cmdParams - options params for the command
 */
async function runPostGenHooks(
    projectPath: string,
    logger: ILogWrapper,
    vscode?: VSCodeInstance,
    followUpCommand?: { cmdName: string; cmdParams?: { [key: string]: string | boolean } }
): Promise<void> {
    await runHooks(
        'app-generated',
        {
            hookParameters: { fsPath: projectPath, ...followUpCommand?.cmdParams },
            vscodeInstance: vscode,
            options: { command: followUpCommand?.cmdName }
        },
        logger
    );
}
/**
 * FioriBaseGeneratror end phase related functionality.
 *
 * @param state
 * @param state.service
 * @param state.service.backendSystem
 * @param state.service.capService
 * @param state.service.sapClient
 * @param state.service.odataVersion
 * @param state.service.datasourceType
 * @param state.service.apiHubConfig
 * @param state.project
 * @param state.project.targetFolder
 * @param state.project.name
 * @param state.project.flpAppId
 * @param state.project.enableVirtualEndpoints
 * @param fs - the file system editor
 * @param logger - the logger
 * @param vscode - the vscode instance
 * @param appWizard - the app wizard instance
 * @param followUpCommand - post generation command (with optional params) which will be ran instead of the default
 * @param followUpCommand.cmdName - name of the command
 * @param followUpCommand.cmdParams - options params for the command
 * @returns {Promise<void>}
 */
export async function runPostGenerationTasks(
    {
        service,
        project
    }: {
        service: {
            backendSystem?: BackendSystem & {
                newOrUpdated?: boolean;
            };
            capService?: CapService;
            sapClient?: string;
            odataVersion?: OdataVersion;
            datasourceType: DatasourceType;
            apiHubConfig?: ApiHubConfig;
        };
        project: {
            targetFolder: string;
            name: string;
            flpAppId?: string;
            enableVirtualEndpoints?: boolean;
        };
    },
    fs: Editor,
    logger: Logger & ILogWrapper,
    vscode?: unknown,
    appWizard?: AppWizard,
    followUpCommand?: { cmdName: string; cmdParams?: { [key: string]: string | boolean } }
): Promise<void> {
    // Add launch config for non-cap projects
    if (!service.capService) {
        await generateLaunchConfig(
            {
                targetFolder: project.targetFolder,
                projectName: project.name,
                flpAppId: project.flpAppId,
                sapClientParam: service.sapClient ? buildSapClientParam(service.sapClient) : undefined,
                odataVersion: service.odataVersion,
                datasourceType: service.datasourceType,
                enableVirtualEndpoints: project.enableVirtualEndpoints
            },
            fs,
            vscode,
            logger
        );
    }

    // Persist backend system connection information
    const hostEnv = getHostEnvironment();

    if (service.backendSystem && hostEnv !== hostEnvironment.bas && service.backendSystem.newOrUpdated) {
        const storeService = await getService<BackendSystem, BackendSystemKey>({
            logger: logger,
            entityName: 'system'
        });
        // No need to await, we cannot recover anyway
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        storeService.write(service.backendSystem, { force: true });
    }

    // Display info message if using a cap service as it is not otherwise shown when a top level dir is not created
    if (service.capService && appWizard) {
        // this info message needs to be shown for cap projects as it is not shown when a top level dir is not created
        appWizard.showInformation(t('wizardMessages.filesGenerated'), MessageType.notification);
    }

    if (hostEnv !== hostEnvironment.bas && service.apiHubConfig?.apiHubType === ApiHubType.apiHub) {
        await saveApiHubApiKey(service.apiHubConfig.apiHubKey, logger);
    }
    // If we got here, the generation was successful and so targetFolder and name must be defined
    const projectPath = join(project.targetFolder, project.name);
    logger.info(
        t('logMessages.applicationGenerationSuccess', {
            targetFolder: projectPath
        })
    );
    await sendTelemetry('GENERATION_SUCCESS', TelemetryHelper.telemetryData, projectPath);
    await runPostGenHooks(projectPath, logger, vscode as VSCodeInstance, followUpCommand);
}
