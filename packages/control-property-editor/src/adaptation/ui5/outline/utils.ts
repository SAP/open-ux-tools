import { buildControlData } from '../controlData';
import { getRuntimeControl } from '../utils';

export const isEditable = async (id = ''): Promise<boolean> => {
    let editable = false;
    const control = sap.ui.getCore().byId(id);
    if (!control) {
        const component = sap.ui.getCore().getComponent(id);
        if (component) {
            editable = false;
        }
    } else {
        let controlOverlay = sap.ui.dt.OverlayRegistry.getOverlay(control);
        if (!controlOverlay || !controlOverlay.getDomRef()) {
            //look for closest control
            controlOverlay = sap.ui.dt.OverlayUtil.getClosestOverlayFor(control);
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
