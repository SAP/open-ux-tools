import { Command } from 'commander';
import { addAddMockserverConfigCommand } from './mockserver-config';
import { addAddSmartLinksConfigCommand } from './smartlinks-config';
import { addAddCdsPluginUi5Command } from './cds-plugin-ui';
import { addInboundNavigationConfigCommand } from './navigation-config';
import { addCardsEditorConfigCommand } from './cards-generator';
import { addNewModelCommand } from './new-model';
import { addAnnotationsToOdataCommand } from './annotations-to-odata';
import { addAddHtmlFilesCmd } from './html';
import { addComponentUsagesCommand } from './component-usages';
import { addDeployConfigCommand } from './deploy-config';
import { addAddVariantsConfigCommand } from './variants-config';
/**
 * Return 'create-fiori add *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing add <feature> commands
 */
export function getAddCommands(): Command {
    const addCommands = new Command('add');
    addAddMockserverConfigCommand(addCommands);
    addAddSmartLinksConfigCommand(addCommands);
    addAddCdsPluginUi5Command(addCommands);
    addInboundNavigationConfigCommand(addCommands);
    addCardsEditorConfigCommand(addCommands);
    addNewModelCommand(addCommands);
    addAnnotationsToOdataCommand(addCommands);
    addAddHtmlFilesCmd(addCommands);
    addComponentUsagesCommand(addCommands);
    addDeployConfigCommand(addCommands);
    addAddVariantsConfigCommand(addCommands);
    return addCommands;
}
