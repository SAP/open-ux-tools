import type { IconDetails } from '../../api';
import type { UI5Facade } from './types';

/**
 * A facade for UI5 framework methods.
 *
 * @returns {UI5Facade}
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
 * @param id
 * @returns {T | undefined}
 */
function getControlById<T extends sap.ui.core.Element>(id: sap.ui.core.ID): T | undefined {
    return sap.ui.getCore().byId(id) as T;
}

/**
 * Gets Component by id.
 *
 * @param id
 * @returns {T | undefined}
 */
function getComponent<T extends sap.ui.core.Component>(id: sap.ui.core.ID): T | undefined {
    return sap.ui.getCore().getComponent(id) as T;
}

/**
 * Gets overlay for control.
 *
 * @param control
 * @returns {T | undefined}
 */
function getOverlay<T extends sap.ui.dt.ElementOverlay>(control: sap.ui.core.Element): T | undefined {
    return sap.ui.dt.OverlayRegistry.getOverlay(control) as T;
}

/**
 * Gets ClosestOverlay For control.
 *
 * @param control
 * @returns { T | undefined }
 */
function getClosestOverlayFor<T extends sap.ui.dt.ElementOverlay>(control: sap.ui.core.Element): T | undefined {
    return sap.ui.dt.OverlayUtil.getClosestOverlayFor(control) as T;
}

/**
 * Get ui5 icons.
 *
 * @returns {IconDetails[]}
 */
function getIcons(): IconDetails[] {
    return sap.ui.core.IconPool.getIconNames('undefined')
        .map((icon: any) => {
            const iconInfo = sap.ui.core.IconPool.getIconInfo(icon) as IconDetails;
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
