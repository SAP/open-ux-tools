import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type UI5Element from 'sap/ui/core/Element';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { Deferred, createDeferred } from './utils';
import { DialogFactory, DialogNames } from './dialog-factory';
import AddXMLPlugin from 'sap/ui/rta/plugin/AddXMLPlugin';

export interface AddFragmentData {
    deferred: Deferred<DeferredXmlFragmentData>;
}

export type DeferredXmlFragmentData = {
    fragment: string;
    fragmentPath: string;
    targetAggregation: string;
    index: number;
};

/**
 * Initializes the AddXMLPlugin and includes it in the Runtime Authoring (RTA) plugins.
 *
 * @param rta Runtime Authoring instance
 */
export function initAddXMLPlugin(rta: RuntimeAuthoring): void {
    const flexSettings = rta.getFlexSettings();
    const commandFactory = new CommandFactory({ flexSettings });

    const plugin = new AddXMLPlugin({
        commandFactory,
        fragmentHandler: async (overlay: UI5Element) => await handleFragmentCreation(rta, overlay)
    });

    const plugins = rta.getPlugins();
    plugins.addXMLPlugin = plugin;
    rta.setPlugins(plugins);
}

/**
 * Handles the creation of a fragment by opening a dialog and resolving the deferred data.
 *
 * @param rta Runtime Authoring instance
 * @param overlay UI5 Element overlay
 * @returns A promise that resolves with DeferredXmlFragmentData
 */
async function handleFragmentCreation(rta: RuntimeAuthoring, overlay: UI5Element): Promise<DeferredXmlFragmentData> {
    const deferred = createDeferred<DeferredXmlFragmentData>();

    await DialogFactory.createDialog(overlay, rta, DialogNames.ADD_FRAGMENT, { deferred });

    return deferred.promise;
}