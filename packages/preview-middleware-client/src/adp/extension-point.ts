import type View from 'sap/ui/core/mvc/View';
import type UI5Element from 'sap/ui/core/Element';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { ExternalAction, addExtensionPoint } from '@sap-ux-private/control-property-editor-common';

import { SubscribeFunction } from '../cpe/types';
import { DialogNames, handler } from './init-dialogs';

export interface ExtensionPointData {
    index: number;
    name: string;
    view?: View;
    createdControls: [];
    fragmentId?: string | undefined;
    aggregation: string[];
    aggregationName: string;
    deffered: Deferred<any>;
    defaultContent: string[];
    targetControl: UI5Element;
}

interface Deferred<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
}

function createDeferred<T>(): Deferred<T> {
    let resolve: Deferred<T>['resolve'];
    let reject: Deferred<T>['reject'];
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
}

type ActionService = {
    execute: (controlId: string, actionId: string) => void;
};

export default class ExtensionPointService {
    private readonly actionId = 'CTX_ADDXML_AT_EXTENSIONPOINT';

    constructor(private readonly rta: RuntimeAuthoring) {}

    public init(subscribe: SubscribeFunction) {
        this.initAddXMLAtExtensionPointPlugin();
        subscribe(async (action: ExternalAction): Promise<void> => {
            if (addExtensionPoint.match(action)) {
                try {
                    const { controlId } = action.payload;

                    const service = await this.rta.getService<ActionService>('action');

                    service.execute(controlId, this.actionId);
                } catch (e) {}
            }
        });
    }

    public initAddXMLAtExtensionPointPlugin() {
        // @ts-ignore
        jQuery.sap.require('sap.ui.rta.plugin.AddXMLAtExtensionPoint');
        // @ts-ignore
        const commandFactory = new sap.ui.rta.command.CommandFactory({
            flexSettings: this.rta.getFlexSettings()
        });

        // @ts-ignore
        const addXMLAtExtensionPointPlugin = new sap.ui.rta.plugin.AddXMLAtExtensionPoint({
            commandFactory,
            fragmentHandler: async (overlay: UI5Element, info: ExtensionPointData[]) => {
                let deffered: Deferred<any> = createDeferred(); // Create a new Deferred object
                await handler(overlay, this.rta, DialogNames.ADD_FRAGMENT_AT_EXTENSION_POINT, {
                    name: info[0]?.name,
                    defaultContent: info[0]?.defaultContent,
                    deffered
                } as ExtensionPointData);
                return deffered.promise;
            }
        });

        const defaultPlugins = this.rta.getDefaultPlugins();
        defaultPlugins['addXMLAtExtensionPoint'] = addXMLAtExtensionPointPlugin;
        this.rta.setPlugins(defaultPlugins);
    }
}
