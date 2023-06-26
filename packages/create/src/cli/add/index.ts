import { Command } from 'commander';
import { addAddMockserverConfigCommand } from './mockserver-config';
import { addAddSmartLinksConfigCommand } from './smartlinks-config';
import { addAddCdsPluginUi5Command } from './cds-plugin-ui';

/**
 * Return 'create-fiori add *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing add <feature> commands
 */
export function getAddCommands(): Command {
    const addCommands = new Command('add');
    // create-fiori add mockserver-config
    addAddMockserverConfigCommand(addCommands);
    // create-fiori add smartlinks-config
    addAddSmartLinksConfigCommand(addCommands);
    // create-fiori add cds-plugin-ui5
    addAddCdsPluginUi5Command(addCommands);
    return addCommands;
}
