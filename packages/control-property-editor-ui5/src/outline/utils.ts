import { buildControlData } from '../controlData';
import { getRuntimeControl } from '../utils';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import type { UI5Facade } from 'src/types';

export const isEditable = async (id = '', ui5: UI5Facade): Promise<boolean> => {
    let editable = false;
    const control = ui5.getControlById(id);
    if (!control) {
        const component = ui5.getComponent(id);
        if (component) {
            editable = false;
        }
    } else {
        let controlOverlay = OverlayRegistry.getOverlay(control);
        if (!controlOverlay?.getDomRef()) {
            //look for closest control
            controlOverlay = OverlayUtil.getClosestOverlayFor(control);
        }
        if (controlOverlay) {
            const runtimeControl = getRuntimeControl(controlOverlay);
            const controlData = await buildControlData(runtimeControl, controlOverlay, false);
            const prop = controlData.properties.find((item) => item.isEnabled === true);
            editable = prop !== undefined;
        }
    }
    return editable;
};
