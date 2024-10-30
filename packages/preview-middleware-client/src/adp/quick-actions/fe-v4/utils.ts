import type ManagedObject from 'sap/ui/base/ManagedObject';
import Component from 'sap/ui/core/Component';
import type TemplateComponent from 'sap/fe/core/TemplateComponent';

import { isA } from '../../../utils/core';

/**
 * Get the containing page name of a control.
 *
 * @param control - UI5 control instance.
 * @returns Page name to which the control belongs.
 */
export function getPageName(control: ManagedObject): string | undefined {
    const component = Component.getOwnerComponentFor(control);
    if (!isA<TemplateComponent>('sap.fe.core.TemplateComponent', component)) {
        return undefined;
    }
    const view = component.getRootControl();
    return view.getId().split('::').pop();
}
