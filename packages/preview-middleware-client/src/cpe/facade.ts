import type { IconDetails } from '@sap-ux/control-property-editor-common';
import type { UI5Facade } from './types';
import Component from 'sap/ui/core/Component';
import type Element from 'sap/ui/core/Element';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type { ID } from 'sap/ui/core/library';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import IconPool from 'sap/ui/core/IconPool';

/**
 * A facade for UI5 framework methods.
 *
 * @returns UI5Facade
 */
export function createUi5Facade(): UI5Facade {
    return {
        getControlById,
        getIcons,
        getComponent,
        getOverlay,
        getClosestOverlayFor
    };
}
/**
 * Gets control by id.
 *
 * @param id unique identifier for control
 * @returns Element | undefined
 */
function getControlById<T extends Element>(id: ID): T | undefined {
    return sap.ui.getCore().byId(id) as T;
}

/**
 * Gets Component by id.
 *
 * @param id - unique identifier for control
 * @returns Component | undefined
 */
function getComponent<T extends Component>(id: ID): T | undefined {
    if (Component?.get) {
        return Component.get(id) as T;
    } else {
        // Older version must be still supported until maintenance period.
        return sap.ui.getCore().getComponent(id) as T; // NOSONAR
    }
}

/**
 * Gets overlay for control.
 *
 * @param control ui5 control
 * @returns ElementOverlay | undefined
 */
function getOverlay<T extends ElementOverlay>(control: Element): T | undefined {
    return OverlayRegistry.getOverlay(control) as T;
}

/**
 * Gets ClosestOverlay for control.
 *
 * @param control ui5 control
 * @returns ElementOverlay | undefined
 */
function getClosestOverlayFor<T extends ElementOverlay>(control: Element): T | undefined {
    return OverlayUtil.getClosestOverlayFor(control) as T;
}

/**
 * Get ui5 icons.
 *
 * @returns IconDetails[]
 */
function getIcons(): IconDetails[] {
    return IconPool.getIconNames('undefined')
        .map((icon: any) => {
            const iconInfo = IconPool.getIconInfo(icon) as IconDetails;
            return {
                name: icon.toLowerCase(),
                content: iconInfo.content,
                fontFamily: iconInfo.fontFamily
            } as IconDetails;
        })
        .sort((item1: any, item2: any) => {
            if (item1.name < item2.name) {
                return -1;
            }
            if (item1.name > item2.name) {
                return 1;
            }
            return 0;
        });
}
