import type { SapSystemsExtContext, SystemCommandContext, SystemCommandHandler } from '../../types/system/index.js';
import { commands } from 'vscode';
import { PanelManager, type SystemPanel } from '../../panel/index.js';
import { SystemCommands } from '../../utils/constants/index.js';
import { createSystemCommandHandler } from './create.js';
import { showSystemsCommandHandler } from './show.js';
import { deleteSystemCommandHandler } from './delete.js';
import { refreshSystemsCommandHandler } from './refresh.js';
import { importSystemCommandHandler } from './import.js';
import { launchAppGenCommandHandler } from './launchAppGen.js';

export const commandHandlers: Record<string, SystemCommandHandler> = {
    create: createSystemCommandHandler,
    show: showSystemsCommandHandler,
    import: importSystemCommandHandler,
    delete: deleteSystemCommandHandler,
    refresh: refreshSystemsCommandHandler,
    launchAppGen: launchAppGenCommandHandler
};

/**
 * Register system related commands.
 *
 * @param context - the extension context
 */
export const registerSystemViewCommands = (context: SapSystemsExtContext): void => {
    const panelManager = new PanelManager<SystemPanel>();

    const systemCommandContext: SystemCommandContext = {
        extContext: context,
        panelManager
    };

    const disposables = [
        commands.registerCommand(SystemCommands.Create, commandHandlers.create(systemCommandContext)),
        commands.registerCommand(SystemCommands.Show, commandHandlers.show(systemCommandContext)),
        commands.registerCommand(SystemCommands.Delete, commandHandlers.delete(systemCommandContext)),
        commands.registerCommand(SystemCommands.Import, commandHandlers.import(systemCommandContext)),
        commands.registerCommand(SystemCommands.Refresh, commandHandlers.refresh(systemCommandContext)),
        commands.registerCommand(SystemCommands.LaunchAppGen, commandHandlers.launchAppGen(systemCommandContext))
    ];

    context.vscodeExtContext.subscriptions.push(...disposables);
};
