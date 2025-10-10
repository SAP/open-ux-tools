import type { SystemCommandContext, SystemCommandHandler } from '../../types/system';
import { commands, type ExtensionContext } from 'vscode';
import { PanelManager, type SystemPanel } from '../../panel';
import { SystemCommands } from '../../utils/constants';
import { createSystemCommandHandler } from './create';
import { showSystemsCommandHandler } from './show';
import { deleteSystemCommandHandler } from './delete';
import { refreshSystemsCommandHandler } from './refresh';
import { importSystemCommandHandler } from './import';
import { launchAppGenCommandHandler } from './launchAppGen';

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
export const registerSystemCommands = (context: ExtensionContext): void => {
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

    context.subscriptions.push(...disposables);
};
