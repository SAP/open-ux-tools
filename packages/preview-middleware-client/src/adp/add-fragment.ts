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

export default class AddFragmentService {
    /**
     * Initializes communication with CPE, and the add fragment plugin.
     *
     * @param rta Runtime Authoring
     */
    public static init(rta: RuntimeAuthoring): void {
        const flexSettings = rta.getFlexSettings();
        const commandFactory = new CommandFactory({
            flexSettings
        });

        const plugin = new AddXMLPlugin({
            commandFactory,
            fragmentHandler: async (overlay: UI5Element) => await AddFragmentService.fragmentHandler(rta, overlay)
        });

        const defaultPlugins = rta.getPlugins();
        defaultPlugins.addXMLPlugin = plugin;
        rta.setPlugins(defaultPlugins);
    }

    /**
     * Handler function for AddXMLAtExtensionPoint plugin.
     *
     * @param rta Runtime Authoring
     * @param overlay UI5 Element overlay
     * @returns Deferred extension point data that is provided to the plugin
     */
    public static async fragmentHandler(rta: RuntimeAuthoring, overlay: UI5Element): Promise<DeferredXmlFragmentData> {
        const deferred = createDeferred<DeferredXmlFragmentData>();

        await DialogFactory.createDialog(overlay, rta, DialogNames.ADD_FRAGMENT, { deferred });

        return deferred.promise;
    }
}