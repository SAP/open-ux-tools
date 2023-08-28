import type { ExternalAction } from '@sap-ux/control-property-editor-common';
import { startPostMessageCommunication, iconsLoaded } from '@sap-ux/control-property-editor-common';

import type { ActionHandler, Service, UI5AdaptationOptions } from './types';
import { initOutline } from './outline/index';
import { createUi5Facade } from './facade';
import { SelectionService } from './selection';
import { ChangeService } from './changes/service';
import { loadDefaultLibraries } from './documentation';

/**
 * Main function, register handlers for events and messages.
 *
 * @param options - UI5 adaptation options
 */
export async function init(options: UI5AdaptationOptions): Promise<void> {
    console.log(`Initializing Control Property Editor`);

    const { rta } = options;
    const ui5 = createUi5Facade();
    const actionHandlers: ActionHandler[] = [];
    /**
     *
     * @param handler action handler
     */
    function subscribe(handler: ActionHandler): void {
        actionHandlers.push(handler);
    }

    const selectionService = new SelectionService(rta, ui5);
    const changesService = new ChangeService(options, ui5, selectionService);
    const services: Service[] = [selectionService, changesService];
    try {
        loadDefaultLibraries();
        const { sendAction } = startPostMessageCommunication<ExternalAction>(
            window.parent,
            async function onAction(action) {
                for (const handler of actionHandlers) {
                    try {
                        await handler(action);
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
        );

        for (const service of services) {
            service.init(sendAction, subscribe);
        }
        initOutline(rta, sendAction).catch((error) => {
            console.error(`Error during initialization of Control Property Editor Outline`, error);
        });
        const icons = ui5.getIcons();
        sendAction(iconsLoaded(icons));
    } catch (error) {
        console.error(`Error during initialization of Control Property Editor`, error);
    }
}
