import { Command } from 'commander';
import { addAddMockserverConfigCommand } from './mockserver-config';
import { addAddSmartLinksConfigCommand } from './smartlinks-config';
import { addAddCdsPluginUi5Command } from './cds-plugin-ui';
import { addInboundNavigationConfigCommand } from './navigation-config';
import { addCardsEditorConfigCommand } from './cards-editor';
import { addNewModelCommand } from './new-model';
import { addAnnotationsToOdataCommand } from './annotations-to-odata';
import { addAddHtmlFilesCmd } from './html';
import { addComponentUsagesCommand } from './component-usages';
import { addAddServiceCmd } from './service';
import { addDeployConfigCommand } from './deploy-config';

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
    // create-fiori add inbound-navigation-config
    addInboundNavigationConfigCommand(addCommands);
    // create-fiori add cards-editor
    addCardsEditorConfigCommand(addCommands);
    // create-fiori add model
    addNewModelCommand(addCommands);
    // create-fiori add annotations-to-odata
    addAnnotationsToOdataCommand(addCommands);
    // create-fiori add html
    addAddHtmlFilesCmd(addCommands);
    // create-fiori add component-usages
    addComponentUsagesCommand(addCommands);
    // create-fiori add service
    addAddServiceCmd(addCommands);
    // create-fiori add deploy-config
    addDeployConfigCommand(addCommands);
    return addCommands;
}
