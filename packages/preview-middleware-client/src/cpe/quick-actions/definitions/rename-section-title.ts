import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import Component from 'sap/ui/core/Component';
import { ActivationContext, BaseContext, ExecutionContext, QuickActionDefinition } from './quick-action-definition';
import { ExternalAction, OutlineNode, outlineScrollUpdated } from '@sap-ux-private/control-property-editor-common';
import { getFEAppPagesMap } from '../../rta-service';

export const RENAME_SECTION_TITLE = 'rename-section-title';
const ACTION_ID = 'CTX_RENAME';
// Eg: adp.fe no ObjectPageDynamicHeaderTitle
// fe.v2.lrop.customer ObjectPageDynamicHeaderTitle exists
const CONTROL_TYPES = ['sap.uxap.ObjectPageLayout'];

export const RENAME_SECTION: QuickActionDefinition = {
    type: RENAME_SECTION_TITLE,
    title: 'Rename Section',
    isActive: async (context: ActivationContext): Promise<boolean> => {
        const control = getControl(context);
        let sectionWithRenameAction = false;
        if (control) {
            const sections = control.children.filter((child) => child.controlType === 'sap.uxap.AnchorBar')[0];
            if (sections.children.length > 1) {
                sectionWithRenameAction = sections.children.some(
                    async (section) =>
                        ((await (context.actionService as any).get(section.controlId)) || []).filter(
                            (action: { id: string }) => action?.id === ACTION_ID
                        ).length
                );
            }
            if (!sections.children.length) {
                const section = control.children.filter(
                    (child) => child.controlType === 'sap.uxap.ObjectPageSection'
                )[0];
                sectionWithRenameAction = ((await (context.actionService as any).get(section.controlId)) || []).filter(
                    (action: { id: string }) => action?.id === ACTION_ID
                ).length;
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
            const sections = control.children.filter((child) => child.controlType === 'sap.uxap.AnchorBar')[0];
            let toBeRenameControl = sections.children[index];
            if (!toBeRenameControl) {
                toBeRenameControl = control.children.filter(
                    (child) => child.controlType === 'sap.uxap.ObjectPageSection'
                )[0];
            }
            const section = sap.ui.getCore().byId(toBeRenameControl.controlId);
            const controlOverlay = OverlayUtil.getClosestOverlayFor(section);
            if (controlOverlay) {
                controlOverlay.setSelected(true);
            }
            // can we wait here?
            const handlers = context.onQuickActionExecution();
            const actionHandler = async (action: ExternalAction): Promise<void> => {
                setTimeout(() => {
                    handlers.unSubscribe(actionHandler);
                }, 500);
                if (outlineScrollUpdated.match(action)) {
                    await (context.actionService as any).execute(toBeRenameControl.controlId, ACTION_ID);
                }
            };
            handlers.subscribe(actionHandler);
        }
    },
    children: (context: BaseContext, index = 0): string[] => {
        const children = new Array<string>();
        const control = getControl(context);
        if (control) {
            const sections = control.children.filter((child) => child.controlType === 'sap.uxap.AnchorBar')[0];
            if (sections.children.length > 1) {
                children.push(...sections.children.map((section) => `'${section.name}' Section`));
            }
        }
        return children;
    }
};

function getControl(context: BaseContext): OutlineNode | undefined {
    const controlName = CONTROL_TYPES.find((type) => context.controlIndex[type]);
    if (controlName) {
        const controls = context.controlIndex[controlName];
        const pages = getFEAppPagesMap(context.rta);
        // sap.ui.gen
        const objectPageCompoentName = `${Object.keys(pages).find((key) => key.split('.').pop() === 'ObjectPage')}`;
        if (objectPageCompoentName) {
            const op = pages[objectPageCompoentName].find((item) => !item.isInvisible);
            const component = op?.page.getContent()[0].getComponentInstance().getId();
            return controls.find((ctrl) => {
                const opLayout = sap.ui.getCore().byId(ctrl.controlId);
                if (opLayout) {
                    const result = component === Component.getOwnerIdFor(opLayout);
                    if (result) {
                        // need to select OP layout first to initiate outline scrolling when section is selected
                        const controlOverlay = OverlayUtil.getClosestOverlayFor(opLayout);
                        if (controlOverlay) {
                            controlOverlay.setSelected(true);
                        }
                    }
                    return result;
                }
                return false;
            });
        }
    }
    return undefined;
}
