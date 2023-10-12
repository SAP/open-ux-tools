import type { ExternalAction } from '@sap-ux-private/control-property-editor-common';
import { outlineChanged } from '@sap-ux-private/control-property-editor-common';

import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type OutlineService from 'sap/ui/rta/command/OutlineService';

import { transformNodes } from './nodes';
import Log from 'sap/base/Log';

/**
 *
 * @param rta runtimeAuthoring object.
 * @param sendAction send action method.
 */
export async function initOutline(rta: RuntimeAuthoring, sendAction: (action: ExternalAction) => void): Promise<void> {
    const outline = await rta.getService<OutlineService>('outline');
    async function syncOutline() {
        try {
            const viewNodes = await outline.get();
            const outlineNodes = await transformNodes(viewNodes);

            sendAction(outlineChanged(outlineNodes));
        } catch (error) {
            Log.error('Outline sync failed!', error);
        }
    }
    outline.attachEvent('update', syncOutline);
}
