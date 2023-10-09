import type { IconDetails } from '@sap-ux-private/control-property-editor-common';
import Component from 'sap/ui/core/Component';
import type { ID } from 'sap/ui/core/library';
import IconPool from 'sap/ui/core/IconPool';

/**
 * Gets Component by id.
 *
 * @param id - unique identifier for control
 * @returns Component | undefined
 */
export function getComponent<T extends Component>(id: ID): T | undefined {
    if (Component?.get) {
        return Component.get(id) as T;
    } else {
        // Older version must be still supported until maintenance period.
        return sap.ui.getCore().getComponent(id) as T; // NOSONAR
    }
}

/**
 * Get ui5 icons.
 *
 * @returns IconDetails[]
 */
export function getIcons(): IconDetails[] {
    return IconPool.getIconNames('undefined')
        .map((icon: string) => {
            const iconInfo = IconPool.getIconInfo(icon) as IconDetails;
            return {
                name: icon.toLowerCase(),
                content: iconInfo.content,
                fontFamily: iconInfo.fontFamily
            } as IconDetails;
        })
        .sort((item1: IconDetails, item2: IconDetails) => {
            if (item1.name < item2.name) {
                return -1;
            }
            if (item1.name > item2.name) {
                return 1;
            }
            return 0;
        });
}
