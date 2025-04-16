import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type UI5Element from 'sap/ui/core/Element';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { Deferred, createDeferred } from './utils';
import { DialogFactory, DialogNames } from './dialog-factory';
import ExtendController from 'sap/ui/rta/plugin/ExtendControllerPlugin';

export interface ExtendControllerData {
    deferred: Deferred<DeferredExtendControllerData>;
}

export type DeferredExtendControllerData = {
    codeRef: string;
    viewId: string;
};

/**
 * Initializes the ExtendControllerPlugin and includes it in the Runtime Authoring (RTA) plugins.
 *
 * @param rta Runtime Authoring instance
 */
export function initExtendControllerPlugin(rta: RuntimeAuthoring): void {
    const flexSettings = rta.getFlexSettings();
    const commandFactory = new CommandFactory({ flexSettings });

    const plugin = new ExtendController({
        commandFactory,
        handlerFunction: async (overlay: UI5Element) => await handlerFunction(rta, overlay)
    });

    const plugins = rta.getPlugins();
    plugins.extendControllerPlugin = plugin;
    rta.setPlugins(plugins);
}

/**
 * Handles the creation of a controller extension by opening a dialog and resolving the deferred data.
 *
 * @param rta Runtime Authoring instance
 * @param overlay UI5 Element overlay
 * @returns A promise that resolves with DeferredXmlFragmentData
 */
async function handlerFunction(rta: RuntimeAuthoring, overlay: UI5Element): Promise<DeferredExtendControllerData> {
    const deferred = createDeferred<DeferredExtendControllerData>();

    await DialogFactory.createDialog(overlay, rta, DialogNames.CONTROLLER_EXTENSION, { deferred });

    return deferred.promise;
}