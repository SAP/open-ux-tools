export { GUIDED_ANSWERS_ICON } from './guided-answers-icon_svg_base64';

/**
 * Mapping of human readable help topic to implementation specific ids
 * Help items are nodes under a root tree item. A node may have n additional nodes.
 *
 */
export const HELP_TREE = {
    FIORI_TOOLS: 3046
};

/**
 * Individual help topics which are mapped to node ids
 */
export const HELP_NODES = {
    FIORI_TOOLS: 45995, // The root of all Fiori Tools help
    DEV_PLATFORM: 45996, // Environment specific selection, vscode or BAS
    FIORI_APP_GENERATOR: 48363, // Fiori application generator
    BAS_CATALOG_SERVICES_REQUEST_FAILED: 48366, // BAS specific catalog service request failure
    APPLICATION_PREVIEW: 52881, // App preview failure
    CERTIFICATE_ERROR: 53643,
    DESTINATION_MISCONFIGURED: 54336, // Missing additional property
    DESTINATION_UNAVAILABLE: 51208, // Launchpad service is not subscribed to
    DESTINATION_NOT_FOUND: 51208, // Destination URL is returning an empty response
    BAD_GATEWAY: 48366, // Bad gateway 502
    DESTINATION_BAD_GATEWAY_503: 52526, // Destination Service Unavailable 503
    NO_V4_SERVICES: 57573, // No V4 OData services available
    NO_ADT_SERVICE_AUTH: 57266, //Users does not have authorizations to use ADT services
    DESTINATION_CONNECTION_ERRORS: 48366, // Non specific destination connection error help page, currently this is mapped to the same node as BAS_CATALOG_SERVICES_REQUEST_FAILED which will be updated in the future (and the entry here removed)
    UI_SERVICE_GENERATOR: 63068 // UI Service generator
};

export const GUIDED_ANSWERS_EXTENSION_ID = 'saposs.sap-guided-answers-extension';
export const GUIDED_ANSWERS_LAUNCH_CMD_ID = 'sap.ux.guidedAnswer.openGuidedAnswer';

const GUIDED_ANSWERS_SUPPORT_BASE_URL = 'https://ga.support.sap.com/dtp/viewer/index.html';

/**
 * Creates a help url for the specified tree and node ids. If node ids are not specified the root tree path
 * will be returned, which may not be a valid help page.
 *
 * @param treeId - the tree id
 * @param nodeIds - the node ids
 * @returns - the help url
 */
export function getHelpUrl(treeId: number, nodeIds: number[]): string {
    let actions = '';
    if (nodeIds.length > 0) {
        actions = `/actions/${nodeIds.join(':')}`;
    }
    return `${GUIDED_ANSWERS_SUPPORT_BASE_URL}#/tree/${treeId}${actions}`;
}
