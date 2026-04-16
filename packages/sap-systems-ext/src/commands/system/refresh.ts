import type { SystemCommandContext } from '../../types/system/index.js';
import { t } from '../../utils/index.js';
import SystemsLogger from '../../utils/logger.js';

/**
 * Returns a command handler function that refreshes the list of systems.
 *
 * @param commandContext - the system command context
 * @returns - a command handler function
 */
export const refreshSystemsCommandHandler = (commandContext: SystemCommandContext) => async (): Promise<void> => {
    SystemsLogger.logger.info(t('info.refreshingConnections'));
    commandContext.extContext.systemsTreeDataProvider?.refresh();
};
