import type { LaunchConfigOptions } from './types';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';


/** TEMP - remove from here */
/**
 * Format a string url parameter from the input arguments. Accepts empty string as input arguments.
 * @example
 * ```typescript
 * const sapClientParam = 'sap-client=010';
 * const urlParam = buildUrlParam(sapClientParam, DisableCacheParam);
 * // urlParam: '?sap-client=010&sap-ui-xx-viewCache=false'
 * ```
 *
 * @example
 * ```typescript
 * const sapClientParam = '';
 * const urlParam = buildUrlParam(sapClientParam, DisableCacheParam);
 * // urlParam: '?sap-ui-xx-viewCache=false'
 * ```
 *
 * @param params A list of arguments, each is a url param key value pair.
 * E.g. 'sap-client=010', 'sap-ui-xx-viewCache=false'. Empty string argument is allowed,
 * but will be filtered in the output.
 * @returns Concated url params that removes empty input args.
 */
export function buildUrlParam(...params: string[]): string {
    const nonEmptyParams = params.filter((param) => !!param);
    if (nonEmptyParams.length === 0) {
        return '';
    } else {
        return `?${nonEmptyParams.join('&')}`;
    }
}
const DisableCacheParam = 'sap-ui-xx-viewCache=false';

// Functions used to build launch config commands and tasks

export function getMockTaskOpenArgs(
    version: OdataVersion,
    isMigrator = false,
    sapClientParam?: string,
    flpAppId?: string,
    includeUrlParams = true
): string[] {
    const flpAppIdWithHash = flpAppId ? `#${flpAppId}` : '';
    const urlParams = getUrlParam(includeUrlParams, sapClientParam ?? '');
    const params = `${urlParams}${flpAppIdWithHash ?? ''}`;

    if (isMigrator) {
        const mockCmdArgs = {
            [OdataVersion.v2]: ['--open', `test/flpSandboxMockServer.html${params}`],
            [OdataVersion.v4]: ['--config', './ui5-mock.yaml', '--open', `test/flpSandbox.html${params}`]
        };

        return mockCmdArgs[version];
    }

    return ['--config', './ui5-mock.yaml', '--open', `test/flpSandbox.html${params}`];
}

export function getStartTasksOpenArg(
    localOnly: boolean,
    sapClientParam = '',
    flpAppId = '',
    startFile?: string,
    localStartFile?: string,
    migratorMockIntent?: string,
    includeUrlParams = true
): {
    startCommandOpenArg: string;
    startLocalCommandOpenArg: string;
    startNoFlpCommandOpenArg: string;
    startVariantsCommandOpenArg: string;
} {
    // FE app gen append # prefix to flpAppId, protect from duplicate # in the url
    const formattedFlpAppId = flpAppId.replace('#', '');
    const flpAppIdWithHash = formattedFlpAppId ? `#${formattedFlpAppId}` : '';

    let migratorMockIntentWithHash: string | undefined;
    if (migratorMockIntent) {
        const formattedMigratorMockIntent = migratorMockIntent.replace('#', '');
        migratorMockIntentWithHash = `#${formattedMigratorMockIntent}`;
    }

    const urlParam = getUrlParam(includeUrlParams, sapClientParam);
    const variantsCommandUrlParam = buildUrlParam(
        sapClientParam,
        DisableCacheParam,
        'fiori-tools-rta-mode=true',
        'sap-ui-rta-skip-flex-validation=true'
    );
    const startCommandOpenArg = localOnly ? '' : `${startFile || 'test/flpSandbox.html'}${urlParam}${flpAppIdWithHash}`;
    const startLocalCommandOpenArg = `${localStartFile || 'test/flpSandbox.html'}${urlParam}${
        migratorMockIntentWithHash ? migratorMockIntentWithHash : flpAppIdWithHash
    }`;
    const startNoFlpCommandOpenArg = localOnly ? '' : `${'index.html'}${urlParam}`;
    const startVariantsCommandOpenArg = `\\"preview.html${variantsCommandUrlParam}#preview-app\\""`;

    return {
        startCommandOpenArg,
        startLocalCommandOpenArg,
        startNoFlpCommandOpenArg,
        startVariantsCommandOpenArg
    };
}

export function getUrlParam(includeUrlParams: boolean, sapClientParam: string, showQuestionMark = true): string {
    let finalParams = includeUrlParams ? buildUrlParam(sapClientParam, DisableCacheParam) : '';
    if (finalParams && !showQuestionMark) {
        finalParams = finalParams.substring(1, finalParams.length);
    }
    return finalParams;
}

export function getLocalStartFile(configOpts: LaunchConfigOptions): string {
    let localStartFile: string;

    // flpSandboxMockServer.html still used for FE v2 during migration
    if (configOpts.isFioriElement && configOpts.odataVersion === OdataVersion.v2 && configOpts.isMigrator === true) {
        localStartFile = 'test/flpSandboxMockServer.html';
    } else {
        if (configOpts.flpSandboxAvailable) {
            localStartFile = 'test/flpSandbox.html';
        } else {
            localStartFile = 'index.html';
        }
    }
    return localStartFile;
}

