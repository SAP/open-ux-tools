import type { SystemCommandContext } from '../../types/system/index.js';
import { NEW_SYSTEM_PANEL_KEY, SystemPanelViewType } from '../../utils/constants/index.js';
import { SystemPanel } from '../../panel/index.js';

/**
 * Returns a command handler function that creates or reveals the system panel.
 *
 * @param context - the system command context
 * @returns - a command handler function
 */
export const createSystemCommandHandler = (context: SystemCommandContext) => async (): Promise<void> => {
    const panel = context.panelManager.getOrCreateNewPanel(NEW_SYSTEM_PANEL_KEY, () => createNewPanel(context));
    await panel.reveal();
};

/**
 * Creates a new system panel.
 *
 * @param context - the system command context
 * @returns - the created system panel
 */
function createNewPanel(context: SystemCommandContext): SystemPanel {
    const extensionPath = context.extContext.vscodeExtContext.extensionPath;
    return new SystemPanel({
        extensionPath,
        systemPanelViewType: SystemPanelViewType.Create,
        disposeCallback: (): void => {
            context.panelManager.deleteAndDispose(NEW_SYSTEM_PANEL_KEY);
        }
    });
}
