import { buildControlData } from '../control-data';
import { getRuntimeControl } from '../utils';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { getComponent } from '../../utils/core';

export const isEditable = (id = ''): boolean => {
    let editable = false;
    const control = sap.ui.getCore().byId(id);
    if (!control) {
        const component = getComponent(id);
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
