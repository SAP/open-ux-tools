import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type UI5Element from 'sap/ui/core/Element';
import { CommunicationService } from '../cpe/communication-service';
import { ExternalAction, addFragment } from '@sap-ux-private/control-property-editor-common';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { Deferred, createDeferred } from './utils';
import { DialogFactory, DialogNames } from './dialog-factory';
import AddXMLPlugin from 'sap/ui/rta/plugin/AddXMLPlugin';

type ActionService = {
    execute: (controlId: string, actionId: string) => void;
};

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
    private readonly actionId = 'CTX_ADDXML';

    /**
     * @param rta Runtime Authoring
     */
    constructor(private readonly rta: RuntimeAuthoring) {}

    /**
     * Initializes communication with CPE, and the add fragment plugin.
     *
     */
    public init() {
        const flexSettings = this.rta.getFlexSettings();
        const commandFactory = new CommandFactory({
            flexSettings
        });

        const plugin = new AddXMLPlugin({
            commandFactory,
            fragmentHandler: async (overlay: UI5Element) => await this.fragmentHandler(overlay)
        });

        const defaultPlugins = this.rta.getPlugins();
        defaultPlugins.addXMLPlugin = plugin;
        this.rta.setPlugins(defaultPlugins);
    }

    /**
     * Handler function for AddXMLAtExtensionPoint plugin.
     *
     * @param overlay UI5 Element overlay
     * @param excludedAgregation Aggregation that should be excluded from the fragment
     * @returns Deferred extension point data that is provided to the plugin
     */
    public async fragmentHandler(overlay: UI5Element): Promise<DeferredXmlFragmentData> {
        let deferred = createDeferred<DeferredXmlFragmentData>();

        await DialogFactory.createDialog(overlay, this.rta, DialogNames.ADD_FRAGMENT, { deferred });

        return deferred.promise;
    }
}
