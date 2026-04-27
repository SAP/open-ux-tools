import type { SystemCommandContext } from '../../types/system';
import { NEW_SYSTEM_PANEL_KEY, SystemPanelViewType } from '../../utils/constants';
import { SystemPanel } from '../../panel';
import type { BackendSystem } from '@sap-ux/store';

/**
 * Returns a command handler function that creates or reveals the system panel.
 * An optional pre-populated BackendSystem can be passed to pre-fill the panel fields
 * (e.g. when launched from ADT with known system URL and client).
 *
 * @param context - the system command context
 * @returns - a command handler function
 */
export const createSystemCommandHandler =
    (context: SystemCommandContext) =>
    async (prePopulatedSystem?: BackendSystem): Promise<void> => {
        const panel = context.panelManager.getOrCreateNewPanel(NEW_SYSTEM_PANEL_KEY, () =>
            createNewPanel(context, prePopulatedSystem)
        );
        await panel.reveal();
    };

/**
 * Creates a new system panel.
 *
 * @param context - the system command context
 * @param backendSystem - optional pre-populated backend system data
 * @returns - the created system panel
 */
function createNewPanel(context: SystemCommandContext, backendSystem?: BackendSystem): SystemPanel {
    const extensionPath = context.extContext.vscodeExtContext.extensionPath;
    return new SystemPanel({
        extensionPath,
        systemPanelViewType: SystemPanelViewType.Create,
        disposeCallback: (): void => {
            context.panelManager.deleteAndDispose(NEW_SYSTEM_PANEL_KEY);
        },
        backendSystem
    });
}
