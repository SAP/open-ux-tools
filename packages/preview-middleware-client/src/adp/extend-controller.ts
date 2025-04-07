import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type UI5Element from 'sap/ui/core/Element';
import { CommunicationService } from '../cpe/communication-service';
import { ExternalAction, extendController } from '@sap-ux-private/control-property-editor-common';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { Deferred, createDeferred } from './utils';
import { DialogFactory, DialogNames } from './dialog-factory';
import ExtendController from 'sap/ui/rta/plugin/ExtendControllerPlugin';

type ActionService = {
    execute: (controlId: string, actionId: string) => void;
};

export interface ExtenControllerData {
    deferred: Deferred<DeferredExtendControllerData>;
}

export type DeferredExtendControllerData = {
    codeRef: string;
    viewId: string;
};

export default class ExtendControllerService {
    private readonly actionId = 'CTX_EXTEND_CONTROLLER';

    /**
     * @param rta Runtime Authoring
     */
    constructor(private readonly rta: RuntimeAuthoring) {}

    /**
     * Initializes communication with CPE, and the add fragment plugin.
     *
     */
    public init() {
        this.initPlugin();
        CommunicationService.subscribe(async (action: ExternalAction): Promise<void> => {
            if (extendController.match(action)) {
                try {
                    const { controlId } = action.payload;
                    const service = await this.rta.getService<ActionService>('action');
                    service.execute(controlId, this.actionId);
                } catch (e) {
                    throw new Error(`Failed to execute service with actionId: ${this.actionId}`);
                }
            }
        });
    }

    /**
     * Initializes Add XML at Extension Point plugin and adds it to the default RTA plugins.
     */
    public initPlugin() {
        const flexSettings = this.rta.getFlexSettings();
        const commandFactory = new CommandFactory({
            flexSettings
        });

        const plugin = new ExtendController({
            commandFactory,
            handlerFunction: async (overlay: UI5Element) => await this.handlerFunction(overlay)
        });

        const plugins = this.rta.getPlugins();
        plugins.extendControllerPlugin = plugin;
        this.rta.setPlugins(plugins);
    }

    /**
     * Handler function for AddXMLAtExtensionPoint plugin.
     *
     * @param overlay UI5 Element overlay
     * @param excludedAgregation Aggregation that should be excluded from the fragment
     * @returns Deferred extension point data that is provided to the plugin
     */
    public async handlerFunction(overlay: UI5Element): Promise<DeferredExtendControllerData> {
        let deferred = createDeferred<DeferredExtendControllerData>();

        await DialogFactory.createDialog(overlay, this.rta, DialogNames.CONTROLLER_EXTENSION, { deferred });

        return deferred.promise;
    }
}
