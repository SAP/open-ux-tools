import LrepConnector from 'sap/ui/fl/LrepConnector';
import FakeLrepConnector from 'sap/ui/fl/FakeLrepConnector';
import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';

interface FlexChange {
    [key: string]: string | object | undefined;
    support: {
        generator?: string;
    };
}

interface FetchedChanges {
    [key: string]: FlexChange;
}

interface LoadChangesResult {
    changes: {
        loadModules: boolean;
        changes: FlexChange[];
        settings: {
            [key: string]: string | boolean | undefined;
        };
    };
    componentClassName: string;
    etag: string;
    loadModules: boolean;
    messagebundle: string | undefined;
}

const path = '/preview/api/changes';

/**
 * Retrieves Flex settings from a 'sap-ui-bootstrap' element's data attribute.
 * Parses the 'data-open-ux-preview-flex-settings' attribute as JSON.
 *
 * @returns {FlexSettings | undefined} The parsed Flex settings if available, otherwise undefined.
 */
function getFlexSettings(): FlexSettings | undefined {
    let result;
    const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
    const flexSetting = bootstrapConfig?.getAttribute('data-open-ux-preview-flex-settings');
    if (flexSetting) {
        result = JSON.parse(flexSetting);
    }
    return result;
}

/**
 * Processes an array of FlexChange objects.
 * It updates each change object with settings and sends them to a API endpoint.
 *
 * @param {FlexChange[]} changeArr - Array of FlexChange objects to be processed.
 * @returns {Promise<void>} A promise that resolves when all changes are processed.
 */
export async function create(changeArr: FlexChange[]): Promise<void> {
    const settings = getFlexSettings();
    await Promise.all(
        changeArr.map(async (change) => {
            if (settings) {
                change.support ??= {};
                change.support.generator = settings.generator;
            }

            await fetch(path, {
                method: 'POST',
                body: JSON.stringify(change, null, 2),
                headers: {
                    'content-type': 'application/json'
                }
            });
        })
    );
}

/**
 * Loads changes from a given path and processes them using an LrepConnector instance.
 * The changes are then formatted and returned in a specified structure.
 *
 * @returns {Promise<LoadChangesResult>} A promise that resolves to an object of type LoadChangesResult.
 */
export async function loadChanges(...args: []): Promise<LoadChangesResult> {
    const lrep = new LrepConnector();

    const response = await fetch(path, {
        method: 'GET',
        headers: {
            'content-type': 'application/json'
        }
    });
    const changes = (await response.json()) as FetchedChanges;

    return LrepConnector.prototype.loadChanges.apply(lrep, args).then((res: LoadChangesResult) => {
        const arr: FlexChange[] = [];
        Object.entries(changes).forEach(([_, val]) => {
            arr.push(val);
        });
        res.changes.changes = arr;
        return res;
    });
}

/**
 * Configures and enables the FakeLrepConnector based on the SAP UI5 version.
 * If the minor version of the SAP UI5 is less than 72, this function extends
 * the FakeLrepConnector's prototype with specific methods and enables the fake connector.
 *
 * Assumes the existence of a global 'sap' object with a 'ui.version' property,
 * and global jQuery object with 'extend' method.
 *
 * @returns {void}
 */
export default function (): void {
    jQuery.extend(FakeLrepConnector.prototype, {
        create,
        loadChanges,
        loadSettings: () => Promise.resolve()
    });

    FakeLrepConnector.enableFakeConnector();
}
