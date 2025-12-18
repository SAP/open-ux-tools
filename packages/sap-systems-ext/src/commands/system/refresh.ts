import type { SystemCommandContext } from '../../types/system';
import { t } from '../../utils';
import SystemsLogger from '../../utils/logger';

/**
 * Returns a command handler function that refreshes the list of systems.
 *
 * @param commandContext - the system command context
 * @returns - a command handler function
 */
export const refreshSystemsCommandHandler = (commandContext: SystemCommandContext) => async (): Promise<void> => {
    SystemsLogger.logger.info(t('info.refreshingSystems'));
    commandContext.extContext.systemsTreeDataProvider?.refresh();
};
