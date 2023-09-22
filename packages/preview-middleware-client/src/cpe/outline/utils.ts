import { buildControlData } from '../control-data';
import { getRuntimeControl } from '../utils';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import type { UI5Facade } from '../types';

export const isEditable = (ui5: UI5Facade, id = ''): boolean => {
    let editable = false;
    const control = ui5.getControlById(id);
    if (!control) {
        const component = ui5.getComponent(id);
        if (component) {
            return editable;
        }
    } else {
        let controlOverlay = OverlayRegistry.getOverlay(control);
        if (!controlOverlay?.getDomRef()) {
            //look for closest control
            controlOverlay = OverlayUtil.getClosestOverlayFor(control);
        }
        if (controlOverlay) {
            const runtimeControl = getRuntimeControl(controlOverlay);
            const controlData = buildControlData(runtimeControl, controlOverlay);
            const prop = controlData.properties.find((item) => item.isEnabled === true);
            editable = prop !== undefined;
        }
    }
    return editable;
};
