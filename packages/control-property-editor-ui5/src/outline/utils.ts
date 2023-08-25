import { buildControlData } from '../controlData';
import { getRuntimeControl } from '../utils';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

export const isEditable = async (id = ''): Promise<boolean> => {
    let editable = false;
    const control = sap.ui.getCore().byId(id);
    if (!control) {
        const component = sap.ui.getCore().getComponent(id);
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
