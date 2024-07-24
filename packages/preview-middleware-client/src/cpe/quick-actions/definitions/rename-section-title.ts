import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import Component from 'sap/ui/core/Component';
import { ActivationContext, BaseContext, ExecutionContext, QuickActionDefinition } from './quick-action-definition';
import { OutlineNode } from '@sap-ux-private/control-property-editor-common';
import { getFEAppPagesMap } from '../../rta-service';

export const RENAME_SECTION_TITLE = 'rename-section-title';
const ACTION_ID = 'CTX_RENAME';

const PARENT_CONTROL_TYPE_NAMES = ['sap.uxap.ObjectPageLayout'];

export const RENAME_SECTION: QuickActionDefinition = {
    type: RENAME_SECTION_TITLE,
    title: 'Rename Section',
    isActive: async (context: ActivationContext): Promise<boolean> => {
        const control = getControl(context);
        let sectionWithRenameAction = false;
        if (control) {
            // look for anchorbar first, as section title is same as anchorbar
            const sectionTabs = control.children.filter((child) => child.controlType === 'sap.uxap.AnchorBar')[0];
            if (sectionTabs.children.length > 1) {
                sectionWithRenameAction = sectionTabs.children.some(
                    async (sectionTabs) =>
                        ((await (context.actionService as any).get(sectionTabs.controlId)) || []).filter(
                            (action: { id: string }) => action?.id === ACTION_ID
                        ).length
                );
            }
            // if no tabs exists, edit directly section header
            if (!sectionTabs.children.length) {
                const section = control.children.filter((child) => child.controlType === 'sap.uxap.ObjectPageSection');
                sectionWithRenameAction = section.some(
                    async (opSection) =>
                        ((await (context.actionService as any).get(opSection.controlId)) || []).filter(
                            (action: { id: string }) => action?.id === ACTION_ID
                        ).length
                );
            }
            if (sectionWithRenameAction && (context.rta as any).getMode() === 'adaptation') {
                return true;
            }
        }
        return false;
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
            await (context.actionService as any).execute(toBeRenameControl.controlId, ACTION_ID);
        }
    },
    children: (context: BaseContext, index = 0): string[] => {
        const children = new Array<string>();
        const control = getControl(context);
        if (control) {
            const sectionTabs = control.children.filter((child) => child.controlType === 'sap.uxap.AnchorBar')[0];
            if (sectionTabs.children.length > 1) {
                children.push(...sectionTabs.children.map((tabs) => `'${tabs.name}' Section`));
            }

            const sections = control.children.filter((child) => child.controlType === 'sap.uxap.ObjectPageSection');
            if (sectionTabs.children.length === 0) {
                children.push(...sections.map((section) => `'${section.name}' Section`));
            }
        }
        return children;
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
