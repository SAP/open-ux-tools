import type { ExternalAction } from '../../../api';
import { outlineChanged } from '../../../api';

import { transformNodes } from './nodes';
import type OutlineService from 'sap/ui/rta/command/OutlineService';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/**
 *
 * @param rta
 * @param sendAction
 */
export async function initOutline(rta: RuntimeAuthoring, sendAction: (action: ExternalAction) => void): Promise<void> {
    const outline = await rta.getService<OutlineService>('outline');
    async function syncOutline() {
        const views = await outline.get();
        const nodes = await transformNodes(views, (id: string): { text?: string } => {
            const control = sap['ui'].getCore().byId(id);
            if (control && control.getMetadata().getProperty('text')) {
                const text = control.getProperty('text');
                if (typeof text === 'string' && text.trim() !== '') {
                    return {
                        text
                    };
                }
                return {};
            }
            return {};
        });
        sendAction(outlineChanged(nodes));
    }
    outline.attachEvent('update', syncOutline);
}
