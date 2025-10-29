import type { StoredSystemViewNode, SystemCommandContext } from '../../types/system';
import { BackendSystemKey, type BackendSystem, type Service } from '@sap-ux/store';
import { window } from 'vscode';
import { SystemPanel } from '../../panel';
import { TelemetryHelper, getBackendSystemService, t } from '../../utils';
import { SystemAction, LaunchViewStatus, SystemPanelViewType, SYSTEMS_EVENT } from '../../utils/constants';

/**
 * Returns a command handler function that shows the details of a specified system.
 *
 * @param context - the system command context
 * @returns - a command handler function
 */
export const showSystemsCommandHandler =
    (context: SystemCommandContext) =>
    async (system?: StoredSystemViewNode, statusMsg?: string): Promise<void> => {
        try {
            const systemService = await getBackendSystemService();
            const backendSystemKey = await getBackendSystemKey(systemService, system);
            const storedBackendSystem = await systemService.read(backendSystemKey);
            if (!storedBackendSystem) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                window.showErrorMessage(t('error.systemNotFound', { backendKey: backendSystemKey.getId() }));
                return;
            }
            openSystemPanel(context, backendSystemKey, storedBackendSystem, statusMsg);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : undefined;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            window.showErrorMessage(errorMessage ?? t('error.viewSystemDetails'));
            logTelemetryFailure();
        }
    };

/**
 * Gets the backend system key either from the provided system or by showing a dropdown picker.
 *
 * @param systemService - the system service for the store
 * @param system - optional stored system view node
 * @returns - the backend system key
 */
async function getBackendSystemKey(
    systemService: Service<BackendSystem, BackendSystemKey>,
    system?: StoredSystemViewNode
): Promise<BackendSystemKey> {
    if (system) {
        return new BackendSystemKey({ url: system.url, client: system.client });
    } else {
        return sapSystemDropdownPicker(systemService);
    }
}

/**
 * Shows a dropdown picker to select an SAP system.
 *
 * @param systemService - the system service for the store
 * @returns - the selected backend system key
 */
async function sapSystemDropdownPicker(
    systemService: Service<BackendSystem, BackendSystemKey>
): Promise<BackendSystemKey> {
    const allBackendSystems = await systemService.getAll({ includeSensitiveData: false });
    const quickPickItems = allBackendSystems.map((system) => ({
        label: system.name,
        systemKey: new BackendSystemKey({ url: system.url, client: system.client })
    }));

    const selectedItem = await window.showQuickPick(quickPickItems, {
        placeHolder: t('commands.quickpickPlaceholder')
    });

    if (!selectedItem) {
        throw new Error(t('error.noneSelected'));
    }

    return selectedItem.systemKey;
}

/**
 *  Opens a system panel for the specified backend system.
 *
 * @param context - the system command context
 * @param backendSystemKey - the backend system key
 * @param backendSystem - the backend system
 * @param systemStatusMessage - optional status message to display in the panel
 */
function openSystemPanel(
    context: SystemCommandContext,
    backendSystemKey: BackendSystemKey,
    backendSystem: BackendSystem,
    systemStatusMessage?: string
): void {
    const panelKey = backendSystemKey.getId();
    const { extContext, panelManager } = context;

    const panel = panelManager.getOrCreateNewPanel(
        panelKey,
        () =>
            new SystemPanel({
                extensionPath: extContext.extensionPath,
                systemPanelViewType: SystemPanelViewType.View,
                backendSystem,
                disposeCallback: () => panelManager.deleteAndDispose(panelKey),
                systemStatusMessage
            })
    );
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    panel.reveal();

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
        action: SystemAction.VIEW_LAUNCHED,
        status: LaunchViewStatus.SUCCEED
    });
}

/**
 * Logs telemetry for failed attempt to open system details panel.
 */
function logTelemetryFailure(): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
        action: SystemAction.VIEW_LAUNCHED,
        status: LaunchViewStatus.FAILED
    });
}
