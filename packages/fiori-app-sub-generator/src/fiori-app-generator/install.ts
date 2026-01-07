import type { CapService } from '@sap-ux/cap-config-writer';
import { TelemetryHelper, sendTelemetry, type ILogWrapper } from '@sap-ux/fiori-generator-shared';
import { CommandRunner, t } from '../utils';

/**
 * Defines the options used to install deps to a CAP project.
 */
export type CapInstallOptions = {
    ui5Version?: string; // Presence of a property indicates specification should be installed, hence adding tools suite support
    rootPath?: string; // Root path for the CAP project
    depsInstallPath?: string; // Path to install dependancies in project (app or root),
    useWorkspaces?: boolean; // Use NPM workspaces during project generation
};

/**
 * Install the dependencies for the specified project. In the case of CAP projects, the dependencies are installed to the root project
 * if npm workspace option is used, otherwise they are installed to the app project only.
 *
 * @param projectPath
 * @param log
 * @param capOptions
 */
async function installProjectDependencies(
    projectPath: string,
    log: ILogWrapper,
    capOptions?: CapInstallOptions
): Promise<void> {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const runner = new CommandRunner(log);
    const runArgs = [];

    runArgs.unshift('install');

    try {
        log?.info(t('logMessages.installingDependencies', { path: projectPath }));
        const t0 = performance.now();
        await runner.run(npm, runArgs, { cwd: projectPath }, true);
        TelemetryHelper.createTelemetryData({ installFailure: false });
        if (capOptions?.useWorkspaces) {
            // NPM workspaces are used, run full install at root of project
            // This will trigger a second install, only one install should be needed for NPM workspaces
            await runner.run(
                npm,
                ['install', '--no-audit', '--no-fund', '--silent', '--prefer-offline', '--no-progress'],
                { cwd: capOptions.rootPath },
                true
            );
        }
        const t1 = performance.now();
        log?.debug(t('logMessages.dependenciesInstalled', { installTime: Math.round((t1 - t0) / 1000) }));
    } catch (error) {
        log?.info(error ?? t('logMessages.errorInstallingDependencies'));
        TelemetryHelper.createTelemetryData({ installFailure: true });
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        sendTelemetry('GENERATION_INSTALL_FAIL', TelemetryHelper.telemetryData);
    }
}

/**
 * Perform the installation of dependencies for the specified project.
 * If a CAP service is provided AND `useNpmWorkspaces` is false, the dependencies will be installed to the CAP root project,
 * otherwise they will be installed to the specified app `packagePath`.
 *
 * @param param0
 * @param param0.appPackagePath
 * @param param0.capService
 * @param param0.useNpmWorkspaces
 * @param param0.ui5Version
 * @param logger The logger to use for output
 * @returns Promise<void>
 */
export async function installDependencies(
    {
        appPackagePath,
        capService,
        useNpmWorkspaces,
        ui5Version
    }: {
        appPackagePath: string;
        capService?: CapService;
        useNpmWorkspaces: boolean;
        ui5Version: string;
    },
    logger: ILogWrapper
): Promise<void> {
    // Install additional libs to root CAP project
    let capInstallOpts: CapInstallOptions | undefined;
    if (capService) {
        capInstallOpts = {
            rootPath: capService.projectPath,
            // if NPM workspaces are used, depsInstallPath will be the CAP projectpackage.json. Otherwise the CAP app package.json.
            depsInstallPath: useNpmWorkspaces ? capService.projectPath : appPackagePath,
            useWorkspaces: useNpmWorkspaces,
            ui5Version
        };
    }
    await installProjectDependencies(capInstallOpts?.depsInstallPath ?? appPackagePath, logger, capInstallOpts);
}
