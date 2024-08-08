import Log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type RTAOutlineService from 'sap/ui/rta/command/OutlineService';

import type { ExternalAction } from '@sap-ux-private/control-property-editor-common';
import { outlineChanged, SCENARIO, showMessage } from '@sap-ux-private/control-property-editor-common';

import { getError } from '../error-utils';
// import type { QuickActionService } from '../quick-actions/quick-action-service';
import { ControlTreeIndex } from '../types';
import { transformNodes } from './nodes';

export const OUTLINE_CHANGE_EVENT = 'OUTLINE_CHANGED';

export interface OutlineChangedEventDetail {
    controlIndex: ControlTreeIndex;
}
/**
 * A Class of WorkspaceConnectorService
 */
export class OutlineService extends EventTarget {
    constructor(private rta: RuntimeAuthoring) {
        super();
    }

    /**
     * Initializes connector service.
     *
     * @param sendAction action sender function
     */
    public async init(sendAction: (action: ExternalAction) => void): Promise<void> {
        const outline = await this.rta.getService<RTAOutlineService>('outline');
        const scenario = this.rta.getFlexSettings().scenario;
        let hasSentWarning = false;
        const reuseComponentsIds = new Set<string>();
        const syncOutline = async () => {
            try {
                const viewNodes = await outline.get();
                const controlIndex: ControlTreeIndex = {};
                const outlineNodes = await transformNodes(viewNodes, scenario, reuseComponentsIds, controlIndex);

                const event = new CustomEvent(OUTLINE_CHANGE_EVENT, {
                    detail: {
                        controlIndex
                    }
                });

                this.dispatchEvent(event);
                sendAction(outlineChanged(outlineNodes));
                if (reuseComponentsIds.size > 0 && scenario === SCENARIO.AdaptationProject && !hasSentWarning) {
                    sendAction(
                        showMessage({
                            message:
                                'Have in mind that reuse components are detected for some views in this application and controller extensions and adding fragments are not supported for such views. Controller extension and adding fragment functionality on these views will be disabled.',
                            shouldHideIframe: false
                        })
                    );
                    hasSentWarning = true;
                }
            } catch (error) {
                Log.error('Outline sync failed!', getError(error));
            }
        };
        await syncOutline();
        outline.attachEvent('update', syncOutline);
    }

    public onOutlineChange(handler: (event: CustomEvent<OutlineChangedEventDetail>) => void | Promise<void>): void {
        this.addEventListener(OUTLINE_CHANGE_EVENT, handler as EventListener);
    }
}
