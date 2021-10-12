import { join } from 'path';
import { readdirSync, statSync } from 'fs';
import { t } from '../i18n';

/**
 * Returns the file paths of all files under the specified directory.
 *
 * @param {string} dir - the directory to walk
 * @returns {string[]} - array of file path strings
 * @throws - if an error occurs reading a file path
 */
export function getFilePaths(dir: string): string[] | [] {
    try {
        return readdirSync(dir).reduce((files: string[], file: string) => {
            const name = join(dir, file);
            const isDirectory = statSync(name).isDirectory();
            return isDirectory ? [...files, ...getFilePaths(name)] : [...files, name];
        }, []);
    } catch (err) {
        throw err;
    }
}

/**
 * Generates the package.json task entries.
 *
 * @param {Object} packageJsonInputs
 * @param {string} packageJsonInputs.localOnly
 * @param {string} packageJsonInputs.addMock
 * @param {string} packageJsonInputs.sapClient
 * @param {string} packageJsonInputs.flpAppId
 * @param {string} packageJsonInputs.startFile
 * @param {string} packageJsonInputs.localStartFile
 * @returns An object represeting the task names (properties) and commands (values)
 */
export function getPackageJsonTasks({
    localOnly,
    addMock = true,
    sapClient,
    flpAppId = '',
    startFile,
    localStartFile
}: {
    localOnly: boolean;
    addMock: boolean;
    sapClient?: string;
    flpAppId?: string;
    startFile?: string;
    localStartFile?: string;
}): { start: string; 'start-local': string; 'start-noflp': string; 'start-mock'?: string } {
    const sapClientParam = sapClient ? `?sap-client=${sapClient}` : '';
    const params = `${sapClientParam ?? ''}${flpAppId ? `#${flpAppId}` : ''}`;
    const startCommand = localOnly
        ? `echo \\"${t('INFO_MSG_MOCK_ONLY_WARNING')}\\"`
        : `fiori run --open '${startFile || 'test/flpSandbox.html'}${params}'`;
    const startLocalCommand = `fiori run --config ./ui5-local.yaml --open '${
        localStartFile || 'test/flpSandbox.html'
    }${params}'`;
    const startNoFlpCommand = localOnly
        ? `echo \\"${t('INFO_MSG_MOCK_ONLY_WARNING')}\\"`
        : `fiori run --open '${'index.html'}${sapClientParam}'`;

    const mockTask = `fiori run --config ui5-mock.yaml --open 'test/flpSandbox.html${params}'`;
    return Object.assign(
        {
            start: startCommand,
            'start-local': startLocalCommand,
            'start-noflp': startNoFlpCommand
        },
        addMock
            ? {
                  'start-mock': mockTask
              }
            : {}
    );
}
