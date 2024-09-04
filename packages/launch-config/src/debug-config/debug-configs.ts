import { DatasourceType } from '@sap-ux/odata-service-inquirer';
import { isAppStudio } from '@sap-ux/btp-utils';
import type {
    LaunchConfigOptions,
    DebugConfigs
} from './types';
import { posix } from 'path';
import { getLocalStartFile, getMockTaskOpenArgs, getStartTasksOpenArg, getUrlParam } from './commands';
import { getLaunchConfig } from '../launch-config-crud/utils';
import { LaunchConfig, LaunchJSON } from '../types';

export function getDebugConfigs(
    configType: string,
    configOpts: LaunchConfigOptions,
    hasWorkspace: boolean,
    defaultPath?: string | undefined
) {
    const localOnly = configOpts.datasourceType === DatasourceType.metadataFile;
    const startFile = configOpts.flpSandboxAvailable ? 'test/flpSandbox.html' : 'index.html'; 
    const runConfig = `{"handlerId":"fiori_tools","runnableId":"${configOpts.projectPath}"}`;
    const launchFile: LaunchJSON = {
        version: '0.2.0',
        configurations: []
    };
    const localStartFile = getLocalStartFile(configOpts);
    const urlParams = getUrlParam(true, configOpts.sapClientParam, false);
    const { startCommandOpenArg, startLocalCommandOpenArg } = getStartTasksOpenArg(
        localOnly,
        configOpts.sapClientParam,
        configOpts.flpAppId,
        startFile,
        localStartFile,
        configOpts.migratorMockIntent,
        false
    ); 
    const projectPath = posix.sep + configOpts.projectName;
    const nestedPath = defaultPath ? posix.sep + defaultPath : '';
    const cwd = `\${workspaceFolder}${hasWorkspace ? projectPath : nestedPath}`;
    const runtimeArgs = ['fiori', 'run'];
    const env = { 
        FIORI_TOOLS_URL_PARAMS: urlParams, 
        'run.config': isAppStudio() ? runConfig : '' 
    }
    
    const liveConfiguration: LaunchConfig = { 
        ...getLaunchConfig(
            `Start ${configOpts.projectName}`,
            cwd,
            runtimeArgs,
            ['--open', startCommandOpenArg],
            { 
                DEBUG: '--inspect', 
                ...env
            } 
        )
    };

    const localConfiguration: LaunchConfig = { 
        ...getLaunchConfig(
            `Start ${configOpts.projectName} Local`,
            cwd,
            runtimeArgs,
            ['--config', './ui5-local.yaml', '--open', startLocalCommandOpenArg],
            env
        )
    };

    if (configOpts.datasourceType !== DatasourceType.metadataFile) {
        launchFile.configurations.push(liveConfiguration);
    }

    const debugConfigs: DebugConfigs = {
        liveConfiguration,
        localConfiguration,
        launchFile
    };

    // Handle mock configurations since FF will not always have a datasource so no odata version will be present
    // No mock for FF with no datasource templates
    const mockCmdArgs =
        configOpts.odataVersion !== undefined
            ? getMockTaskOpenArgs(
                  configOpts.odataVersion,
                  configOpts.isMigrator,
                  configOpts.sapClientParam,
                  configOpts.flpAppId,
                  false
              )
            : undefined;
    if (mockCmdArgs) {
        const mockConfiguration: LaunchConfig = { 
            ...getLaunchConfig(
                `Start ${configOpts.projectName} Mock`,
                cwd,
                runtimeArgs,
                mockCmdArgs,
                env
            )
        };
        launchFile.configurations.push(mockConfiguration);
        debugConfigs.mockConfiguration = mockConfiguration;
    }
    launchFile.configurations.push(localConfiguration);
    return debugConfigs[configType as keyof typeof debugConfigs];
}
