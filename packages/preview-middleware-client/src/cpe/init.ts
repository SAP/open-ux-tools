import type { ExternalAction } from '@sap-ux-private/control-property-editor-common';
import { startPostMessageCommunication, iconsLoaded } from '@sap-ux-private/control-property-editor-common';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import type { ActionHandler, Service } from './types';
import { initOutline } from './outline/index';
import { createUi5Facade } from './facade';
import { SelectionService } from './selection';
import { ChangeService } from './changes/service';
import { loadDefaultLibraries } from './documentation';
import Log from 'sap/base/Log';

export default async function init(rta: RuntimeAuthoring): Promise<void> {
    Log.info('Initializing Control Property Editor');

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
    const { layer } = rta.getFlexSettings();
    const manifest = rta.getRootControlInstance().getManifest();

    const changesService = new ChangeService(
        { rta, generator: 'replace-this-generator', layer, componentId: manifest['sap.app'].id },
        ui5,
        selectionService
    );
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
                        Log.error('Handler Failed: ', error);
                    }
                }
            }
        );

        for (const service of services) {
            service.init(sendAction, subscribe);
        }
        await initOutline(rta, ui5, sendAction);
        const icons = ui5.getIcons();
        sendAction(iconsLoaded(icons));
    } catch (error) {
        Log.error('Error during initialization of Control Property Editor', error);
    }
}
