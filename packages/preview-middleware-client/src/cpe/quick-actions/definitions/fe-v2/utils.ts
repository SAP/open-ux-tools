import UI5Element from 'sap/ui/core/Element';

import { type FEAppPageInfo, getFEAppPagesMap, isPageContainsControlById } from '../../../rta-service';
import { QuickActionContext } from '../quick-action-definition';

export function getCurrentActivePage(context: QuickActionContext): FEAppPageInfo[] {
    const pages = getFEAppPagesMap(context.rta);
    const collectActivePages = [];
    for (const page of Object.keys(pages)) {
        const currentPage = pages[page];
        collectActivePages.push(...currentPage.filter((page) => !page.isInvisible));
    }
    return collectActivePages;
}

export function getRelevantControlFromActivePage(
    context: QuickActionContext,
    activePage: FEAppPageInfo,
    controlTypes: string[]
): UI5Element[] {
    const relavantControls: UI5Element[] = [];
    for (const type of controlTypes) {
        const controls = context.controlIndex[type] || [];
        for (const control of controls) {
            const isActionApplicable = isPageContainsControlById(activePage.page, control.controlId);
            const UI5ControlData = sap.ui.getCore().byId(control.controlId);
            if (isActionApplicable && UI5ControlData) {
                relavantControls.push(UI5ControlData);
            }
        }
    }
    return relavantControls;
}
