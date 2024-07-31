import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import Component from 'sap/ui/core/Component';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { NESTED_QUICK_ACTION_KIND, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import { NestedQuickActionChild, OutlineNode } from '@sap-ux-private/control-property-editor-common';

import { getFEAppPagesMap } from '../../../rta-service';

import { QuickActionContext, NestedQuickActionDefinition } from '../quick-action-definition';


export const RENAME_SECTION_TITLE_TYPE = 'rename-section-title';
const ACTION_ID = 'CTX_RENAME';
// Eg: adp.fe no ObjectPageDynamicHeaderTitle
// fe.v2.lrop.customer ObjectPageDynamicHeaderTitle exists
const PARENT_CONTROL_TYPE_NAMES = ['sap.uxap.ObjectPageLayout'];

export class RenameSectionQuickAction implements NestedQuickActionDefinition {
    readonly kind = NESTED_QUICK_ACTION_KIND;
    readonly type = RENAME_SECTION_TITLE_TYPE;
    isActive = false;
    isClearButtonEnabled = false;
    children: NestedQuickActionChild[] = [];
    sectionMap: Record<string, number> = {};
    constructor(private context: QuickActionContext) {}

    async initialize() {
        // const result: QuickActionActivationData = { isActive: false, title: 'Rename Section', children: [] };
        if ((this.context.rta as any).getMode() !== 'adaptation') {
            this.isActive = false;
            return;
        }
        const control = getControl(this.context);

        if (control) {
            // look for anchor bar first, as section title is same as anchor bar
            const sectionTabs = control.children.filter((child) => child.controlType === 'sap.uxap.AnchorBar')[0];
            if (sectionTabs.children.length > 1) {
                const sectionTabsActionsPromises = sectionTabs.children.map((child) =>
                    this.context.actionService?.get(child.controlId)
                );
                const sectionTabsActions = await Promise.all(sectionTabsActionsPromises);

                for (let index = 0; index < sectionTabsActions.length; index++) {
                    const actions = sectionTabsActions[index];
                    const renameAction = actions.find((action) => action.id === ACTION_ID);
                    if (renameAction) {
                        this.children.push({
                            label: `'${sectionTabs.children[index].name}' Section`,
                            children: []
                        });
                        this.sectionMap[`${this.children.length - 1}`] = index;
                    }
                }
            }
            // if no tabs exists, edit directly section header
            else {
                const sections = control.children.filter((child) => child.controlType === 'sap.uxap.ObjectPageSection');
                const sectionsActionsPromises = sections.map((section) =>
                    this.context.actionService.get(section.controlId)
                );
                const sectionsActions = await Promise.all(sectionsActionsPromises);
                for (let index = 0; index < sectionsActions.length; index++) {
                    const actions = sectionsActions[index];
                    const renameAction = actions.find((action) => action.id === ACTION_ID);
                    if (renameAction) {
                        this.children.push({
                            label: `'${sections[index].name}' Section`,
                            children: []
                        });
                        this.sectionMap[`${this.children.length - 1}`] = index;
                    }
                }
            }
            if (this.children.length > 0) {
                this.isActive = true;
            }
        }
    }

    getActionObject(): NestedQuickAction {
        return {
            kind: NESTED_QUICK_ACTION_KIND,
            type: this.type,
            enabled: this.isActive,
            // TODO: translate this?
            title: 'Rename Section',
            children: this.children
        };
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const control = getControl(this.context);
        const index = this.sectionMap[path];
        if (control && index !== undefined) {
            // control is sap.uxap.ObjectPageLayout, expects only one tab per OP
            const sections = control.children.filter((child) => child.controlType === 'sap.uxap.AnchorBar')[0];
            let toBeRenameControl = sections.children?.[index];

            if (!toBeRenameControl) {
                // if no anchorbar, means only one section exists on OP
                toBeRenameControl = control.children.filter(
                    (child) => child.controlType === 'sap.uxap.ObjectPageSection'
                )[index];
            }
            const section = sap.ui.getCore().byId(toBeRenameControl.controlId);
            const controlOverlay = OverlayUtil.getClosestOverlayFor(section);
            if (controlOverlay) {
                controlOverlay.setSelected(true);
            }
            await this.context.actionService.execute(toBeRenameControl.controlId, ACTION_ID);
        }
        return [];
    }
}

function getControl(context: QuickActionContext): OutlineNode | undefined {
    const controlTypeName = PARENT_CONTROL_TYPE_NAMES.find((type) => context.controlIndex[type]);
    if (controlTypeName) {
        const controls = context.controlIndex[controlTypeName];
        const pages = getFEAppPagesMap(context.rta);
        // sap.ui.gen
        const objectPageComponentName = `${Object.keys(pages).find((key) => key.split('.').pop() === 'ObjectPage')}`;
        if (objectPageComponentName) {
            const op = pages[objectPageComponentName].find((item) => !item.isInvisible);
            const opComponent = op?.page.getContent()[0].getComponentInstance().getId();
            return controls.find((ctrl) => {
                const opLayout = sap.ui.getCore().byId(ctrl.controlId);
                if (opLayout) {
                    const result = opComponent === Component.getOwnerIdFor(opLayout);
                    return result;
                }
                return false;
            });
        }
    }
    return undefined;
}
