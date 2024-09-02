import { buildControlData } from '../control-data';
import { getRuntimeControl } from '../utils';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { getComponent } from '../ui5-utils';
import Component from 'sap/ui/core/Component';
import { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import { isLowerThanMinimalUi5Version, Ui5VersionInfo } from '../../utils/version';

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
 * @param ui5VersionInfo UI5 version information
 * @returns boolean if control is from reused component view
 */
export const isReuseComponent = (controlId: string, ui5VersionInfo: Ui5VersionInfo): boolean => {
    if (isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 115 })) {
        return false;
    }

    const component = Component.getComponentById(controlId);
    if (!component) {
        return false;
    }

    const manifest = component.getManifest() as Manifest;
    if (!manifest) {
        return false;
    }

    return manifest['sap.app']?.type === 'component';
};
