import type { ExternalAction } from '@sap-ux-private/control-property-editor-common';
import { outlineChanged, showMessage } from '@sap-ux-private/control-property-editor-common';

import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type OutlineService from 'sap/ui/rta/command/OutlineService';

import { transformNodes } from './nodes';
import Log from 'sap/base/Log';
import { getError } from '../error-utils';

/**
 *
 * @param rta runtimeAuthoring object.
 * @param sendAction send action method.
 */
export async function initOutline(rta: RuntimeAuthoring, sendAction: (action: ExternalAction) => void): Promise<void> {
    const outline = await rta.getService<OutlineService>('outline');
    const scenario = rta.getFlexSettings().scenario;
    let hasSentWarning = false;
    const reuseComponentsIds = new Set<string>();
    async function syncOutline() {
        try {
            const viewNodes = await outline.get();
            const outlineNodes = await transformNodes(viewNodes, scenario, reuseComponentsIds);
            sendAction(outlineChanged(outlineNodes));
            if(reuseComponentsIds.size > 0 && scenario === 'ADAPTATION_PROJECT' && !hasSentWarning) {
                sendAction(showMessage({ message: 'Have in mind that reuse components are detected for some views in this application and controller extensions and adding fragments are not supported for such views. Controller extension and adding fragment functionality on these views will be disabled.', shouldHideIframe: false}));
                hasSentWarning = true;
            } 
           
        } catch (error) {
            Log.error('Outline sync failed!', getError(error));
        }
    }
    await syncOutline();
    outline.attachEvent('update', syncOutline);
}
