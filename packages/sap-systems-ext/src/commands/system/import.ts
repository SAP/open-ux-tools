import type { SystemConfig, SystemCommandContext, SystemConfigFile } from '../../types/system';
import { BackendSystem, BackendSystemKey, type SystemType } from '@sap-ux/store';
import { window, workspace } from 'vscode';
import { platform } from 'node:os';
import { readFileSync } from 'node:fs';
import { confirmPrompt, TelemetryHelper, t, getBackendSystemService } from '../../utils';
import {
    ConfirmationPromptType,
    SystemAction,
    SystemActionStatus,
    SystemPanelViewType,
    SYSTEMS_EVENT
} from '../../utils/constants';
import { SystemPanel } from '../../panel';

/**
 * Returns a command handler function that handles importing a system configuration from a file.
 *
 * @param commandContext - the system command context
 * @returns - a command handler function
 */
export const importSystemCommandHandler = (commandContext: SystemCommandContext) => async (): Promise<void> => {
    try {
        const importSystemConfig = await getImportSystemConfig();
        const backendSystemKey = new BackendSystemKey({
            url: importSystemConfig.url,
            client: importSystemConfig.client
        });
        const systemService = await getBackendSystemService();
        const existingSystem = await systemService.read(backendSystemKey);

        // if the system already exists, confirm if the user wants to overwrite
        let overwrite = false;
        if (existingSystem) {
            overwrite = await confirmPrompt(ConfirmationPromptType.Overwrite, existingSystem.name);
            if (!overwrite) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                window.showWarningMessage(t('warn.importCancelled'));
                return;
            }
        }

        if (!existingSystem || overwrite) {
            const panel = commandContext.panelManager.getOrCreateNewPanel(backendSystemKey.getId(), () =>
                createNewPanel(commandContext, backendSystemKey.getId(), importSystemConfig, existingSystem)
            );
            await panel.reveal();
            logImportTelemetry(SystemActionStatus.IMPORT_SUCCESS);
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : t('error.importConfigFailed');
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        window.showErrorMessage(msg);
        logImportTelemetry(SystemActionStatus.IMPORT_FAIL);
    }
};

/**
 * Creates a new SystemPanel for the imported system.
 *
 * @param context - the system command context
 * @param panelKey - unique key for the panel
 * @param systemConfig - the import system configuration
 * @param existingSystem - the existing backend system
 * @returns - system panel instance
 */
function createNewPanel(
    context: SystemCommandContext,
    panelKey: string,
    systemConfig: SystemConfig,
    existingSystem?: BackendSystem
): SystemPanel {
    const name = systemConfig?.name ?? existingSystem?.name ?? 'New System';
    const backendSystem = new BackendSystem({
        name,
        url: systemConfig.url,
        client: systemConfig.client,
        systemType: 'OnPrem' satisfies SystemType,
        username: existingSystem?.username,
        password: existingSystem?.password
    });

    return new SystemPanel({
        extensionPath: context.extContext.extensionPath,
        systemPanelViewType: existingSystem ? SystemPanelViewType.View : SystemPanelViewType.Import,
        disposeCallback: (): void => {
            context.panelManager.deleteAndDispose(panelKey);
        },
        backendSystem
    });
}

/**
 * Prompts the user to select a configuration file and parses it to extract the system configuration.
 *
 * @returns - the import system configuration
 * @throws - an error if no file is selected or if the configuration is incomplete
 */
async function getImportSystemConfig(): Promise<SystemConfig> {
    const [systemFileUri] =
        (await window.showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            defaultUri: workspace?.workspaceFolders?.[0]?.uri
        })) ?? [];

    if (!systemFileUri) {
        throw new Error(t('error.noFileSelected'));
    }

    const filePath = normalizeFilePath(systemFileUri?.path);
    const system = readConfig(filePath);

    if (!system?.url) {
        throw new Error(t('error.incompleteConfig'));
    }

    return system;
}

/**
 * Normalizes a file path - on Windows, VS Code may prefix absolute paths with `/`.
 *
 * @param path - the file path to normalize.
 * @returns the normalized file path.
 */
function normalizeFilePath(path: string): string {
    return platform() === 'win32' && path.startsWith('/') ? path.slice(1) : path;
}

/**
 * Loads and parses the import configuration file.
 * Only the first system in the file is returned, as only single system import is currently supported.
 *
 * @param filePath - path to the config file
 * @returns the import system configuration, or undefined if an error occurs
 */
function readConfig(filePath: string): SystemConfig | undefined {
    const raw = readFileSync(filePath, 'utf8');
    const [systemConfig] = (JSON.parse(raw) as SystemConfigFile).systems ?? [];

    if (!systemConfig) {
        throw new Error(t('error.noSystemsDefined', { filePath }));
    }
    return systemConfig;
}

/**
 * Logs telemetry for the import action.
 *
 * @param status - the import action status
 */
function logImportTelemetry(status: SystemActionStatus): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
        action: SystemAction.SYSTEM,
        status
    });
}
