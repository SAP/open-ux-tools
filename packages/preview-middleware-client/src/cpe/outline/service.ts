import Log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type RTAOutlineService from 'sap/ui/rta/command/OutlineService';

import type { ExternalAction } from '@sap-ux-private/control-property-editor-common';
import { outlineChanged, SCENARIO, showMessage } from '@sap-ux-private/control-property-editor-common';

import { getError } from '../../utils/error';
import { getTextBundle } from '../../i18n';
import { ControlTreeIndex } from '../types';
import { transformNodes } from './nodes';
import { ChangeService } from '../changes';

export const OUTLINE_CHANGE_EVENT = 'OUTLINE_CHANGED';

export interface OutlineChangedEventDetail {
    controlIndex: ControlTreeIndex;
}
/**
 * A Class of WorkspaceConnectorService
 */
export class OutlineService extends EventTarget {
    constructor(private readonly rta: RuntimeAuthoring, private readonly changeService: ChangeService) {
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
        const resourceBundle = await getTextBundle();
        const key = 'ADP_REUSE_COMPONENTS_MESSAGE';
        const message = resourceBundle.getText(key) ?? key;
        let hasSentWarning = false;
        const reuseComponentsIds = new Set<string>();
        const syncOutline = async () => {
            try {
                const viewNodes = await outline.get();
                const controlIndex: ControlTreeIndex = {};
                const configPropertyIdMap = new Map<string, string[]>();
                const outlineNodes = await transformNodes(
                    viewNodes,
                    scenario,
                    reuseComponentsIds,
                    controlIndex,
                    this.changeService,
                    configPropertyIdMap
                );

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
                            message,
                            shouldHideIframe: false
                        })
                    );
                    hasSentWarning = true;
                }
                await this.changeService.updateConfigurationProps(configPropertyIdMap);
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
