import type View from 'sap/ui/core/mvc/View';
import type UI5Element from 'sap/ui/core/Element';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import AddXMLAtExtensionPoint from 'sap/ui/rta/plugin/AddXMLAtExtensionPoint';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';

import { ExternalAction, addExtensionPoint } from '@sap-ux-private/control-property-editor-common';

import { SubscribeFunction } from '../cpe/types';
import { DialogNames, handler } from './init-dialogs';

interface Deferred<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
}

type ActionService = {
    execute: (controlId: string, actionId: string) => void;
};

type DeferredExtPointData = {
    fragmentPath: string;
    extensionPointName: string | undefined;
};

export interface ExtensionPointData {
    name: string;
    deffered: Deferred<DeferredExtPointData>;
    index?: number;
    view?: View;
    createdControls?: [];
    fragmentId?: string | undefined;
    aggregation?: string[];
    aggregationName?: string;
    defaultContent?: string[];
    targetControl?: UI5Element;
}

/**
 * Defers the resolution of the promise, stores resolve/reject functions so that they can be accessed at a later stage.
 *
 * @description A Deferred object contains an unresolved promise along with the functions to resolve or reject that promise.
 *
 * @returns {Deferred} Deferred object
 */
export function createDeferred<T>(): Deferred<T> {
    let resolve: Deferred<T>['resolve'];
    let reject: Deferred<T>['reject'];
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
}

export default class ExtensionPointService {
    private readonly actionId = 'CTX_ADDXML_AT_EXTENSIONPOINT';

    /**
     * @param rta Runtime Authoring
     */
    constructor(private readonly rta: RuntimeAuthoring) {}

    /**
     * Initializes communication with CPE, and the extension point plugin.
     *
     * @param subscribe Handles actions from CPE
     */
    public init(subscribe: SubscribeFunction) {
        this.initPlugin();
        subscribe(async (action: ExternalAction): Promise<void> => {
            if (addExtensionPoint.match(action)) {
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

        const plugin = new AddXMLAtExtensionPoint({
            commandFactory,
            fragmentHandler: async (overlay: UI5Element, info: ExtensionPointData[]) =>
                await this.fragmentHandler(overlay, info[0])
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
     * @returns Deffered extension point data that is provided to the plugin
     */
    public async fragmentHandler(overlay: UI5Element, info: ExtensionPointData): Promise<DeferredExtPointData> {
        let deffered: Deferred<DeferredExtPointData> = createDeferred();

        await handler(overlay, this.rta, DialogNames.ADD_FRAGMENT_AT_EXTENSION_POINT, {
            name: info.name,
            deffered
        } as ExtensionPointData);

        return deffered.promise;
    }
}
