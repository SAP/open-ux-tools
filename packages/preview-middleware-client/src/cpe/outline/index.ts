import type { ExternalAction } from '@sap-ux/control-property-editor-common';
import { outlineChanged } from '@sap-ux/control-property-editor-common';

import { transformNodes } from './nodes';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type OutlineService from 'sap/ui/rta/command/OutlineService';
import type { UI5Facade } from '../types';

/**
 *
 * @param rta runtimeAuthoring object.
 * @param ui5 - facade for ui5 framework methods
 * @param sendAction send action method.
 */
export async function initOutline(
    rta: RuntimeAuthoring,
    ui5: UI5Facade,
    sendAction: (action: ExternalAction) => void
): Promise<void> {
    const outline = await rta.getService<OutlineService>('outline');
    function syncOutline() {
        outline
            .get()
            .then((views) => {
                return transformNodes(views, ui5, (id: string): { text?: string } => {
                    const control = ui5.getControlById(id);
                    if (control?.getMetadata().getProperty('text')) {
                        const text = control.getProperty('text');
                        if (typeof text === 'string' && text.trim() !== '') {
                            return {
                                text
                            };
                        }
                    }
                    return {};
                });
            })
            .then((nodes) => {
                sendAction(outlineChanged(nodes));
            })
            .catch((error) => console.error(error));
    }
    outline.attachEvent('update', syncOutline);
}
