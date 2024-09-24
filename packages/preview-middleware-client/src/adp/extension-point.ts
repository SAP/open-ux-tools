import type View from 'sap/ui/core/mvc/View';
import type UI5Element from 'sap/ui/core/Element';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import AddXMLAtExtensionPoint from 'sap/ui/rta/plugin/AddXMLAtExtensionPoint';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';

import { ExternalAction, addExtensionPoint } from '@sap-ux-private/control-property-editor-common';

import { Deferred, createDeferred } from './utils';

import { CommunicationService } from '../cpe/communication-service';
import { DialogNames, handler } from './init-dialogs';

type ActionService = {
    execute: (controlId: string, actionId: string) => void;
};

type DeferredExtPointData = {
    fragmentPath: string;
    extensionPointName: string | undefined;
};

export interface ExtensionPointInfo {
    name: string;
    index?: number;
    view?: View;
    createdControls: string[];
    fragmentId?: string;
    aggregation?: string[];
    aggregationName?: string;
    defaultContent: UI5Element[];
    targetControl?: UI5Element;
}

export interface ExtensionPointData {
    name: string;
    deferred: Deferred<DeferredExtPointData>;
    info: ExtensionPointInfo[];
}

export default class ExtensionPointService {
    private readonly actionId = 'CTX_ADDXML_AT_EXTENSIONPOINT';
    private selectedExtensionPointName: string;

    /**
     * @param rta Runtime Authoring
     */
    constructor(private readonly rta: RuntimeAuthoring) {}

    /**
     * Initializes communication with CPE, and the extension point plugin.
     *
     */
    public init() {
        this.initPlugin();
        CommunicationService.subscribe(async (action: ExternalAction): Promise<void> => {
            if (addExtensionPoint.match(action)) {
                try {
                    const { controlId, name } = action.payload;

                    const service = await this.rta.getService<ActionService>('action');

                    service.execute(controlId, this.actionId);
                    this.selectedExtensionPointName = name;
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

        const plugin = new AddXMLAtExtensionPoint({
            commandFactory,
            fragmentHandler: async (overlay: UI5Element, info: ExtensionPointInfo[]) =>
                await this.fragmentHandler(overlay, info)
        });

        const defaultPlugins = this.rta.getDefaultPlugins();
        defaultPlugins.addXMLAtExtensionPoint = plugin;
        this.rta.setPlugins(defaultPlugins);
    }

    /**
     * Handler function for AddXMLAtExtensionPoint plugin.
     *
     * @param overlay UI5 Element overlay
     * @param info Extension point data from the plugin
     * @returns Deferred extension point data that is provided to the plugin
     */
    public async fragmentHandler(overlay: UI5Element, info: ExtensionPointInfo[]): Promise<DeferredExtPointData> {
        let deferred = createDeferred<DeferredExtPointData>();
        const name = this.selectedExtensionPointName;

        await handler(overlay, this.rta, DialogNames.ADD_FRAGMENT_AT_EXTENSION_POINT, {
            name,
            info,
            deferred
        });

        this.selectedExtensionPointName = '';
        return deferred.promise;
    }
}
