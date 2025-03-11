import Log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type RTAOutlineService from 'sap/ui/rta/command/OutlineService';

import type { ExternalAction } from '@sap-ux-private/control-property-editor-common';
import {
    outlineChanged,
    SCENARIO,
    showInfoCenterMessage,
    MessageBarType
} from '@sap-ux-private/control-property-editor-common';

import { getError } from '../../utils/error';
import { getTextBundle } from '../../i18n';
import { ControlTreeIndex } from '../types';
import { transformNodes } from './nodes';
import { ChangeService } from '../changes';
import XMLView from 'sap/ui/core/mvc/XMLView';
import { isHigherThanMinimalUi5Version, Ui5VersionInfo, getUi5Version } from '../../utils/version';
import { getComponent } from '../../utils/core';
import FlUtils from 'sap/ui/fl/Utils';
import IsReuseComponentApi from 'sap/ui/rta/util/isReuseComponent';
import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';

export const OUTLINE_CHANGE_EVENT = 'OUTLINE_CHANGED';

export interface OutlineChangedEventDetail {
    controlIndex: ControlTreeIndex;
}
/**
 * A Class of WorkspaceConnectorService
 */
export class OutlineService extends EventTarget {
    private reuseComponentsIds = new Set<string>();
    public isReuseComponent: (controlId: string) => boolean;
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
        const { scenario, isCloud } = this.rta.getFlexSettings();
        const resourceBundle = await getTextBundle();
        const titleKey = 'ADP_REUSE_COMPONENTS_MESSAGE_TITLE';
        const descriptionKey = 'ADP_REUSE_COMPONENTS_MESSAGE_DESCRIPTION';
        const title = resourceBundle.getText(titleKey);
        const description = resourceBundle.getText(descriptionKey);
        let hasSentWarning = false;
        const ui5VersionInfo = await getUi5Version();
        await this.initIsReuseComponentChecker(ui5VersionInfo);
        this.reuseComponentsIds = new Set<string>();
        const syncOutline = async () => {
            try {
                const viewNodes = await outline.get();
                const controlIndex: ControlTreeIndex = {};
                const configPropertyIdMap = new Map<string, string[]>();
                const outlineNodes = await transformNodes(
                    viewNodes,
                    scenario,
                    this.reuseComponentsIds,
                    controlIndex,
                    this.changeService,
                    configPropertyIdMap,
                    this
                );

                const event = new CustomEvent(OUTLINE_CHANGE_EVENT, {
                    detail: {
                        controlIndex
                    }
                });

                this.dispatchEvent(event);
                sendAction(outlineChanged(outlineNodes));
                if (
                    this.reuseComponentsIds.size > 0 &&
                    scenario === SCENARIO.AdaptationProject &&
                    !hasSentWarning /*&& isCloud*/
                ) {
                    sendAction(
                        showInfoCenterMessage({
                            type: MessageBarType.warning,
                            title: title,
                            description: description
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

    public hasReuseComponents(view: XMLView): boolean {
        return [...this.reuseComponentsIds].some((id) => view.byId(id));
    }

    private async initIsReuseComponentChecker(ui5VersionInfo: Ui5VersionInfo): Promise<void> {
        let reuseComponentApi: IsReuseComponentApi;
        if (isHigherThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 134 })) {
            reuseComponentApi = (await import('sap/ui/rta/util/isReuseComponent')).default;
        }

        this.isReuseComponent = function isReuseComponent(controlId: string): boolean {
            const component = getComponent(controlId);
            if (reuseComponentApi) {
                return reuseComponentApi.isReuseComponent(component);
            }

            if (!component) {
                return false;
            }

            const appComponent = FlUtils.getAppComponentForControl(component);
            if (!appComponent) {
                return false;
            }

            const manifest = component.getManifest() as Manifest;
            const appManifest = appComponent.getManifest() as Manifest;
            const componentName = manifest?.['sap.app']?.id;

            // Look for component name in component usages of app component manifest
            const componentUsages = appManifest?.['sap.ui5']?.componentUsages;
            return Object.values(componentUsages || {}).some((componentUsage) => {
                return componentUsage.name === componentName;
            });
        };
    }
}
