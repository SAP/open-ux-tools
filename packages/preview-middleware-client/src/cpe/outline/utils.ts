import { buildControlData } from '../control-data';
import { getRuntimeControl } from '../utils';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { getComponent } from '../ui5-utils';
import Component from 'sap/ui/core/Component';
import { Manifest } from 'sap/ui/rta/RuntimeAuthoring';

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

/**
 * Function that checks if control is reuse component
 *
 * @param controlId id control
 * @param minorUI5Version minor UI5 version
 * @returns boolean if control is from reused component view
 */
export const isReuseComponent = (controlId: string, minorUI5Version: number): boolean => {
    if(minorUI5Version <= 114) {
        return false;
    }

    const component = Component.getComponentById(controlId);
    if (!component) {
        return false;
    }

    const manifest = component.getManifest() as Manifest;
    if(!manifest) {
        return false;
    }

    return manifest['sap.app']?.type === 'component';
};
