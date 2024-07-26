import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import Component from 'sap/ui/core/Component';
import {
    ActivationContext,
    BaseContext,
    ExecutionContext,
    QuickActionActivationData,
    QuickActionDefinition
} from './quick-action-definition';
import { OutlineNode } from '@sap-ux-private/control-property-editor-common';
import { getFEAppPagesMap } from '../../rta-service';

export const RENAME_SECTION_TITLE_TYPE = 'rename-section-title';
const ACTION_ID = 'CTX_RENAME';
// Eg: adp.fe no ObjectPageDynamicHeaderTitle
// fe.v2.lrop.customer ObjectPageDynamicHeaderTitle exists
const PARENT_CONTROL_TYPE_NAMES = ['sap.uxap.ObjectPageLayout'];

export const RENAME_SECTION: QuickActionDefinition<undefined> = {
    type: RENAME_SECTION_TITLE_TYPE,
    getActivationData: async (context: ActivationContext): Promise<QuickActionActivationData> => {
        const result: QuickActionActivationData = { isActive: false, title: 'Rename Section', children: [] };
        if ((context.rta as any).getMode() !== 'adaptation') {
            return result;
        }
        const control = getControl(context);

        if (control) {
            // look for anchor bar first, as section title is same as anchorbar
            const sectionTabs = control.children.filter((child) => child.controlType === 'sap.uxap.AnchorBar')[0];
            if (sectionTabs.children.length > 1) {
                const sectionTabsActionsPromises = sectionTabs.children.map((child) =>
                    context.actionService?.get(child.controlId)
                );
                const sectionTabsActions = await Promise.all(sectionTabsActionsPromises);

                sectionTabsActions.forEach((actions, idx) => {
                    const renameActionAvailable = !!actions?.some((action) => action.id === ACTION_ID);
                    if (renameActionAvailable) {
                        result.children!.push(`'${sectionTabs.children[idx].name}' Section`);
                    }
                });
            }
            // if no tabs exists, edit directly section header
            else {
                const sections = control.children.filter((child) => child.controlType === 'sap.uxap.ObjectPageSection');
                const sectionsActionsPromises = sections.map((section) =>
                    context.actionService?.get(section.controlId)
                );
                const sectionsActions = await Promise.all(sectionsActionsPromises);
                sectionsActions.forEach((actions, idx) => {
                    const renameActionAvailable = !!actions?.some((action) => action.id === ACTION_ID);
                    if (renameActionAvailable) {
                        result.children!.push(`'${sections[idx].name}' Section`);
                    }
                });
            }
            result.isActive = result.children!.length > 0;
            if (result.children!.length < 2) {
                // for a single section no need to show action submenu
                delete result.children;
            }
        }
        return result;
    },
    execute: async (context: ExecutionContext, index = 0): Promise<void> => {
        const control = getControl(context);
        if (control) {
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
            await context.actionService?.execute(toBeRenameControl.controlId, ACTION_ID);
        }
    }
};

function getControl(context: BaseContext): OutlineNode | undefined {
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
