import { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';

export interface FlexChange {
    [key: string]: string | object | undefined;
    changeType: string;
    fileName: string;
    support: {
        generator?: string;
    };
}

export const CHANGES_API_PATH = '/preview/api/changes';

/**
 * Retrieves Flex settings from a 'sap-ui-bootstrap' element's data attribute.
 * Parses the 'data-open-ux-preview-flex-settings' attribute as JSON.
 *
 * @returns {FlexSettings | undefined} The parsed Flex settings if available, otherwise undefined.
 */
export function getFlexSettings(): FlexSettings | undefined {
    let result: FlexSettings | undefined;
    const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
    const flexSetting = bootstrapConfig?.getAttribute('data-open-ux-preview-flex-settings');
    if (flexSetting) {
        result = JSON.parse(flexSetting) as FlexSettings;
    }
    return result;
}
