import type { IconDetails } from '@sap-ux-private/control-property-editor-common';
import IconPool from 'sap/ui/core/IconPool';

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
