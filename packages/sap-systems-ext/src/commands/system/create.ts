import type { SystemCommandContext } from '../../types/system';
import { NEW_SYSTEM_PANEL_KEY, EXTERNAL_SYSTEM_PANEL_KEY, SystemPanelViewType } from '../../utils/constants';
import { SystemPanel } from '../../panel';
import type { BackendSystem } from '@sap-ux/store';

/**
 * Returns a command handler function that creates or reveals the system panel.
 * An optional BackendSystem can be passed to pre-fill the panel fields.
 * This command is the public API used by external tools to create systems with pre-filled data.
 * It uses a separate panel key to avoid interfering with user-initiated "Add New System" panels.
 *
 * @param context - the system command context
 * @returns - a command handler function
 */
export const createSystemCommandHandler =
    (context: SystemCommandContext) =>
    async (system?: BackendSystem): Promise<void> => {
        // Use EXTERNAL_SYSTEM_PANEL_KEY for external tool invocations to avoid
        // interfering with any user-initiated "Add New System" panels that might be open
        const panelKey = EXTERNAL_SYSTEM_PANEL_KEY;

        // Always dispose any existing external panel to ensure fresh state
        if (context.panelManager.has(panelKey)) {
            context.panelManager.deleteAndDispose(panelKey);
        }

        const panel = context.panelManager.getOrCreateNewPanel(panelKey, () =>
            createNewPanel(context, system, panelKey)
        );
        await panel.reveal();
    };

/**
 * Returns a command handler function that creates a new empty system panel.
 * This is an internal command used by the "Add New System" UI button.
 *
 * @param context - the system command context
 * @returns - a command handler function
 */
export const createNewSystemCommandHandler = (context: SystemCommandContext) => async (): Promise<void> => {
    const panel = context.panelManager.getOrCreateNewPanel(NEW_SYSTEM_PANEL_KEY, () =>
        createNewPanel(context, undefined, NEW_SYSTEM_PANEL_KEY)
    );
    await panel.reveal();
};

/**
 * Creates a new system panel.
 *
 * @param context - the system command context
 * @param backendSystem - optional pre-populated backend system data
 * @param panelKey - the key to use for this panel in the panel manager
 * @returns - the created system panel
 */
function createNewPanel(
    context: SystemCommandContext,
    backendSystem?: BackendSystem,
    panelKey: string = NEW_SYSTEM_PANEL_KEY
): SystemPanel {
    const extensionPath = context.extContext.vscodeExtContext.extensionPath;
    return new SystemPanel({
        extensionPath,
        systemPanelViewType: SystemPanelViewType.Create,
        disposeCallback: (): void => {
            context.panelManager.deleteAndDispose(panelKey);
        },
        backendSystem
    });
}
