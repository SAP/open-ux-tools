import { Command } from 'commander';
import { addAddMockserverConfigCommand } from './mockserver-config.js';
import { addAddSmartLinksConfigCommand } from './smartlinks-config.js';
import { addAddCdsPluginUi5Command } from './cds-plugin-ui.js';
import { addInboundNavigationConfigCommand } from './navigation-config.js';
import { addCardsEditorConfigCommand } from './cards-generator.js';
import { addNewModelCommand } from './new-model.js';
import { addAnnotationsToOdataCommand } from './annotations-to-odata.js';
import { addAddHtmlFilesCmd } from './html.js';
import { addComponentUsagesCommand } from './component-usages.js';
import { addDeployConfigCommand } from './deploy-config.js';
import { addAddVariantsConfigCommand } from './variants-config.js';
import { addAdaptationProjectCFConfigCommand } from './adp-cf-config.js';
import { addAddEslintConfigCommand } from './eslint-config.js';
/**
 * Return 'create-fiori add *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing add <feature> commands
 */
export function getAddCommands(): Command {
    const addCommands = new Command('add');
    addAddMockserverConfigCommand(addCommands);
    addAddSmartLinksConfigCommand(addCommands);
    addAddEslintConfigCommand(addCommands);
    addAddCdsPluginUi5Command(addCommands);
    addInboundNavigationConfigCommand(addCommands);
    addCardsEditorConfigCommand(addCommands);
    addNewModelCommand(addCommands);
    addAnnotationsToOdataCommand(addCommands);
    addAddHtmlFilesCmd(addCommands);
    addComponentUsagesCommand(addCommands);
    addDeployConfigCommand(addCommands);
    addAddVariantsConfigCommand(addCommands);
    addAdaptationProjectCFConfigCommand(addCommands);
    return addCommands;
}
